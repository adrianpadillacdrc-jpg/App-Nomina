package com.nomina.numa.controller;

import com.nomina.numa.dto.OptimizerDto.*;
import com.nomina.numa.service.OptimizerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/optimizacion")
@RequiredArgsConstructor
@Tag(name = "Optimización y Simulación", description = "Simulador de escenarios y planificación legal de turnos 2026")
public class OptimizerController {

    private final OptimizerService optimizerService;

    @PostMapping("/simular")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Simular escenarios (Conservador, Óptimo, Expansión) y generar análisis Gemini")
    public ResponseEntity<?> simular(
            @RequestBody OptimizarExternoRequest request,
            Authentication auth) {
        try {
            String creadoPor = auth != null ? auth.getName() : "admin@numa.com";
            SimulacionResponseDto resultado = optimizerService.simularEscenarios(
                    request != null ? request.demandaPorCargo() : null,
                    request,
                    creadoPor
            );
            return ResponseEntity.ok(resultado);
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage() != null ? ex.getMessage() : "Error en simulación"));
        }
    }

    @PostMapping("/generar-vacantes")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Crear contratos en estado BORRADOR basados en la optimización")
    public ResponseEntity<Map<String, Object>> generarVacantes(
            @RequestBody GenerarVacantesRequest request) {

        int creadas = optimizerService.generarVacantesEnBorrador(request.contratacionesPorCargo());

        return ResponseEntity.ok(Map.of(
                "mensaje", "Se generaron exitosamente " + creadas + " vacante(s) en estado BORRADOR en el módulo de Contratos.",
                "vacantesCreadas", creadas
        ));
    }
}
