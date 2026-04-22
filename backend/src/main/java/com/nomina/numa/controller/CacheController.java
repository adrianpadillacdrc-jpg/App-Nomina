package com.nomina.numa.controller;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/cache")
@PreAuthorize("hasRole('ADMIN')")
public class CacheController {

    @DeleteMapping("/limpiar")
    @CacheEvict(value = { "periodos", "empleados" }, allEntries = true)
    public ResponseEntity<Map<String, String>> limpiarCache() {
        Map<String, String> response = new HashMap<>();
        response.put("mensaje", "Caché de Redis limpiada exitosamente");
        response.put("timestamp", LocalDateTime.now().toString());
        System.out.println("🗑️ Caché de Redis limpiada manualmente");
        return ResponseEntity.ok(response);
    }
}