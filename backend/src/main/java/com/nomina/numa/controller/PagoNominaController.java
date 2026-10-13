// backend/src/main/java/com/nomina/numa/controller/PagoNominaController.java
package com.nomina.numa.controller;

import com.nomina.numa.model.mongo.PagoNomina;
import com.nomina.numa.dto.PagoNominaRequest;
import com.nomina.numa.dto.NominaLiquidacionResponse;
import com.nomina.numa.service.PagoNominaService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pagos-nomina")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class PagoNominaController {
    private final PagoNominaService service;

    @GetMapping("/liquidacion/{periodoId}")
    public NominaLiquidacionResponse liquidacion(@PathVariable String periodoId) {
        return service.previsualizar(periodoId);
    }

    @GetMapping
    public List<PagoNomina> getAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<PagoNomina> getById(@PathVariable String id) {
        return service.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/periodo/{periodoId}")
    public List<PagoNomina> getByPeriodo(@PathVariable String periodoId) {
        return service.findByPeriodo(periodoId);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id) {
        service.deleteById(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping
    public ResponseEntity<?> pagar(@RequestBody PagoNominaRequest request) {
        if (request.getPeriodoId() == null || request.getPeriodoId().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El período es requerido"));
        }

        try {
            return ResponseEntity.ok(service.pagarNomina(request));
        } catch (RuntimeException error) {
            return ResponseEntity.badRequest().body(Map.of("error", error.getMessage()));
        }
    }

    /**
     * ✅ Corrige los pagos ya guardados que tienen nombre genérico "Empleado N",
     * reemplazándolo por el nombre real del empleado.
     */
    @PostMapping("/corregir-nombres")
    public ResponseEntity<?> corregirNombres() {
        try {
            int corregidos = service.corregirNombres();
            return ResponseEntity.ok(Map.of("mensaje", "Pagos corregidos", "total", corregidos));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
