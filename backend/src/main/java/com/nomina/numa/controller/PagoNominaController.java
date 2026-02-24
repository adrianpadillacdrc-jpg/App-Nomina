// backend/src/main/java/com/nomina/numa/controller/PagoNominaController.java
package com.nomina.numa.controller;

import com.nomina.numa.model.mongo.PagoNomina;
import com.nomina.numa.service.PagoNominaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pagos-nomina")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
public class PagoNominaController {
    private final PagoNominaService service;

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

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id) {
        service.deleteById(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping
    public ResponseEntity<String> pagar(@RequestBody Map<String, Object> payload) {
        System.out.println("NÓMINA PAGADA: " + payload);
        return ResponseEntity.ok("¡Nómina procesada con éxito!");
    }
}