package com.nomina.numa.controller;

import com.nomina.numa.model.postgres.Sucursal;
import com.nomina.numa.repository.jpa.SucursalRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sucursales")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class SucursalController {

    private final SucursalRepository sucursalRepository;

    @GetMapping
    public List<Sucursal> getAll() {
        return sucursalRepository.findAll();
    }

    @GetMapping("/activas")
    public List<Sucursal> getActivas() {
        return sucursalRepository.findByActivoTrue();
    }

    @GetMapping("/{id}")
    public Sucursal getById(@PathVariable Long id) {
        return sucursalRepository.findById(id).orElse(null);
    }
}
