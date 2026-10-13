// backend/src/main/java/com/nomina/numa/service/PagoNominaService.java
package com.nomina.numa.service;

import com.nomina.numa.dto.PagoNominaRequest;
import com.nomina.numa.dto.NominaLiquidacionResponse;
import com.nomina.numa.model.mongo.*;
import com.nomina.numa.model.postgres.Empleado;
import com.nomina.numa.repository.jpa.EmpleadoRepository;
import com.nomina.numa.repository.mongo.*;
import com.nomina.numa.util.EstadoNominaCompat;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PagoNominaService {
    private final PagoNominaRepository pagoRepo;
    private final DetallePagoRepository detalleRepo;
    private final PeriodoNominaRepository periodoRepo;
    private final EmpleadoRepository empleadoRepository;
    private final NominaLiquidacionService liquidacionService;

    public NominaLiquidacionResponse previsualizar(String periodoId) {
        return liquidacionService.calcular(periodoId);
    }

    /** Mapa id → "Nombre Apellido" de todos los empleados (evita N consultas). */
    private Map<Long, String> mapaNombres() {
        Map<Long, String> mapa = new java.util.HashMap<>();
        for (Empleado e : empleadoRepository.findAll()) {
            String nombre = ((e.getNombre() != null ? e.getNombre().trim() : "")
                    + " " + (e.getApellido() != null ? e.getApellido().trim() : "")).trim();
            if (e.getId() != null && !nombre.isBlank()) {
                mapa.put(e.getId(), nombre);
            }
        }
        return mapa;
    }

    public PagoNomina pagarNomina(PagoNominaRequest req) {
        PeriodoNomina periodo = periodoRepo.findById(req.getPeriodoId())
                .orElseThrow(() -> new RuntimeException("Período no encontrado"));
        if (!EstadoNominaCompat.esPeriodoAbierto(periodo.getEstado())) {
            throw new IllegalStateException("Solo se puede pagar un período abierto");
        }
        if (!pagoRepo.findByIdNominaAndIdEmpleadoIsNotNull(req.getPeriodoId()).isEmpty()
                || !pagoRepo.findByIdNominaAndIdEmpleadoIsNull(req.getPeriodoId()).isEmpty()) {
            throw new IllegalStateException("El período ya tiene pagos registrados");
        }

        NominaLiquidacionResponse liquidacion = liquidacionService.calcular(req.getPeriodoId());
        if (liquidacion.getEmpleados().isEmpty()) {
            throw new IllegalStateException("No hay empleados activos con salario válido para liquidar");
        }

        Map<Long, String> nombres = mapaNombres();
        for (var empleado : liquidacion.getEmpleados()) {
            if (nombres.get(empleado.getId()) == null) {
                throw new IllegalArgumentException("No existe un empleado con nombre registrado para el ID "
                        + empleado.getId());
            }
        }

        PagoNomina pagoGeneral = PagoNomina.builder()
                .idNomina(req.getPeriodoId())
                .fechaPago(LocalDate.now())
                .metodoPago("TRANSFERENCIA")
                .estado("PAGADO")
                .totalDevengado((double) liquidacion.getTotalDevengado())
                .totalDeducciones((double) liquidacion.getTotalDeducciones())
                .totalPagar((double) liquidacion.getTotalPagar())
                .aportesEmpleador((double) liquidacion.getTotalAportesEmpleador())
                .provisionesPrestacionales((double) liquidacion.getTotalProvisionesPrestacionales())
                .costoTotalEmpleador((double) liquidacion.getCostoTotalEmpleador())
                .build();

        for (var det : liquidacion.getEmpleados()) {
            PagoNomina pagoEmp = PagoNomina.builder()
                    .idNomina(req.getPeriodoId())
                    .idEmpleado(det.getId())
                    .nombreEmpleado(nombres.get(det.getId()))
                    .totalDevengado((double) (det.getSueldoBase() + det.getDevengos()))
                    .totalDeducciones((double) det.getDeducciones())
                    .totalPagar((double) det.getTotalPagar())
                    .aportesEmpleador((double) det.getAportesEmpleador())
                    .provisionesPrestacionales((double) det.getProvisionesPrestacionales())
                    .costoTotalEmpleador((double) det.getCostoTotalEmpleador())
                    .fechaPago(LocalDate.now())
                    .metodoPago("TRANSFERENCIA")
                    .estado("PAGADO")
                    .build();

            PagoNomina saved = pagoRepo.save(pagoEmp);

            List<DetallePago> detalles = new java.util.ArrayList<>();
            detalles.add(crearDetalle(saved.getId(), det.getId(), "DEVENGO", "Sueldo Base", det.getSueldoBase()));
            det.getDetalleDevengos().forEach(concepto -> detalles.add(crearDetalle(
                    saved.getId(), det.getId(), "DEVENGO", concepto.getConcepto(), concepto.getValor())));
            det.getDetalleDeducciones().forEach(concepto -> detalles.add(crearDetalle(
                    saved.getId(), det.getId(), "DEDUCCION", concepto.getConcepto(), concepto.getValor())));
            detalleRepo.saveAll(detalles);
        }

        PagoNomina pagoGeneralGuardado = pagoRepo.save(pagoGeneral);
        periodo.setEstado("CERRADO");
        periodo.setCostoCOP((double) liquidacion.getCostoTotalEmpleador());
        periodo.setCostoMillones(liquidacion.getCostoTotalEmpleador() / 1_000_000.0);
        periodo.setCostoEstimado(false);
        periodo.setOrigenCosto("LIQUIDACION_PAGADA");
        periodoRepo.save(periodo);
        return pagoGeneralGuardado;
    }

    private DetallePago crearDetalle(String pagoId, Long empleadoId, String tipo, String nombre, long valor) {
        return DetallePago.builder()
                .idPagoNomina(pagoId)
                .idEmpleado(empleadoId)
                .tipoConcepto(tipo)
                .nombreConcepto(nombre)
                .valorRecibido(Long.toString(valor))
                .valor((double) valor)
                .build();
    }

    public List<PagoNomina> findAll() { return pagoRepo.findAll(); }
    public List<PagoNomina> findByPeriodo(String periodoId) {
        List<PagoNomina> pagos = pagoRepo.findByIdNominaAndIdEmpleadoIsNotNull(periodoId);
        Map<Long, String> nombres = mapaNombres();
        for (PagoNomina pago : pagos) {
            if (pago.getIdEmpleado() == null) continue;
            String actual = pago.getNombreEmpleado();
            String real = nombres.get(pago.getIdEmpleado());
            if (real != null && (actual == null || actual.isBlank() || actual.startsWith("Empleado "))) {
                pago.setNombreEmpleado(real);
                pagoRepo.save(pago);
            }
        }
        return pagos;
    }
    public Optional<PagoNomina> findById(String id) { return pagoRepo.findById(id); }
    public void deleteById(String id) { pagoRepo.deleteById(id); }

    /**
     * ✅ Corrige los pagos ya guardados que tienen nombre genérico "Empleado N",
     * reemplazándolo por el nombre real del empleado en PostgreSQL.
     * @return cantidad de registros corregidos
     */
    public int corregirNombres() {
        Map<Long, String> nombres = mapaNombres();
        int corregidos = 0;
        for (PagoNomina p : pagoRepo.findAll()) {
            if (p.getIdEmpleado() == null) continue;
            String actual = p.getNombreEmpleado();
            String real = nombres.get(p.getIdEmpleado());
            if (real != null && !real.isBlank() && (actual == null || actual.startsWith("Empleado "))) {
                p.setNombreEmpleado(real);
                pagoRepo.save(p);
                corregidos++;
            }
        }
        return corregidos;
    }
}