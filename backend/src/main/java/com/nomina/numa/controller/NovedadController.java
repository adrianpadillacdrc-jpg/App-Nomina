// src/main/java/com/nomina/numa/controller/NovedadController.java
package com.nomina.numa.controller;

import com.nomina.numa.model.mongo.Novedad;
import com.nomina.numa.service.NovedadService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/novedades")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor // ← Esto inyecta automáticamente el service
public class NovedadController {

    private final NovedadService novedadService; // ← CORRECTO: solo una línea

    // Endpoint que usa el frontend
    @GetMapping("/empleado/{empleadoId}")
    public ResponseEntity<List<Novedad>> getPorEmpleado(@PathVariable String empleadoId) {
        List<Novedad> lista = novedadService.findByEmpleadoId(empleadoId);
        return ResponseEntity.ok(lista);
    }

    @GetMapping("/periodo/{periodoId}")
    public ResponseEntity<List<Novedad>> getByPeriodo(@PathVariable String periodoId) {
        return ResponseEntity.ok(novedadService.findByPeriodoId(periodoId));
    }

    @PostMapping
    public ResponseEntity<Novedad> crear(@RequestBody Novedad novedad) {
        novedad.setEstado("PENDIENTE");
        return ResponseEntity.ok(novedadService.save(novedad));
    }

    @GetMapping
    public List<Novedad> todas() {
        return novedadService.findAll();
    }
}