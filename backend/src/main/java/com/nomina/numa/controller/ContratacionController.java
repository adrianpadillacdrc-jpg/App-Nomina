package com.nomina.numa.controller;

import com.nomina.numa.model.postgres.Contratacion;
import com.nomina.numa.service.ContratacionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

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
}
