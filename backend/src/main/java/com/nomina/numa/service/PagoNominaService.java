// backend/src/main/java/com/nomina/numa/service/PagoNominaService.java
package com.nomina.numa.service;

import com.nomina.numa.dto.PagoNominaRequest;
import com.nomina.numa.model.mongo.*;
import com.nomina.numa.repository.mongo.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PagoNominaService {
    private final PagoNominaRepository pagoRepo;
    private final DetallePagoRepository detalleRepo;
    private final PeriodoNominaRepository periodoRepo;

    public PagoNomina pagarNomina(PagoNominaRequest req) {
        // 1. Cerrar período
        PeriodoNomina periodo = periodoRepo.findById(req.getPeriodoId())
                .orElseThrow(() -> new RuntimeException("Período no encontrado"));
        periodo.setEstado("CERRADO");
        periodoRepo.save(periodo);

        // 2. Crear pago general
        PagoNomina pagoGeneral = PagoNomina.builder()
                .idNomina(req.getPeriodoId())
                .fechaPago(LocalDate.now())
                .metodoPago("TRANSFERENCIA")
                .estado("PAGADO")
                .build();

        double totalDev = 0, totalDed = 0, totalPag = 0;

        // 3. Procesar cada empleado
        for (var det : req.getDetalles()) {
            PagoNomina pagoEmp = PagoNomina.builder()
                    .idNomina(req.getPeriodoId())
                    .idEmpleado(det.getIdEmpleado())
                    .nombreEmpleado("Empleado " + det.getIdEmpleado()) // ← Mejorar: integrar con Empleado
                    .totalDevengado(det.getTotalDevengado())
                    .totalDeducciones(det.getTotalDeducciones())
                    .totalPagar(det.getTotalPagar())
                    .fechaPago(LocalDate.now())
                    .metodoPago("TRANSFERENCIA")
                    .estado("PAGADO")
                    .build();

            PagoNomina saved = pagoRepo.save(pagoEmp);

            // 4. Detalle de pago
            detalleRepo.save(DetallePago.builder()
                    .idPagoNomina(saved.getId())
                    .idEmpleado(det.getIdEmpleado())
                    .tipoConcepto("SUELDO_BASE")
                    .nombreConcepto("Sueldo Base")
                    .valor(det.getTotalPagar())
                    .valor(det.getTotalPagar())
                    .build());

            totalDev += det.getTotalDevengado();
            totalDed += det.getTotalDeducciones();
            totalPag += det.getTotalPagar();
        }

        // 5. Actualizar totales generales
        pagoGeneral.setTotalDevengado(totalDev);
        pagoGeneral.setTotalDeducciones(totalDed);
        pagoGeneral.setTotalPagar(totalPag);
        return pagoRepo.save(pagoGeneral);
    }

    public List<PagoNomina> findAll() { return pagoRepo.findAll(); }
    public Optional<PagoNomina> findById(String id) { return pagoRepo.findById(id); }
    public void deleteById(String id) { pagoRepo.deleteById(id); }
}