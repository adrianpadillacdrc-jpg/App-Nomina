package com.nomina.numa.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.nomina.numa.model.mongo.PeriodoNomina;
import com.nomina.numa.repository.mongo.PeriodoNominaRepository;

import java.util.*;

@RestController
@RequestMapping("/api/periodo-nomina")
@RequiredArgsConstructor
public class PeriodoNominaController {

    private final PeriodoNominaRepository repo;

    @GetMapping("/diagnostico")
    public ResponseEntity<Map<String, Object>> diagnosticar() {
        System.out.println("=== DIAGNÓSTICO DE MONGODB ===");
        Map<String, Object> diag = new HashMap<>();
        try {
            long count = repo.count();
            diag.put("totalDocumentos_count", count);

            List<PeriodoNomina> todos = repo.findAll();
            diag.put("totalDocumentos_findAll", todos.size());

            List<PeriodoNomina> ordenados = repo.findAllByOrderByFechaInicioDesc();
            diag.put("totalDocumentos_ordenados", ordenados.size());

            List<Map<String, Object>> documentos = new ArrayList<>();
            for (PeriodoNomina p : todos) {
                Map<String, Object> doc = new HashMap<>();
                doc.put("id", p.getId());
                doc.put("description", p.getDescription());
                doc.put("estado", p.getEstado());
                doc.put("fechaInicio", p.getFechaInicio() != null ? p.getFechaInicio().toString() : null);
                doc.put("fechaFin", p.getFechaFin() != null ? p.getFechaFin().toString() : null);
                doc.put("anio", p.getAnio());
                doc.put("tipo", p.getTipo());
                documentos.add(doc);
            }
            diag.put("documentos", documentos);

            Optional<PeriodoNomina> abierto = repo.findTopByEstadoOrderByFechaInicioDesc("ABIERTO");
            diag.put("tienePeriodoActivo", abierto.isPresent());

            if (abierto.isPresent()) {
                diag.put("periodoActivoId", abierto.get().getId());
                diag.put("periodoActivoDesc", abierto.get().getDescription());
            }
            diag.put("exito", true);
        } catch (Exception e) {
            diag.put("exito", false);
            diag.put("error", e.getMessage());
            diag.put("error_tipo", e.getClass().getSimpleName());
        }
        return ResponseEntity.ok(diag);
    }

    @GetMapping("/actual")
    public ResponseEntity<PeriodoNomina> getActual(Authentication auth) {
        System.out.println("=== GET /actual ===");
        try {
            Optional<PeriodoNomina> periodo = repo.findTopByEstadoOrderByFechaInicioDesc("ABIERTO");
            if (periodo.isPresent()) {
                return ResponseEntity.ok(periodo.get());
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/actual-con-costo")
    public ResponseEntity<?> getActualConCosto(Authentication auth) {
        System.out.println("=== GET /actual-con-costo ===");
        try {
            Optional<PeriodoNomina> periodo = repo.findTopByEstadoOrderByFechaInicioDesc("ABIERTO");
            if (periodo.isPresent()) {
                PeriodoNomina p = periodo.get();
                Map<String, Object> response = new HashMap<>();
                response.put("quincena", p.getTipo());

                String mes = "";
                if (p.getFechaInicio() != null) {
                    String[] meses = {"Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"};
                    mes = meses[p.getFechaInicio().getMonthValue() - 1];
                }
                response.put("mes", mes);
                response.put("anio", p.getAnio() != null
                        ? p.getAnio()
                        : p.getFechaInicio() != null ? p.getFechaInicio().getYear() : null);
                response.put("costoMillones", p.getCostoMillones());
                response.put("costoCOP", p.getCostoCOP());
                response.put("costoEstimado", p.getCostoEstimado());
                response.put("origenCosto", p.getOrigenCosto());
                response.put("description", p.getDescription());
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/todos")
    public ResponseEntity<List<PeriodoNomina>> getTodosLosPeriodos(Authentication auth) {
        System.out.println("=== GET /todos ===");
        try {
            List<PeriodoNomina> periodos = repo.findAllByOrderByFechaInicioDesc();
            if (periodos.isEmpty()) {
                periodos = repo.findAll();
            }
            return ResponseEntity.ok(periodos);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(null);
        }
    }

    // ✅ CORREGIDO: Se eliminó @PreAuthorize para evitar choques con el SecurityConfig
    @PostMapping
    @CacheEvict(value = "periodos", allEntries = true)
    public ResponseEntity<?> crear(@RequestBody PeriodoNomina nuevo, Authentication auth) {
        System.out.println("=== CREAR NUEVO PERÍODO ===");
        try {
            if (nuevo.getFechaInicio() == null || nuevo.getFechaFin() == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Las fechas son requeridas"));
            }
            repo.findTopByEstadoOrderByFechaInicioDesc("ABIERTO").ifPresent(anterior -> {
                anterior.setEstado("CERRADO");
                repo.save(anterior);
            });
            nuevo.setEstado("ABIERTO");
            if (nuevo.getAnio() == null) {
                nuevo.setAnio(nuevo.getFechaInicio().getYear());
            }
            PeriodoNomina guardado = repo.save(nuevo);
            return ResponseEntity.ok(guardado);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

   @PatchMapping("/cerrar-actual")
    @CacheEvict(value = "periodos", allEntries = true)
    public ResponseEntity<?> cerrarPeriodoActual(Authentication auth) {
        System.out.println("=== CERRAR PERÍODO ACTUAL ===");
        try {
            Optional<PeriodoNomina> actual = repo.findTopByEstadoOrderByFechaInicioDesc("ABIERTO");
            if (actual.isPresent()) {
                PeriodoNomina p = actual.get();
                p.setEstado("CERRADO");
                repo.save(p);
                System.out.println("✅ Período cerrado: " + p.getId());
                return ResponseEntity.ok(Map.of(
                        "mensaje", "Período cerrado exitosamente",
                        "periodo", p));
            }
            
            // ✅ CORRECCIÓN: En lugar de un error 404, devolvemos un 200 OK amigable.
            System.out.println("⚠️ No hay período ABIERTO para cerrar en la BD. Permitiendo continuar...");
            return ResponseEntity.ok(Map.of(
                    "mensaje", "No había periodo activo para cerrar, puedes continuar con la creación."
            ));

        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

}