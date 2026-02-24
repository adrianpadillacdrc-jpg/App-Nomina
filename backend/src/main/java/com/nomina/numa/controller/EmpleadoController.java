// src/main/java/com/nomina/numa/controller/EmpleadoController.java
package com.nomina.numa.controller;

import com.nomina.numa.model.postgres.Empleado;
import com.nomina.numa.service.EmpleadoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/empleados")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
public class EmpleadoController {

    private final EmpleadoService service;

    // LISTAR TODOS
    @GetMapping
    public List<Empleado> getAll() {
        return service.findAll();
    }

    // LISTAR SOLO ACTIVOS
    @GetMapping("/activos")
    public List<Empleado> getActivos() {
        return service.findActivos();
    }

    // BUSCAR POR ID
    @GetMapping("/{id}")
    public ResponseEntity<Empleado> getById(@PathVariable Long id) {
        Empleado e = service.findById(id);
        return e != null ? ResponseEntity.ok(e) : ResponseEntity.notFound().build();
    }

    // CREAR NUEVO EMPLEADO
    @PostMapping
    public Empleado create(@RequestBody Empleado e) {
        return service.save(e);
    }

    // ACTUALIZAR EMPLEADO (ESTE ES EL QUE USA TU BOTÓN "ACTUALIZAR")
    @PutMapping("/{id}")
    public ResponseEntity<Empleado> update(@PathVariable Long id, @RequestBody Empleado e) {
        if (!service.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        e.setId(id); // Aseguramos que el ID sea correcto
        Empleado actualizado = service.save(e);
        return ResponseEntity.ok(actualizado);
    }

    // ELIMINAR EMPLEADO
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!service.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        service.deleteById(id);
        return ResponseEntity.ok().build();
    }
}