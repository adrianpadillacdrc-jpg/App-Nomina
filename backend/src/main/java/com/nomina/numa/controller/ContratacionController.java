package com.nomina.numa.controller;

import com.nomina.numa.model.postgres.Contratacion;
import com.nomina.numa.service.ContratacionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/contrataciones")
@RequiredArgsConstructor
public class ContratacionController {
    private final ContratacionService service;

    @GetMapping("/empleado/{idEmpleado}")
    public List<Contratacion> getByEmpleado(@PathVariable Long idEmpleado) {
        return service.findByEmpleado(idEmpleado);
    }

    @PostMapping
    public Contratacion create(@RequestBody Contratacion contratacion) {
        return service.save(contratacion);
    }

    @GetMapping
    public List<Contratacion> getAll() {
        log.info("GET /api/contrataciones - Iniciando");
        List<Contratacion> contratos = service.findAll();
        log.info("Contratos recuperados: {}", contratos.size());
        return contratos;
    }

    @PostMapping("/{id}/estado")
    public Contratacion updateEstado(@PathVariable Long id, @RequestBody String estado) {
        return service.updateEstado(id, estado);
    }

    @PostMapping("/{id}/firma-empleado")
    public Contratacion guardarFirmaEmpleado(@PathVariable Long id, @RequestBody java.util.Map<String, String> body) {
        String firma = body.get("firma");
        return service.guardarFirmaEmpleado(id, firma);
    }

    @PostMapping("/{id}/firma-empleador")
    public Contratacion guardarFirmaEmpleador(@PathVariable Long id, @RequestBody java.util.Map<String, String> body) {
        String firma = body.get("firma");
        return service.guardarFirmaEmpleador(id, firma);
    }

    @PostMapping("/{id}/solicitar-codigo-firma")
    public ResponseEntity<?> solicitarCodigoFirma(@PathVariable Long id) {
        try {
            log.info("Solicitando código de firma para contrato id: {}", id);
            Map<String, Object> resultado = service.solicitarCodigoFirma(id);
            return ResponseEntity.ok(resultado);
        } catch (Exception e) {
            log.error("Error al solicitar código de firma para contrato {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/verificar-codigo-firma")
    public ResponseEntity<?> verificarCodigoFirma(@PathVariable Long id, @RequestBody Map<String, String> body) {
        try {
            String codigo = body.get("codigo");
            String firma = body.get("firma");
            log.info("Verificando código de firma para contrato id: {}", id);
            Contratacion contratacion = service.verificarYFirmarContrato(id, codigo, firma);
            return ResponseEntity.ok(contratacion);
        } catch (Exception e) {
            log.error("Error al verificar código de firma para contrato {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
