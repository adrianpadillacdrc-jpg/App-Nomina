package com.nomina.numa.controller;

import com.nomina.numa.model.mongo.Novedad;
import com.nomina.numa.service.NovedadService;
import com.nomina.numa.service.NovedadDirectService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.Document;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/novedades")
@PreAuthorize("hasAnyRole('ADMIN', 'EMPLEADO')")
@RequiredArgsConstructor
public class NovedadController {

    private final NovedadService novedadService;
    private final NovedadDirectService directService;

    @GetMapping("/empleado/{empleadoId}")
    public ResponseEntity<List<Novedad>> getPorEmpleado(@PathVariable Long empleadoId) {
        List<Novedad> lista = novedadService.findByEmpleadoId(empleadoId);
        return ResponseEntity.ok(lista);
    }

    @GetMapping("/cedula/{cedula}") // ← NUEVO ENDPOINT
    public ResponseEntity<List<Novedad>> getPorCedula(@PathVariable String cedula) {
        List<Novedad> lista = novedadService.findByCedula(cedula);
        return ResponseEntity.ok(lista);
    }

    @GetMapping("/periodo/{periodoId}")
    public ResponseEntity<List<Novedad>> getByPeriodo(@PathVariable String periodoId) {
        return ResponseEntity.ok(novedadService.findByPeriodoId(periodoId));
    }

    @PostMapping
    public ResponseEntity<Novedad> crear(@RequestBody Novedad novedad) {
        log.info("Creando novedad - Tipo: {}, Cédula: {}", novedad.getTipoNovedad(), novedad.getCedula());

        novedad.setEstado("PENDIENTE");
        novedad.setCreatedAt(LocalDateTime.now());
        novedad.setUpdatedAt(LocalDateTime.now());

        return ResponseEntity.ok(novedadService.save(novedad));
    }

    @GetMapping
    public List<Novedad> todas() {
        log.info("GET /api/novedades - Iniciando");
        List<Document> docs = directService.findAllAsDocuments();
        log.info("Documentos obtenidos: {}", docs.size());

        List<Novedad> novedades = docs.stream().map(doc -> {
            Novedad n = new Novedad();
            n.setId(doc.getObjectId("_id").toString());
            n.setPeriodoId(doc.getString("periodoId"));
            n.setIdEmpleado(doc.getLong("idEmpleado"));
            n.setCedula(doc.getString("cedula")); // ← NUEVO
            n.setTipoNovedad(doc.getString("tipoNovedad"));
            n.setHoraInicio(doc.getString("horaInicio")); // ← NUEVO
            n.setHoraFin(doc.getString("horaFin")); // ← NUEVO
            n.setValorHora(doc.getDouble("valorHora")); // ← NUEVO
            n.setTipoHora(doc.getString("tipoHora")); // ← NUEVO
            n.setMonto(doc.getDouble("monto")); // ← NUEVO
            n.setConcepto(doc.getString("concepto")); // ← NUEVO
            n.setMotivo(doc.getString("motivo")); // ← NUEVO

            if (doc.getDate("fechaInicio") != null) {
                n.setFechaInicio(doc.getDate("fechaInicio").toInstant()
                        .atZone(ZoneId.systemDefault()).toLocalDate());
            }
            if (doc.getDate("fechaFin") != null) {
                n.setFechaFin(doc.getDate("fechaFin").toInstant()
                        .atZone(ZoneId.systemDefault()).toLocalDate());
            }

            n.setHoras(doc.getInteger("horas"));
            n.setValor(doc.getDouble("valor"));
            n.setObservaciones(doc.getString("observaciones"));
            n.setEstado(doc.getString("estado"));
            return n;
        }).collect(Collectors.toList());

        log.info("Novedades convertidas: {}", novedades.size());
        return novedades;
    }
}