package com.nomina.numa.service;

import com.nomina.numa.dto.NominaLiquidacionResponse;
import com.nomina.numa.model.mongo.Novedad;
import com.nomina.numa.model.mongo.PeriodoNomina;
import com.nomina.numa.model.postgres.Empleado;
import com.nomina.numa.repository.jpa.EmpleadoRepository;
import com.nomina.numa.repository.mongo.NovedadRepository;
import com.nomina.numa.repository.mongo.PeriodoNominaRepository;
import com.nomina.numa.util.EstadoNominaCompat;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class NominaLiquidacionService {
    @Value("${nomina.salario-minimo-2026:1750905}")
    private long salarioMinimo = 1_750_905;
    @Value("${nomina.auxilio-transporte-2026:249095}")
    private long auxilioTransporte = 249_095;
    @Value("${nomina.exoneracion-114-1:true}")
    private boolean exoneracion1141 = true;
    @Value("${nomina.jornada-semanal-2026:42}")
    private int jornadaSemanal = 42;

    private final PeriodoNominaRepository periodoRepo;
    private final EmpleadoRepository empleadoRepo;
    private final NovedadRepository novedadRepo;

    public NominaLiquidacionResponse calcular(String periodoId) {
        PeriodoNomina periodo = periodoRepo.findById(periodoId)
                .orElseThrow(() -> new IllegalArgumentException("Período no encontrado"));

        List<Empleado> activos = empleadoRepo.findAll().stream()
                .filter(e -> EstadoNominaCompat.esEmpleadoActivo(e.getEstado()))
                .toList();
        if (activos.stream().anyMatch(e -> e.getId() == null || e.getSalarioBase() == null
                || e.getSalarioBase() <= 0)) {
            throw new IllegalStateException("Hay empleados activos sin identificación o salario base válido");
        }
        List<Empleado> sinArl = activos.stream()
                .filter(e -> e.getTasaArl() == null || e.getTasaArl() <= 0 || e.getTasaArl() > 100)
                .toList();
        if (!sinArl.isEmpty()) {
            throw new IllegalStateException("Falta una tasa ARL válida (porcentaje) para empleados activos: "
                    + sinArl.stream().map(Empleado::getId).toList());
        }
        List<Empleado> bajoMinimo = activos.stream()
                .filter(e -> e.getSalarioBase() < salarioMinimo)
                .toList();
        if (!bajoMinimo.isEmpty()) {
            throw new IllegalStateException("Hay empleados activos con salario mensual inferior al salario mínimo "
                    + "configurado de " + salarioMinimo + ": "
                    + bajoMinimo.stream().map(Empleado::getId).toList());
        }

        List<Empleado> empleados = activos.stream()
                .sorted(Comparator.comparing(Empleado::getId))
                .toList();

        List<Novedad> novedades = buscarNovedadesDelPeriodo(periodo);
        validarLimitesHorasExtras(novedades, buscarNovedadesSemana(periodo, novedades));
        Map<Long, List<Novedad>> novedadesPorEmpleado = agruparNovedades(novedades, empleados);

        List<NominaLiquidacionResponse.EmpleadoLiquidacion> liquidaciones = empleados.stream()
                .map(empleado -> calcularEmpleado(empleado,
                        novedadesPorEmpleado.getOrDefault(empleado.getId(), List.of())))
                .toList();

        return NominaLiquidacionResponse.builder()
                .periodoId(periodoId)
                .estadoPeriodo(periodo.getEstado())
                .empleados(liquidaciones)
                .totalDevengado(liquidaciones.stream().mapToLong(e -> e.getSueldoBase() + e.getDevengos()).sum())
                .totalDeducciones(liquidaciones.stream().mapToLong(
                        NominaLiquidacionResponse.EmpleadoLiquidacion::getDeducciones).sum())
                .totalPagar(liquidaciones.stream().mapToLong(
                        NominaLiquidacionResponse.EmpleadoLiquidacion::getTotalPagar).sum())
                .totalAportesEmpleador(liquidaciones.stream().mapToLong(
                        NominaLiquidacionResponse.EmpleadoLiquidacion::getAportesEmpleador).sum())
                .totalProvisionesPrestacionales(liquidaciones.stream().mapToLong(
                        NominaLiquidacionResponse.EmpleadoLiquidacion::getProvisionesPrestacionales).sum())
                .costoTotalEmpleador(liquidaciones.stream().mapToLong(
                        NominaLiquidacionResponse.EmpleadoLiquidacion::getCostoTotalEmpleador).sum())
                .build();
    }

    private List<Novedad> buscarNovedadesDelPeriodo(PeriodoNomina periodo) {
        LinkedHashMap<String, Novedad> novedadesPorId = new LinkedHashMap<>();
        for (Novedad novedad : novedadRepo.findByPeriodoIdAndEstadoIgnoreCase(periodo.getId(), "APROBADA")) {
            if (novedad.getFechaInicio() == null || fechaDentroDelPeriodo(novedad, periodo)) {
                novedadesPorId.put(novedad.getId(), novedad);
            }
        }

        if (periodo.getFechaInicio() != null && periodo.getFechaFin() != null) {
            List<Novedad> porFecha = novedadRepo.findByEstadoIgnoreCaseAndFechaInicioBetween(
                    "APROBADA", periodo.getFechaInicio(), periodo.getFechaFin().plusDays(1));
            for (Novedad novedad : porFecha) {
                if (novedad.getId() != null && fechaDentroDelPeriodo(novedad, periodo)) {
                    novedadesPorId.put(novedad.getId(), novedad);
                }
            }
        }
        return List.copyOf(novedadesPorId.values());
    }

    private boolean fechaDentroDelPeriodo(Novedad novedad, PeriodoNomina periodo) {
        return periodo.getFechaInicio() != null && periodo.getFechaFin() != null
                && !novedad.getFechaInicio().isBefore(periodo.getFechaInicio())
                && !novedad.getFechaInicio().isAfter(periodo.getFechaFin());
    }

    private List<Novedad> buscarNovedadesSemana(PeriodoNomina periodo, List<Novedad> delPeriodo) {
        if (periodo.getFechaInicio() == null || periodo.getFechaFin() == null) {
            return delPeriodo;
        }
        LocalDate desde = periodo.getFechaInicio().minusDays(6);
        LocalDate hasta = periodo.getFechaFin().plusDays(6);
        LinkedHashMap<String, Novedad> porId = new LinkedHashMap<>();
        int sinId = 0;
        for (Novedad novedad : delPeriodo) {
            String key = novedad.getId() == null ? "periodo-sin-id-" + sinId++ : novedad.getId();
            porId.put(key, novedad);
        }
        for (Novedad novedad : novedadRepo.findByEstadoIgnoreCaseAndFechaInicioBetween(
                "APROBADA", desde, hasta)) {
            String key = novedad.getId() == null ? "semana-sin-id-" + sinId++ : novedad.getId();
            porId.putIfAbsent(key, novedad);
        }
        return List.copyOf(porId.values());
    }

    private Map<Long, List<Novedad>> agruparNovedades(List<Novedad> novedades, List<Empleado> empleados) {
        Map<Long, List<Novedad>> porId = new HashMap<>();
        Map<String, Long> idPorCedula = new HashMap<>();
        Set<Long> idsActivos = new HashSet<>();
        for (Empleado empleado : empleados) {
            idsActivos.add(empleado.getId());
            if (empleado.getNumeroDocumento() != null && !empleado.getNumeroDocumento().isBlank()) {
                idPorCedula.put(empleado.getNumeroDocumento().trim(), empleado.getId());
            }
        }

        for (Novedad novedad : novedades) {
            Long empleadoId = novedad.getIdEmpleado();
            if ((empleadoId == null || !idsActivos.contains(empleadoId)) && novedad.getCedula() != null) {
                empleadoId = idPorCedula.get(novedad.getCedula().trim());
            }
            if (empleadoId != null) {
                porId.computeIfAbsent(empleadoId, ignored -> new ArrayList<>()).add(novedad);
            }
        }
        return porId;
    }

    private NominaLiquidacionResponse.EmpleadoLiquidacion calcularEmpleado(
            Empleado empleado, List<Novedad> novedades) {
        long salarioMensual = Math.round(empleado.getSalarioBase());
        long sueldoBase = Math.round(salarioMensual / 2.0);
        double salarioDiario = sueldoBase / 30.0;
        double salarioHora = salarioMensual * 6.0 / (jornadaSemanal * 30.0);
        List<NominaLiquidacionResponse.ConceptoLiquidado> devengos = new ArrayList<>();
        List<NominaLiquidacionResponse.ConceptoLiquidado> deducciones = new ArrayList<>();

        boolean tieneAuxilioTransporte = novedades.stream()
                .anyMatch(n -> "AUXILIO_TRANSPORTE".equalsIgnoreCase(n.getTipoNovedad()));
        boolean presencial = empleado.getModalidadTrabajo() == null
                || "PRESENCIAL".equalsIgnoreCase(empleado.getModalidadTrabajo());
        boolean transporteSuministrado = Boolean.TRUE.equals(empleado.getTransporteSuministrado());
        if (!tieneAuxilioTransporte && presencial && !transporteSuministrado
                && salarioMensual <= salarioMinimo * 2) {
            agregar(devengos, "AUXILIO_TRANSPORTE", "Auxilio de transporte",
                    Math.round(auxilioTransporte / 2.0));
        }

        for (Novedad novedad : novedades) {
            aplicarNovedad(novedad, sueldoBase, salarioDiario, salarioHora, devengos, deducciones,
                    presencial && !transporteSuministrado && salarioMensual <= salarioMinimo * 2);
        }

        long totalDevengos = devengos.stream().mapToLong(
                NominaLiquidacionResponse.ConceptoLiquidado::getValor).sum();
        long totalDeducciones = deducciones.stream().mapToLong(
                NominaLiquidacionResponse.ConceptoLiquidado::getValor).sum();
        long baseAportes = sueldoBase + devengos.stream()
                .filter(concepto -> !concepto.getTipo().equals("AUXILIO_TRANSPORTE"))
                .mapToLong(NominaLiquidacionResponse.ConceptoLiquidado::getValor).sum();
        long saludTrabajador = Math.round(baseAportes * 0.04);
        long pensionTrabajador = Math.round(baseAportes * 0.04);
        agregar(deducciones, "SALUD", "Salud trabajador (4 %)", saludTrabajador);
        agregar(deducciones, "PENSION", "Pensión trabajador (4 %)", pensionTrabajador);
        totalDeducciones += saludTrabajador + pensionTrabajador;

        long basePrestaciones = sueldoBase + devengos.stream()
                .filter(concepto -> concepto.getTipo().equals("AUXILIO_TRANSPORTE")
                        || !Set.of("PRESTAMO", "EMBARGO", "EMBARGO JUDICIAL", "DEDUCCION",
                                "INCAPACIDAD", "PERMISO_NO_REMUNERADO", "PERMISO").contains(concepto.getTipo()))
                .mapToLong(NominaLiquidacionResponse.ConceptoLiquidado::getValor).sum();
        long prima = Math.round(basePrestaciones / 12.0);
        long cesantias = Math.round(basePrestaciones / 12.0);
        long interesesCesantias = Math.round(cesantias * 0.01);
        long vacaciones = Math.round((sueldoBase + devengos.stream()
                .filter(concepto -> !concepto.getTipo().equals("AUXILIO_TRANSPORTE"))
                .mapToLong(NominaLiquidacionResponse.ConceptoLiquidado::getValor).sum()) / 24.0);
        long provisiones = prima + cesantias + interesesCesantias + vacaciones;

        boolean exonerado = exoneracion1141 && salarioMensual < salarioMinimo * 10;
        List<NominaLiquidacionResponse.ConceptoLiquidado> aportes = new ArrayList<>();
        agregar(aportes, "PENSION_EMPLEADOR", "Pensión empleador (12 %)", baseAportes * 0.12);
        agregar(aportes, "CAJA_COMPENSACION", "Caja de compensación (4 %)", baseAportes * 0.04);
        agregar(aportes, "ARL", "ARL (" + empleado.getTasaArl() + " %)",
                baseAportes * empleado.getTasaArl() / 100.0);
        if (!exonerado) {
            agregar(aportes, "SALUD_EMPLEADOR", "Salud empleador (8,5 %)", baseAportes * 0.085);
            agregar(aportes, "SENA", "SENA (2 %)", baseAportes * 0.02);
            agregar(aportes, "ICBF", "ICBF (3 %)", baseAportes * 0.03);
        }
        long aportesEmpleador = aportes.stream().mapToLong(
                NominaLiquidacionResponse.ConceptoLiquidado::getValor).sum();
        long costoEmpleador = sueldoBase + totalDevengos + aportesEmpleador + provisiones;
        return NominaLiquidacionResponse.EmpleadoLiquidacion.builder()
                .id(empleado.getId())
                .nombre(empleado.getNombre())
                .apellido(empleado.getApellido())
                .sueldoBase(sueldoBase)
                .devengos(totalDevengos)
                .deducciones(totalDeducciones)
                .totalPagar(sueldoBase + totalDevengos - totalDeducciones)
                .aportesEmpleador(aportesEmpleador)
                .provisionesPrestacionales(provisiones)
                .costoTotalEmpleador(costoEmpleador)
                .detalleAportesEmpleador(aportes)
                .detalleDevengos(devengos)
                .detalleDeducciones(deducciones)
                .build();
    }

    private void aplicarNovedad(
            Novedad novedad,
            long sueldoBase,
            double salarioDiario,
            double salarioHora,
            List<NominaLiquidacionResponse.ConceptoLiquidado> devengos,
            List<NominaLiquidacionResponse.ConceptoLiquidado> deducciones,
            boolean auxilioElegible) {
        String tipo = novedad.getTipoNovedad() == null
                ? "" : novedad.getTipoNovedad().trim().toUpperCase(Locale.ROOT);
        double valor = valorNovedad(novedad);

        switch (tipo) {
            case "HORAS_EXTRAS", "HORAS_EXTRA" -> agregar(devengos, "HORAS_EXTRAS", nombreConcepto(novedad, "Horas extras"),
                    calcularHorasExtras(novedad, salarioHora));
            case "BONIFICACION", "BONO", "COMISION", "VIATICOS", "PRIMA" ->
                    agregar(devengos, tipo, nombreConcepto(novedad, tipo), valor);
            case "RECARGO_NOCTURNO" -> agregar(devengos, tipo, nombreConcepto(novedad, tipo),
                    valor > 0 ? valor : (novedad.getHoras() == null ? 0
                            : novedad.getHoras() * salarioHora * 0.35));
            case "AUXILIO_TRANSPORTE" -> {
                if (auxilioElegible) {
                    agregar(devengos, tipo, nombreConcepto(novedad, "Auxilio de transporte"),
                            valor > 0 ? valor : Math.round(auxilioTransporte / 2.0));
                }
            }
            case "PRESTAMO", "EMBARGO", "EMBARGO JUDICIAL", "DEDUCCION" ->
                    agregar(deducciones, tipo, nombreConcepto(novedad, tipo), valor);
            case "INCAPACIDAD" -> {
                double importe = valor > 0 ? valor
                        : dias(novedad.getFechaInicio(), novedad.getFechaFin()) * salarioDiario * 0.6667;
                agregar(deducciones, tipo, nombreConcepto(novedad, "Incapacidad"), importe);
            }
            case "PERMISO_NO_REMUNERADO", "PERMISO" -> agregar(deducciones, tipo,
                    nombreConcepto(novedad, "Permiso"),
                    dias(novedad.getFechaInicio(), novedad.getFechaFin()) * salarioDiario);
            default -> throw new IllegalArgumentException(
                    "Hay una novedad aprobada con un tipo sin regla de liquidación: "
                            + (tipo.isBlank() ? "(vacío)" : tipo));
        }
    }

    private double calcularHorasExtras(Novedad novedad, double salarioHora) {
        if (novedad.getHoras() == null || novedad.getHoras() <= 0) {
            return 0;
        }
        String tipoHora = novedad.getTipoHora() == null ? "" : novedad.getTipoHora().toLowerCase(Locale.ROOT)
                .replace("ú", "u").replace("á", "a").trim();
        double multiplicador = switch (tipoHora) {
            case "diurnas", "diurna" -> 1.25;
            case "nocturnas", "nocturna" -> 1.75;
            case "dominicales_diurnas", "festivas_diurnas", "dominical_diurna", "festiva_diurna" ->
                    1.0 + tarifaDescanso(novedad) + 0.25;
            case "dominicales_nocturnas", "festivas_nocturnas", "dominical_nocturna", "festiva_nocturna" ->
                    1.0 + tarifaDescanso(novedad) + 0.75;
            default -> 1.25; // dato sin franja registrada: se liquida como diurna
        };
        return novedad.getHoras() * salarioHora * multiplicador;
    }

    private double tarifaDescanso(Novedad novedad) {
        LocalDate fecha = novedad.getFechaInicio();
        if (fecha == null || fecha.isBefore(LocalDate.of(2025, 7, 1))) return 0.75;
        if (fecha.isBefore(LocalDate.of(2026, 7, 1))) return 0.80;
        if (fecha.isBefore(LocalDate.of(2027, 7, 1))) return 0.90;
        return 1.0;
    }

    private void validarLimitesHorasExtras(List<Novedad> novedades, List<Novedad> novedadesDeSemanas) {
        Map<String, Double> horasPorEmpleadoSemana = new HashMap<>();
        Map<String, Double> horasPorEmpleadoDia = new HashMap<>();
        for (Novedad novedad : novedadesDeSemanas) {
            if (!"HORAS_EXTRAS".equalsIgnoreCase(novedad.getTipoNovedad())) {
                continue;
            }
            if (novedad.getHoras() == null || novedad.getHoras() <= 0 || novedad.getFechaInicio() == null) {
                throw new IllegalStateException("Toda hora extra aprobada debe tener horas y fecha válidas. Novedad: "
                        + novedad.getId());
            }
            String empleado = novedad.getIdEmpleado() != null
                    ? novedad.getIdEmpleado().toString() : String.valueOf(novedad.getCedula());
            if (horasPorEmpleadoDia.merge(empleado + ":" + novedad.getFechaInicio(),
                    novedad.getHoras(), Double::sum) > 2) {
                throw new IllegalStateException("Las horas extras no pueden superar 2 por día. Novedad: "
                        + novedad.getId());
            }
            LocalDate lunes = novedad.getFechaInicio().minusDays(
                    novedad.getFechaInicio().getDayOfWeek().getValue() - 1L);
            String clave = empleado + ":" + lunes;
            double total = horasPorEmpleadoSemana.merge(clave, novedad.getHoras(), Double::sum);
            if (total > 12) {
                throw new IllegalStateException("Las horas extras no pueden superar 12 por semana. Empleado: "
                        + empleado + ", semana: " + lunes);
            }
        }
    }

    private void agregar(List<NominaLiquidacionResponse.ConceptoLiquidado> conceptos,
                         String tipo, String nombre, double importe) {
        if (importe > 0) {
            conceptos.add(NominaLiquidacionResponse.ConceptoLiquidado.builder()
                    .tipo(tipo)
                    .concepto(nombre)
                    .valor(Math.round(importe))
                    .build());
        }
    }

    private double valorNovedad(Novedad novedad) {
        if (novedad.getValor() != null && novedad.getValor() > 0) {
            return novedad.getValor();
        }
        return novedad.getMonto() == null ? 0 : novedad.getMonto();
    }

    private long dias(LocalDate inicio, LocalDate fin) {
        if (inicio == null || fin == null || fin.isBefore(inicio)) {
            return 0;
        }
        return ChronoUnit.DAYS.between(inicio, fin) + 1;
    }

    private String nombreConcepto(Novedad novedad, String alternativa) {
        if (novedad.getConcepto() != null && !novedad.getConcepto().isBlank()) {
            return novedad.getConcepto();
        }
        if (novedad.getMotivo() != null && !novedad.getMotivo().isBlank()) {
            return novedad.getMotivo();
        }
        return alternativa;
    }
}
