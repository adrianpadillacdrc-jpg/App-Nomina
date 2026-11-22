package com.nomina.numa.controller;

import com.nomina.numa.dto.PagoIndividualRequest;
import com.nomina.numa.model.postgres.PagoNomina;
import com.nomina.numa.service.PagoIndividualService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/pagos-individuales")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class PagoIndividualController {

    private final PagoIndividualService service;

    /**
     * POST /api/pagos-individuales
     * Registra un pago individual (un solo empleado, sin período de nómina).
     * Devuelve { id, totalPagar, metodoPago, ... }
     */
    @PostMapping
    public ResponseEntity<?> pagar(@RequestBody PagoIndividualRequest req) {
        try {
            PagoNomina pago = service.registrar(req);
            return ResponseEntity.ok(Map.of(
                    "id",         pago.getId(),
                    "pagoId",     pago.getId(),
                    "totalPagar", pago.getTotalPagar(),
                    "metodoPago", pago.getMetodoPago(),
                    "estado",     pago.getEstado()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
