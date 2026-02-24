package com.nomina.numa.controller;

import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.nomina.numa.model.mongo.DetallePago;
import com.nomina.numa.service.DetallePagoService;

import io.swagger.v3.oas.annotations.parameters.RequestBody;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/detalles-pago")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
public class DetallePagoController {
    private final DetallePagoService service;

    @GetMapping("/pago/{idPago}")
    public List<DetallePago> getByPago(@PathVariable String idPago) {
        return service.findByPagoNomina(idPago);
    }

    @PostMapping
    public DetallePago create(@RequestBody DetallePago d) { return service.save(d); }
}