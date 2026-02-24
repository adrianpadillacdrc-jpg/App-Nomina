package com.nomina.numa.controller;

import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.nomina.numa.model.mongo.Contratacion;
import com.nomina.numa.service.ContratacionService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/contrataciones")
@CrossOrigin(origins = "http://localhost:4200")
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

    // Nuevo endpoint para obtener todos los contratos
    @GetMapping
    public List<Contratacion> getAll() {
        return service.findAll();
    }

    // Nuevo endpoint para actualizar estado
    @PostMapping("/{id}/estado")
    public Contratacion updateEstado(@PathVariable String id, @RequestBody String estado) {
        return service.updateEstado(id, estado);
    }
}