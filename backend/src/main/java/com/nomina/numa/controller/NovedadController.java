package com.nomina.numa.controller;

import com.nomina.numa.model.postgres.Novedad;
import com.nomina.numa.model.postgres.PeriodoNomina;
import com.nomina.numa.repository.jpa.PeriodoNominaRepository;
import com.nomina.numa.service.NovedadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/novedades")
@PreAuthorize("hasAnyRole('ADMIN', 'EMPLEADO')")
@RequiredArgsConstructor
public class NovedadController {

    private final NovedadService novedadService;
    private final PeriodoNominaRepository periodoNominaRepository;

    @GetMapping("/empleado/{empleadoId}")
    public ResponseEntity<List<Novedad>> getPorEmpleado(@PathVariable Long empleadoId) {
        List<Novedad> lista = novedadService.findByEmpleadoId(empleadoId);
        return ResponseEntity.ok(lista);
    }

    @GetMapping("/cedula/{cedula}")
    public ResponseEntity<List<Novedad>> getPorCedula(@PathVariable String cedula) {
        List<Novedad> lista = novedadService.findByCedula(cedula);
        return ResponseEntity.ok(lista);
    }

    @GetMapping("/periodo/{periodoId}")
    public ResponseEntity<List<Novedad>> getByPeriodo(@PathVariable String periodoId) {
        return ResponseEntity.ok(novedadService.findByPeriodoId(periodoId));
    }

    @PostMapping
    public ResponseEntity<Novedad> crear(@RequestBody Novedad novedad) {
        log.info("Creando novedad - Tipo: {}, Cédula: {}", novedad.getTipoNovedad(), novedad.getCedula());

        if (novedad.getPeriodoId() == null || novedad.getPeriodoId().isBlank()) {
            periodoNominaRepository.findTopByEstadoOrderByFechaInicioDesc("ABIERTO")
                    .ifPresent(p -> novedad.setPeriodoId(String.valueOf(p.getId())));
        }

        novedad.setEstado("PENDIENTE");
        novedad.setCreatedAt(LocalDateTime.now());
        novedad.setUpdatedAt(LocalDateTime.now());

        return ResponseEntity.ok(novedadService.save(novedad));
    }

    @PostMapping("/asignar-periodo-actual")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> asignarPeriodoActual() {
        Optional<PeriodoNomina> periodo = periodoNominaRepository.findTopByEstadoOrderByFechaInicioDesc("ABIERTO");
        if (periodo.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No hay período ABIERTO"));
        }
        String periodoId = String.valueOf(periodo.get().getId());
        List<Novedad> huerfanas = novedadService.findAll().stream()
                .filter(n -> n.getPeriodoId() == null || n.getPeriodoId().isBlank())
                .collect(Collectors.toList());
        for (Novedad n : huerfanas) {
            n.setPeriodoId(periodoId);
            novedadService.save(n);
        }
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("mensaje", "Novedades asignadas al período actual");
        res.put("periodoId", periodoId);
        res.put("actualizadas", huerfanas.size());
        return ResponseEntity.ok(res);
    }

    /**
     * ✅ LIMPIEZA: elimina TODAS las novedades (para regenerar datos).
     */
    @DeleteMapping("/limpiar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> limpiar() {
        novedadService.deleteAll();
        return ResponseEntity.ok(Map.of("mensaje", "Todas las novedades eliminadas"));
    }

    @GetMapping
    public List<Novedad> todas() {
        log.info("GET /api/novedades - Iniciando");
        List<Novedad> novedades = novedadService.findAll();
        log.info("Novedades recuperadas: {}", novedades.size());
        return novedades;
    }
}
