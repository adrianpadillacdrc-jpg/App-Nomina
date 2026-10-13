package com.nomina.numa.controller;

import com.nomina.numa.model.mongo.Contratacion;
import com.nomina.numa.model.mongo.PagoNomina;
import com.nomina.numa.model.mongo.PeriodoNomina;
import com.nomina.numa.model.mongo.Renuncia;
import com.nomina.numa.model.postgres.Empleado;
import com.nomina.numa.repository.jpa.EmpleadoRepository;
import com.nomina.numa.repository.mongo.ContratacionRepository;
import com.nomina.numa.repository.mongo.PagoNominaRepository;
import com.nomina.numa.repository.mongo.PeriodoNominaRepository;
import com.nomina.numa.repository.mongo.RenunciaRepository;
import com.nomina.numa.util.EstadoNominaCompat;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;


@RestController
@RequestMapping("/api/historial")
@RequiredArgsConstructor
public class HistorialController {

    private final EmpleadoRepository empleadoRepository;
    private final ContratacionRepository contratacionRepository;
    private final PeriodoNominaRepository periodoNominaRepository;
    private final RenunciaRepository renunciaRepository;
    private final MongoTemplate mongoTemplate;

    private static final DateTimeFormatter FECHA = DateTimeFormatter.ISO_LOCAL_DATE;

