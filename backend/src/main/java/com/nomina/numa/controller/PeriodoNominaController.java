package com.nomina.numa.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.nomina.numa.model.mongo.PeriodoNomina;
import com.nomina.numa.repository.mongo.PeriodoNominaRepository;
import com.nomina.numa.service.PrediccionNominaService;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/periodo-nomina")
@RequiredArgsConstructor
public class PeriodoNominaController {

    private final PeriodoNominaRepository repo;
    private final PrediccionNominaService prediccionService;

    // Endpoint de prueba para verificar que el controlador funciona
    @GetMapping("/test")
    public ResponseEntity<Map<String, String>> test() {
        System.out.println("🚀 TEST ENDPOINT FUNCIONA");
        Map<String, String> response = new HashMap<>();
        response.put("mensaje", "El backend está funcionando correctamente");
        response.put("timestamp", LocalDate.now().toString());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/actual")
    public ResponseEntity<PeriodoNomina> getActual(Authentication auth) {
        System.out.println("=== DEBUG PERIODO-NOMINA /actual ===");
        System.out.println("Usuario autenticado: " + (auth != null ? auth.getName() : "null"));

        Optional<PeriodoNomina> periodo = repo.findTopByEstadoOrderByFechaInicioDesc("ABIERTO");

        if (periodo.isPresent()) {
            System.out.println("✅ Período encontrado - ID: " + periodo.get().getId());
        } else {
            System.out.println("❌ No hay período abierto");
        }

        return periodo.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/actual-con-costo")
    public ResponseEntity<?> getActualConCosto(Authentication auth) {
        Optional<PeriodoNomina> periodo = repo.findTopByEstadoOrderByFechaInicioDesc("ABIERTO");

        if (periodo.isPresent()) {
            PeriodoNomina p = periodo.get();
            Map<String, Object> response = new HashMap<>();
            response.put("quincena", p.getTipo() != null ? p.getTipo() : "1ra");
            response.put("mes", obtenerMes(p.getFechaInicio()));
            response.put("anio", p.getAnio());
            response.put("costoMillones", p.getCostoMillones() != null ? p.getCostoMillones() : 12294.24);
            response.put("costoCOP", p.getCostoCOP() != null ? p.getCostoCOP() : 12294241266L);
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.notFound().build();
    }

    // ✅ Endpoint para obtener todos los períodos (sin caché para evitar errores de
    // serialización)
    @GetMapping("/todos")
    public ResponseEntity<List<PeriodoNomina>> getTodosLosPeriodos(Authentication auth) {
        System.out.println("🚀 ENTRÓ AL MÉTODO getTodosLosPeriodos");
        System.out.println("📡 Consultando MongoDB");
        try {
            List<PeriodoNomina> periodos = repo.findAllByOrderByFechaInicioDesc();
            System.out.println("✅ Total períodos encontrados: " + periodos.size());
            return ResponseEntity.ok(periodos);
        } catch (Exception e) {
            System.err.println("❌ Error al consultar períodos: " + e.getMessage());
            return ResponseEntity.status(500).body(null);
        }
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @CacheEvict(value = "periodos", allEntries = true)
    public ResponseEntity<PeriodoNomina> crear(@RequestBody PeriodoNomina nuevo, Authentication auth) {
        System.out.println("=== CREAR NUEVO PERÍODO ===");
        System.out.println("Usuario: " + auth.getName());
        System.out.println("🗑️ Caché de períodos limpiada");

        repo.findTopByEstadoOrderByFechaInicioDesc("ABIERTO")
                .ifPresent(anterior -> {
                    System.out.println("Cerrando período anterior: " + anterior.getId());
                    anterior.setEstado("CERRADO");
                    repo.save(anterior);
                });

        nuevo.setEstado("ABIERTO");
        PeriodoNomina guardado = repo.save(nuevo);
        System.out.println("✅ Nuevo período creado: " + guardado.getId());
        return ResponseEntity.ok(guardado);
    }

    @PatchMapping("/cerrar-actual")
    @PreAuthorize("hasRole('ADMIN')")
    @CacheEvict(value = "periodos", allEntries = true)
    public ResponseEntity<String> cerrarPeriodoActual(Authentication auth) {
        System.out.println("=== CERRAR PERÍODO ACTUAL ===");
        System.out.println("Usuario: " + auth.getName());
        System.out.println("🗑️ Caché de períodos limpiada");

        Optional<PeriodoNomina> actual = repo.findTopByEstadoOrderByFechaInicioDesc("ABIERTO");
        if (actual.isPresent()) {
            PeriodoNomina p = actual.get();
            p.setEstado("CERRADO");
            repo.save(p);
            System.out.println("✅ Período cerrado: " + p.getId());
            return ResponseEntity.ok("Período cerrado exitosamente");
        }
        System.out.println("❌ No hay período abierto para cerrar");
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/actualizar-costos")
    @PreAuthorize("hasRole('ADMIN')")
    @CacheEvict(value = "periodos", allEntries = true)
    public ResponseEntity<String> actualizarCostosPeriodos(Authentication auth) {
        System.out.println("=== ACTUALIZAR COSTOS DE PERÍODOS ===");
        System.out.println("Usuario: " + auth.getName());
        System.out.println("🗑️ Caché de períodos limpiada");

        List<PeriodoNomina> periodos = repo.findAll();
        int actualizados = 0;

        double costoMillonesReal = 12294.24;
        double costoCOPReal = 12294241266.0;

        for (PeriodoNomina periodo : periodos) {
            if ("CERRADO".equals(periodo.getEstado())) {
                periodo.setCostoMillones(costoMillonesReal);
                periodo.setCostoCOP(costoCOPReal);
                repo.save(periodo);
                actualizados++;
                System.out.println("✅ " + periodo.getDescription() + ": $" + costoMillonesReal + " millones");
            }
        }

        return ResponseEntity.ok("Actualizados " + actualizados + " períodos con su costo");
    }

    private String obtenerMes(LocalDate fecha) {
        if (fecha == null)
            return "Desconocido";
        String[] meses = { "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre" };
        return meses[fecha.getMonthValue() - 1];
    }
}