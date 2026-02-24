package com.nomina.numa.controller;

import com.nomina.numa.model.mongo.Venta;
import com.nomina.numa.service.VentaService;
import lombok.RequiredArgsConstructor;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ventas")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
public class VentaController {
    private final VentaService service;

    @GetMapping("/empleado/{id}")
    public List<Venta> getByEmpleado(@PathVariable Long id) {
        return service.findByEmpleado(id);
    }

    @PostMapping
    public Venta create(@RequestBody Venta v) { return service.save(v); }
}