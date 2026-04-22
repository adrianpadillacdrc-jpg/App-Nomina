package com.nomina.numa.controller;

import com.nomina.numa.model.mongo.Contratacion;
import com.nomina.numa.service.ContratacionService;
import com.nomina.numa.service.ContratacionDirectService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.Document;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.ZoneId;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/contrataciones")
@PreAuthorize("hasAnyRole('ADMIN', 'EMPLEADO')")
@RequiredArgsConstructor
public class ContratacionController {
    private final ContratacionService service;
    private final ContratacionDirectService directService;

    @GetMapping("/empleado/{idEmpleado}")
    public List<Contratacion> getByEmpleado(@PathVariable Long idEmpleado) {  // ← Cambiar a Long
        return service.findByEmpleado(idEmpleado);
    }

    @PostMapping
    public Contratacion create(@RequestBody Contratacion contratacion) {
        return service.save(contratacion);
    }

    @GetMapping
    public List<Contratacion> getAll() {
        log.info("GET /api/contrataciones - Iniciando");
        List<Document> docs = directService.findAllAsDocuments();
        log.info("Documentos obtenidos: {}", docs.size());
        
        List<Contratacion> contratos = docs.stream().map(doc -> {
            Contratacion c = new Contratacion();
            c.setId(doc.getObjectId("_id").toString());
            c.setIdEmpleado(doc.getLong("idEmpleado"));  // ← Cambiar a getLong
            c.setIdTipoContrato(doc.getString("idTipoContrato"));
            
            if (doc.getDate("fechaInicio") != null) {
                c.setFechaInicio(doc.getDate("fechaInicio").toInstant()
                    .atZone(ZoneId.systemDefault()).toLocalDate());
            }
            if (doc.getDate("fechaFin") != null) {
                c.setFechaFin(doc.getDate("fechaFin").toInstant()
                    .atZone(ZoneId.systemDefault()).toLocalDate());
            }
            
            c.setEstado(doc.getString("estado"));
            return c;
        }).collect(Collectors.toList());
        
        log.info("Contratos convertidos: {}", contratos.size());
        return contratos;
    }

    @PostMapping("/{id}/estado")
    public Contratacion updateEstado(@PathVariable String id, @RequestBody String estado) {
        return service.updateEstado(id, estado);
    }
}