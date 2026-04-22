package com.nomina.numa.controller;

import com.nomina.numa.model.postgres.Empleado;
import com.nomina.numa.service.EmpleadoService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/empleados")
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

    // ✅ CACHÉ: Total de empleados activos (se guarda en Redis por 5 minutos)
    @GetMapping("/total-activos")
    @Cacheable(value = "empleados", key = "'total-activos'")
    public Map<String, Long> getTotalEmpleadosActivos() {
        System.out.println("📡 Contando empleados activos en PostgreSQL (guardando en Redis por 5 minutos)");
        long total = service.countByEstado("ACTIVO");
        return Map.of("total", total);
    }

    // BUSCAR POR ID
    @GetMapping("/{id}")
    public ResponseEntity<Empleado> getById(@PathVariable Long id) {
        Empleado e = service.findById(id);
        return e != null ? ResponseEntity.ok(e) : ResponseEntity.notFound().build();
    }

    // CREAR NUEVO EMPLEADO - LIMPIA CACHÉ
    @PostMapping
    @CacheEvict(value = "empleados", allEntries = true)
    public Empleado create(@RequestBody Empleado e) {
        System.out.println("✅ Nuevo empleado creado - Caché de empleados limpiada");
        return service.save(e);
    }

    // ACTUALIZAR EMPLEADO - LIMPIA CACHÉ
    @PutMapping("/{id}")
    @CacheEvict(value = "empleados", allEntries = true)
    public ResponseEntity<Empleado> update(@PathVariable Long id, @RequestBody Empleado e) {
        if (!service.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        e.setId(id);
        Empleado actualizado = service.save(e);
        System.out.println("✏️ Empleado actualizado - Caché de empleados limpiada");
        return ResponseEntity.ok(actualizado);
    }

    // ELIMINAR EMPLEADO - LIMPIA CACHÉ
    @DeleteMapping("/{id}")
    @CacheEvict(value = "empleados", allEntries = true)
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!service.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        service.deleteById(id);
        System.out.println("🗑️ Empleado eliminado - Caché de empleados limpiada");
        return ResponseEntity.ok().build();
    }
}