    @GetMapping("/general")
    public Map<String, Object> historialGeneral(
            @RequestParam(defaultValue = "") String busqueda,
            @RequestParam(defaultValue = "") String estado,
            @RequestParam(defaultValue = "") String tipo,
            @RequestParam(name = "frecuencia", defaultValue = "") String frecuenciaFiltroParam,
            @RequestParam(defaultValue = "") String estadoPago,
            @RequestParam(defaultValue = "") String desde,
            @RequestParam(defaultValue = "") String hasta,
            @RequestParam(defaultValue = "") String empleadoId,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "100") int tamano) {

        LocalDate hoy = LocalDate.now();
        List<Empleado> empleados = empleadoRepository.findAll();
        List<Contratacion> contrataciones = contratacionRepository.findAll();
        List<PeriodoNomina> periodos = periodoNominaRepository.findAll();
        List<Renuncia> renuncias = renunciaRepository.findAll();
        Map<String, PeriodoNomina> periodosPorId = periodos.stream()
            .filter(p -> p.getId() != null)
            .collect(Collectors.toMap(PeriodoNomina::getId, p -> p, (a, b) -> a));
        Map<Long, Empleado> empleadosPorId = empleados.stream()
            .filter(e -> e.getId() != null)
            .collect(Collectors.toMap(Empleado::getId, e -> e, (a, b) -> a));

        // Mapa idEmpleado -> contrataciones
        Map<Long, List<Contratacion>> contratosPorEmpleado = contrataciones.stream()
                .filter(c -> c.getIdEmpleado() != null)
                .collect(Collectors.groupingBy(Contratacion::getIdEmpleado));

        // ===== Clasificación de empleados =====
        List<Map<String, Object>> empleadosClasificados = new ArrayList<>();
        long activos = 0, inactivos = 0, liquidados = 0, pendientes = 0, retirados = 0;
        double nominaActiva = 0;

        for (Empleado e : empleados) {
            String estadoUpper = (e.getEstado() == null ? "" : e.getEstado()).toUpperCase().trim();
            List<Contratacion> contratos = contratosPorEmpleado.getOrDefault(e.getId(), List.of());

            String categoria;
            LocalDate fechaFin = e.getFechaFinContrato();
            boolean contratoVencido = fechaFin != null && fechaFin.isBefore(hoy);

            switch (estadoUpper) {
                case "ACTIVO" -> {
                    if (contratoVencido) {
                        categoria = "SALIO"; // contrato vencido y sigue activo en ficha: salió de la empresa
                        retirados++;
                    } else {
                        categoria = "EN_EMPRESA";
                        activos++;
                        if (e.getSalarioBase() != null) nominaActiva += e.getSalarioBase();
                    }
                }
                case "INACTIVO" -> {
                    categoria = "INACTIVO";
                    inactivos++;
                }
                case "LIQUIDADO" -> {
                    categoria = "LIQUIDADO";
                    liquidados++;
                }
                case "PENDIENTE" -> {
                    categoria = "PENDIENTE";
                    pendientes++;
                }
                default -> {
                    categoria = "EN_EMPRESA";
                    activos++;
                    if (e.getSalarioBase() != null) nominaActiva += e.getSalarioBase();
                }
            }

            Map<String, Object> item = new HashMap<>();
            item.put("id", e.getId());
            item.put("nombre", e.getNombre());
            item.put("apellido", e.getApellido());
            item.put("nombreCompleto", e.getNombre() + " " + e.getApellido());
            item.put("numeroDocumento", e.getNumeroDocumento());
            item.put("cargo", e.getCargo());
            item.put("salarioBase", e.getSalarioBase());
            item.put("estado", estadoUpper);
            item.put("categoria", categoria);
            item.put("fechaCreacion", e.getFechaCreacion() == null ? null : e.getFechaCreacion().format(FECHA));
            item.put("fechaInicioContrato", e.getFechaInicioContrato() == null ? null : e.getFechaInicioContrato().format(FECHA));
            item.put("fechaFinContrato", fechaFin == null ? null : fechaFin.format(FECHA));
            item.put("contratosVigentes", contratos.stream().filter(c -> EstadoNominaCompat.esContratacionVigente(c.getEstado())).count());
            item.put("totalContratos", contratos.size());
            empleadosClasificados.add(item);
        }

        // ===== Timeline de eventos =====
        List<Map<String, Object>> eventos = new ArrayList<>();

        for (Empleado e : empleados) {
            String nombre = e.getNombre() + " " + e.getApellido();
            String estadoUpper = (e.getEstado() == null ? "" : e.getEstado()).toUpperCase().trim();

            // 1) Registro
            if (e.getFechaCreacion() != null) {
                eventos.add(evento("REGISTRO", "Registro en el sistema",
                        e.getFechaCreacion(), e.getId(), nombre, e.getNumeroDocumento(), e.getCargo(),
                        "El empleado fue registrado con salario de $" + (e.getSalarioBase() == null ? "N/A" : String.format("%,.0f", e.getSalarioBase())),
                        "INFO"));
            }

            // 2) Inicio de contrato
            if (e.getFechaInicioContrato() != null) {
                eventos.add(evento("CONTRATO_INICIO", "Inicio de contrato",
                        e.getFechaInicioContrato(), e.getId(), nombre, e.getNumeroDocumento(), e.getCargo(),
                        "Contrato iniciado el " + e.getFechaInicioContrato().format(FECHA), "INFO"));
            }

            // 3) Fin de contrato / liquidación
            if (e.getFechaFinContrato() != null) {
                boolean vencido = e.getFechaFinContrato().isBefore(hoy);
                boolean esLiquidado = estadoUpper.contains("INACTIVO") || estadoUpper.contains("LIQUIDADO");
                eventos.add(evento(
                        esLiquidado ? "LIQUIDACION" : "FIN_CONTRATO",
                        esLiquidado ? "Liquidación" : "Fin de contrato",
                        e.getFechaFinContrato(), e.getId(), nombre, e.getNumeroDocumento(), e.getCargo(),
                        esLiquidado
                                ? "El empleado fue liquidado y salió de la empresa"
                                : (vencido ? "El contrato finalizó" : "El contrato termina el " + e.getFechaFinContrato().format(FECHA)),
                        esLiquidado ? "ALTA" : (vencido ? "MEDIA" : "INFO")));
            }

            // 4) Contrataciones de Mongo (histórico completo)
            for (Contratacion c : contratosPorEmpleado.getOrDefault(e.getId(), List.of())) {
                String estadoC = (c.getEstado() == null ? "" : c.getEstado()).toUpperCase();
                eventos.add(evento("CONTRATACION", "Contratación " + estadoC,
                        c.getFechaInicio(), e.getId(), nombre, e.getNumeroDocumento(), e.getCargo(),
                        "Del " + (c.getFechaInicio() == null ? "N/A" : c.getFechaInicio().format(FECHA))
                                + " al " + (c.getFechaFin() == null ? "N/A" : c.getFechaFin().format(FECHA))
                                + " · " + estadoC,
                        EstadoNominaCompat.esContratacionVigente(estadoC) ? "INFO" : "MEDIA"));
            }
        }

            // La aceptación de renuncia y el pago de la liquidación son hitos separados.
            for (Renuncia renuncia : renuncias) {
                if (renuncia.getIdEmpleado() == null) continue;
                Empleado empleado = empleadosPorId.get(renuncia.getIdEmpleado());
                String nombre = empleado != null ? nombreCompleto(empleado)
                    : (renuncia.getNombreEmpleado() == null ? "Empleado histórico" : renuncia.getNombreEmpleado());
                String documento = empleado == null ? null : empleado.getNumeroDocumento();
                String cargo = empleado == null ? renuncia.getCargoEmpleado() : empleado.getCargo();
                if (renuncia.getFechaEnvio() != null) {
                eventos.add(evento("RENUNCIA", "Renuncia · " + estadoTexto(renuncia.getEstado()),
                    renuncia.getFechaEnvio(), renuncia.getIdEmpleado(), nombre, documento, cargo,
                    "Solicitud de renuncia · Motivo: " + (renuncia.getMotivo() == null ? "N/A" : renuncia.getMotivo()),
                    "ACEPTADA".equalsIgnoreCase(renuncia.getEstado()) ? "MEDIA" : "INFO"));
                }
                if (renuncia.getFechaAceptacion() != null) {
                Map<String, Object> eventoLiquidacion = evento("LIQUIDACION", "Liquidación calculada",
                    renuncia.getFechaAceptacion(), renuncia.getIdEmpleado(), nombre, documento, cargo,
                    "Estado del pago: " + estadoTexto(renuncia.getEstadoPago()) + " · Valor: $"
                        + formatoMoneda(renuncia.getLiquidacionEstimada()), "ALTA");
                eventoLiquidacion.put("estadoPago", renuncia.getEstadoPago() == null
                    ? "" : renuncia.getEstadoPago().toUpperCase(Locale.ROOT));
                eventos.add(eventoLiquidacion);
                }
                if (renuncia.getFechaPago() != null || "PAGADO".equalsIgnoreCase(renuncia.getEstadoPago())) {
                Map<String, Object> eventoPagoLiquidacion = evento("PAGO_LIQUIDACION",
                    "Pago de liquidación · " + estadoTexto(renuncia.getEstadoPago()),
                    renuncia.getFechaPago(), renuncia.getIdEmpleado(), nombre, documento, cargo,
                    "Liquidación pagada · Valor: $" + formatoMoneda(renuncia.getLiquidacionEstimada()), "ALTA");
                eventoPagoLiquidacion.put("estadoPago", renuncia.getEstadoPago() == null
                    ? "" : renuncia.getEstadoPago().toUpperCase(Locale.ROOT));
                eventos.add(eventoPagoLiquidacion);
                }
            }

        // Ordenar eventos: más recientes primero
        eventos.sort(this::compararEventosPorFecha);

        // ===== Resumen =====
        long contratosPorVencer = contrataciones.stream()
                .filter(c -> EstadoNominaCompat.esContratacionVigente(c.getEstado()) && c.getFechaFin() != null)
                .filter(c -> !c.getFechaFin().isBefore(hoy) && c.getFechaFin().isBefore(hoy.plusDays(15)))
                .count();
        long contratosVencidos = contrataciones.stream()
                .filter(c -> c.getFechaFin() != null && c.getFechaFin().isBefore(hoy))
                .count();

        Map<String, Object> resumen = new HashMap<>();
        resumen.put("totalEmpleados", empleados.size());
        resumen.put("enEmpresa", activos);
        resumen.put("inactivos", inactivos);
        resumen.put("liquidados", liquidados);
        resumen.put("pendientes", pendientes);
        resumen.put("salieron", retirados);
        resumen.put("nominaActiva", Math.round(nominaActiva));
        resumen.put("contratosPorVencer", contratosPorVencer);
        resumen.put("contratosVencidos", contratosVencidos);
        resumen.put("totalContrataciones", contrataciones.size());

        // ===== Filtros =====
        String q = normalizar(busqueda);
        String est = estado.toUpperCase().trim();
        Long idEmpleadoFiltro = parsearId(empleadoId);
        List<Map<String, Object>> filtrados = empleadosClasificados.stream()
            .filter(emp -> idEmpleadoFiltro == null || idEmpleadoFiltro.equals(emp.get("id")))
                .filter(emp -> est.isEmpty() || est.equals(emp.get("categoria")))
                .filter(emp -> q.isEmpty()
                || normalizar(String.valueOf(emp.get("nombreCompleto"))).contains(q)
                || normalizar(String.valueOf(emp.get("numeroDocumento"))).contains(q))
                .collect(Collectors.toList());
        Set<Long> idsFiltrados = filtrados.stream()
            .map(emp -> (Long) emp.get("id"))
            .collect(Collectors.toSet());
        LocalDate fechaDesde = parsearFecha(desde);
        LocalDate fechaHasta = parsearFecha(hasta);
        String tipoFiltro = tipo.toUpperCase(Locale.ROOT).trim();
        String frecuenciaFiltro = frecuenciaFiltroParam.toUpperCase(Locale.ROOT).trim();
        String estadoPagoFiltro = estadoPago.toUpperCase(Locale.ROOT).trim();
        boolean incluirPagos = tipoFiltro.isEmpty() || "PAGO_NOMINA".equals(tipoFiltro);

        List<Map<String, Object>> eventosNoPago = eventos.stream()
                .filter(ev -> {
                    Object id = ev.get("empleadoId");
                    if (!(id instanceof Long idEmpleado) || empleadosPorId.containsKey(idEmpleado)) {
                        return id == null || idsFiltrados.contains(id);
                    }
                    String nombre = normalizar(String.valueOf(ev.get("empleado")));
                    String documento = normalizar(String.valueOf(ev.get("documento")));
                    return est.isEmpty() && (q.isEmpty() || nombre.contains(q) || documento.contains(q));
                })
                .filter(ev -> tipoFiltro.isEmpty() || !"PAGO_NOMINA".equals(tipoFiltro)
                        && tipoFiltro.equals(ev.get("tipo")))
                .filter(ev -> frecuenciaFiltro.isEmpty())
                .filter(ev -> estadoPagoFiltro.isEmpty() || estadoPagoFiltro.equals(ev.get("estadoPago")))
                .filter(ev -> fechaDesde == null || (ev.get("fecha") != null
                        && !LocalDate.parse((String) ev.get("fecha")).isBefore(fechaDesde)))
                .filter(ev -> fechaHasta == null || (ev.get("fecha") != null
                        && !LocalDate.parse((String) ev.get("fecha")).isAfter(fechaHasta)))
            .collect(Collectors.toList());

        eventosNoPago.sort(this::compararEventosPorFecha);
        List<Criteria> condicionesPago = new ArrayList<>();
        condicionesPago.add(Criteria.where("idEmpleado").ne(null));
        if (!estadoPagoFiltro.isEmpty()) condicionesPago.add(Criteria.where("estado").is(estadoPagoFiltro));
        if (fechaDesde != null || fechaHasta != null) {
            Criteria fechaPago = Criteria.where("fechaPago");
            if (fechaDesde != null) fechaPago.gte(fechaDesde);
            if (fechaHasta != null) fechaPago.lte(fechaHasta);
            condicionesPago.add(fechaPago);
        }
        if (idEmpleadoFiltro != null) {
            condicionesPago.add(Criteria.where("idEmpleado").is(idEmpleadoFiltro));
        } else if (!est.isEmpty()) {
            condicionesPago.add(idsFiltrados.isEmpty()
                    ? Criteria.where("idEmpleado").is(-1L)
                    : Criteria.where("idEmpleado").in(idsFiltrados));
        } else if (!q.isEmpty()) {
            List<Criteria> coincidencias = new ArrayList<>();
            if (!idsFiltrados.isEmpty()) coincidencias.add(Criteria.where("idEmpleado").in(idsFiltrados));
            coincidencias.add(Criteria.where("nombreEmpleado").regex(Pattern.quote(busqueda.trim()), "i"));
            condicionesPago.add(new Criteria().orOperator(coincidencias.toArray(Criteria[]::new)));
        }
        if (!frecuenciaFiltro.isEmpty()) {
            List<String> idsPeriodo = periodos.stream()
                    .filter(periodo -> frecuenciaPeriodo(periodo).equalsIgnoreCase(frecuenciaFiltro))
                    .map(PeriodoNomina::getId)
                    .filter(Objects::nonNull)
                    .toList();
            condicionesPago.add(idsPeriodo.isEmpty()
                    ? Criteria.where("idNomina").is("__sin_periodo__")
                    : Criteria.where("idNomina").in(idsPeriodo));
        }
        Criteria criteriosPago = new Criteria().andOperator(condicionesPago.toArray(Criteria[]::new));
        Query consultaConteoPagos = new Query(criteriosPago);
        long pagosTotal = incluirPagos ? mongoTemplate.count(consultaConteoPagos, PagoNomina.class) : 0;
        if (!incluirPagos) eventosNoPago.removeIf(ev -> "PAGO_NOMINA".equals(ev.get("tipo")));

        int paginaSegura = Math.max(0, pagina);
        int tamanoSeguro = Math.max(1, Math.min(tamano, 500));
        long inicio = (long) paginaSegura * tamanoSeguro;
        long finPagina = inicio + tamanoSeguro;
        int candidatosNoPago = (int) Math.min(finPagina, eventosNoPago.size());
        List<Map<String, Object>> candidatos = new ArrayList<>(eventosNoPago.subList(0, candidatosNoPago));

        long candidatosPago = incluirPagos ? Math.min(finPagina, pagosTotal) : 0;
        if (candidatosPago > 0) {
            Query consultaPagos = new Query(criteriosPago)
                    .with(Sort.by(Sort.Order.desc("fechaPago"), Sort.Order.desc("id")))
                    .limit((int) candidatosPago);
            List<PagoNomina> pagosPagina = mongoTemplate.find(consultaPagos, PagoNomina.class);
            for (PagoNomina pago : pagosPagina) {
                candidatos.add(eventoPagoNomina(pago, periodosPorId, empleadosPorId));
            }
        }
        candidatos.sort(this::compararEventosPorFecha);
        int desdeIndice = (int) Math.min(inicio, candidatos.size());
        int hastaIndice = Math.min(desdeIndice + tamanoSeguro, candidatos.size());
        List<Map<String, Object>> eventosPagina = candidatos.subList(desdeIndice, hastaIndice);
        long eventosTotal = eventosNoPago.size() + pagosTotal;

        Set<Long> empleadosConEventosSet = new HashSet<>();
        if (!filtroMovimientoVacio(tipoFiltro, frecuenciaFiltro, estadoPagoFiltro, fechaDesde, fechaHasta)) {
            eventosNoPago.stream().map(ev -> ev.get("empleadoId"))
                    .filter(Long.class::isInstance).map(Long.class::cast).forEach(empleadosConEventosSet::add);
            if (incluirPagos) {
                mongoTemplate.findDistinct(new Query(criteriosPago), "idEmpleado", PagoNomina.class, Long.class)
                        .forEach(empleadosConEventosSet::add);
            }
        }

        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("resumen", resumen);
        respuesta.put("empleados", filtrados);
                respuesta.put("eventos", eventosPagina);
                respuesta.put("eventosTotal", eventosTotal);
                respuesta.put("paginaEventos", paginaSegura);
                respuesta.put("paginasEventos", (int) Math.ceil(eventosTotal / (double) tamanoSeguro));
                respuesta.put("empleadosConEventos", new ArrayList<>(empleadosConEventosSet));
        respuesta.put("generadoEn", hoy.format(FECHA));
        return respuesta;
    }

    private Map<String, Object> evento(String tipo, String titulo, LocalDate fecha, Long empleadoId,
                                       String nombre, String documento, String cargo,
                                       String detalle, String nivel) {
        Map<String, Object> ev = new HashMap<>();
        ev.put("tipo", tipo);
        ev.put("empleadoId", empleadoId);
        ev.put("titulo", titulo);
        ev.put("fecha", fecha == null ? null : fecha.format(FECHA));
        ev.put("empleado", nombre);
        ev.put("documento", documento);
        ev.put("cargo", cargo);
        ev.put("detalle", detalle);
        ev.put("nivel", nivel);
        return ev;
    }

        private Map<String, Object> eventoPagoNomina(PagoNomina pago,
                              Map<String, PeriodoNomina> periodosPorId,
                              Map<Long, Empleado> empleadosPorId) {
        Empleado empleado = empleadosPorId.get(pago.getIdEmpleado());
        PeriodoNomina periodo = periodosPorId.get(pago.getIdNomina());
        String nombre = empleado != null ? nombreCompleto(empleado)
            : (pago.getNombreEmpleado() == null ? "Empleado histórico" : pago.getNombreEmpleado());
        String documento = empleado == null ? null : empleado.getNumeroDocumento();
        String cargo = empleado == null ? null : empleado.getCargo();
        LocalDate fecha = pago.getFechaPago() != null ? pago.getFechaPago()
            : periodo == null ? null : periodo.getFechaFin();
        String frecuencia = periodo == null ? "Frecuencia no disponible" : frecuenciaPeriodo(periodo);
        String periodoTexto = periodo == null ? "Período no disponible" : descripcionPeriodo(periodo);
        Map<String, Object> ev = evento("PAGO_NOMINA", "Pago de nómina · " + estadoTexto(pago.getEstado()),
            fecha, pago.getIdEmpleado(), nombre, documento, cargo,
            frecuencia + " · " + periodoTexto + " · Total: $" + formatoMoneda(pago.getTotalPagar())
                + " · Método: " + (pago.getMetodoPago() == null ? "N/A" : pago.getMetodoPago()),
            "PAGADO".equalsIgnoreCase(pago.getEstado()) ? "INFO" : "MEDIA");
        ev.put("frecuencia", frecuencia.toUpperCase(Locale.ROOT));
        ev.put("estadoPago", pago.getEstado() == null ? "" : pago.getEstado().toUpperCase(Locale.ROOT));
        return ev;
        }

        private int compararEventosPorFecha(Map<String, Object> a, Map<String, Object> b) {
        String fechaA = (String) a.get("fecha");
        String fechaB = (String) b.get("fecha");
        if (fechaA == null) return fechaB == null ? 0 : 1;
        if (fechaB == null) return -1;
        return fechaB.compareTo(fechaA);
        }

        private boolean filtroMovimientoVacio(String tipo, String frecuencia, String estadoPago,
                           LocalDate desde, LocalDate hasta) {
        return tipo.isEmpty() && frecuencia.isEmpty() && estadoPago.isEmpty() && desde == null && hasta == null;
        }

    private String nombreCompleto(Empleado empleado) {
        return ((empleado.getNombre() == null ? "" : empleado.getNombre().trim()) + " "
                + (empleado.getApellido() == null ? "" : empleado.getApellido().trim())).trim();
    }

    private String descripcionPeriodo(PeriodoNomina periodo) {
        String descripcion = periodo.getDescription();
        String rango = periodo.getFechaInicio() == null ? "" : periodo.getFechaInicio().format(FECHA)
                + " a " + (periodo.getFechaFin() == null ? "N/A" : periodo.getFechaFin().format(FECHA));
        return descripcion + (rango.isBlank() ? "" : " (" + rango + ")");
    }

    private String frecuenciaPeriodo(PeriodoNomina periodo) {
        String tipo = periodo.getTipo() == null ? "" : periodo.getTipo().toUpperCase(Locale.ROOT);
        if (tipo.contains("MENS") || tipo.contains("MES")) return "Mensual";
        if (tipo.contains("QUINC") || tipo.contains("1RA") || tipo.contains("2DA")) return "Quincenal";
        if (periodo.getFechaInicio() != null && periodo.getFechaFin() != null
                && java.time.temporal.ChronoUnit.DAYS.between(periodo.getFechaInicio(), periodo.getFechaFin()) >= 25) {
            return "Mensual";
        }
        return "Quincenal";
    }

    private String formatoMoneda(Double valor) {
        return valor == null ? "N/A" : String.format(Locale.forLanguageTag("es-CO"), "%,.0f", valor);
    }

    private String estadoTexto(String estado) {
        return estado == null || estado.isBlank() ? "Sin estado" : estado.replace('_', ' ');
    }

    private String normalizar(String texto) {
        return java.text.Normalizer.normalize(texto == null ? "" : texto, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT).trim();
    }

    private LocalDate parsearFecha(String fecha) {
        if (fecha == null || fecha.isBlank()) return null;
        try {
            return LocalDate.parse(fecha);
        } catch (java.time.format.DateTimeParseException ignored) {
            return null;
        }
    }

    private Long parsearId(String id) {
        if (id == null || id.isBlank()) return null;
        try {
            return Long.parseLong(id);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }
}
