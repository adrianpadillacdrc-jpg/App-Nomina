// src/main/java/com/nomina/numa/controller/PeriodoNominaController.java
package com.nomina.numa.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.nomina.numa.model.mongo.PeriodoNomina;
import com.nomina.numa.repository.mongo.PeriodoNominaRepository;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/periodo-nomina")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
public class PeriodoNominaController {

    private final PeriodoNominaRepository repo;

    // Cargar período actual
    @GetMapping("/actual")
    public ResponseEntity<PeriodoNomina> getActual() {
        Optional<PeriodoNomina> periodo = repo.findTopByEstadoOrderByFechaInicioDesc("ABIERTO");
        return periodo.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // CREAR NUEVA QUINCENA (ESTE ES EL QUE HACÍA FALTA)
    @PostMapping
    public ResponseEntity<PeriodoNomina> crear(@RequestBody PeriodoNomina nuevo) {
        // Cierra automáticamente el período anterior
        repo.findTopByEstadoOrderByFechaInicioDesc("ABIERTO")
                .ifPresent(anterior -> {
                    anterior.setEstado("CERRADO");
                    repo.save(anterior);
                });

        nuevo.setEstado("ABIERTO");
        PeriodoNomina guardado = repo.save(nuevo);
        return ResponseEntity.ok(guardado);
    }

    @GetMapping("/todos")
    public ResponseEntity<List<PeriodoNomina>> getTodosLosPeriodos() {
        List<PeriodoNomina> periodos = repo.findAllByOrderByFechaInicioDesc();
        return ResponseEntity.ok(periodos);
    }

    @PatchMapping("/cerrar-actual")
    public ResponseEntity<String> cerrarPeriodoActual() {
        Optional<PeriodoNomina> actual = repo.findTopByEstadoOrderByFechaInicioDesc("ABIERTO");
        if (actual.isPresent()) {
            PeriodoNomina p = actual.get();
            p.setEstado("CERRADO");
            repo.save(p);
            return ResponseEntity.ok("Período cerrado");
        }
        return ResponseEntity.notFound().build();
    }
}
