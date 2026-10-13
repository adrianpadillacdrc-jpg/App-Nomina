package com.nomina.numa.controller;

import com.nomina.numa.model.postgres.Empleado;
import com.nomina.numa.service.EmpleadoService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/empleados")
@RequiredArgsConstructor
public class EmpleadoController {

    private final EmpleadoService empleadoService;
    @Value("${nomina.salario-minimo-2026:1750905}")
    private long salarioMinimo;

    @GetMapping
    public ResponseEntity<Page<Empleado>> getEmpleados(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Pageable pageable = PageRequest.of(page, size);
        Page<Empleado> empleadosPage = empleadoService.findAll(pageable);

        return ResponseEntity.ok(empleadosPage);
    }

    // ✅ Buscar un empleado por ID (usado por las alertas del sidebar)
    @GetMapping("/{id}")
    public ResponseEntity<Empleado> getEmpleadoPorId(@PathVariable Long id) {
        Empleado empleado = empleadoService.findById(id);
        if (empleado == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(empleado);
    }

    // ✅ Endpoint para guardar un nuevo empleado desde el formulario de registro
    @PostMapping
    public ResponseEntity<?> crearEmpleado(@RequestBody Empleado empleado) {
        ResponseEntity<?> validacion = validarNomina(empleado);
        if (validacion != null) return validacion;
        // Forzar id a null para garantizar creación y nunca sobreescribir otro registro
        empleado.setId(null);
        Empleado nuevoEmpleado = empleadoService.save(empleado);
        return ResponseEntity.status(HttpStatus.CREATED).body(nuevoEmpleado);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> actualizarEmpleado(@PathVariable Long id, @RequestBody Empleado datos) {
        Empleado empleado = empleadoService.findById(id);
        if (empleado == null) return ResponseEntity.notFound().build();
        if (datos.getSalarioBase() != null && datos.getSalarioBase() < salarioMinimo) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "El salario mensual no puede ser inferior al mínimo configurado de " + salarioMinimo));
        }
        if (datos.getTasaArl() != null && (datos.getTasaArl() <= 0 || datos.getTasaArl() > 100)) {
            return ResponseEntity.badRequest().body(Map.of("error", "La tasa ARL debe ser un porcentaje entre 0 y 100"));
        }

        // Solo sobreescribir campos que realmente llegaron con valor (evita poner NULL en campos válidos)
        if (datos.getNombre() != null) empleado.setNombre(datos.getNombre());
        if (datos.getApellido() != null) empleado.setApellido(datos.getApellido());
        if (datos.getCargo() != null) empleado.setCargo(datos.getCargo());
        if (datos.getSalarioBase() != null) empleado.setSalarioBase(datos.getSalarioBase());
        if (datos.getTasaArl() != null) empleado.setTasaArl(datos.getTasaArl());
        if (datos.getModalidadTrabajo() != null) empleado.setModalidadTrabajo(datos.getModalidadTrabajo());
        if (datos.getTransporteSuministrado() != null) {
            empleado.setTransporteSuministrado(datos.getTransporteSuministrado());
        }
        if (datos.getEstado() != null) empleado.setEstado(datos.getEstado());
        if (datos.getFechaFinContrato() != null) empleado.setFechaFinContrato(datos.getFechaFinContrato());
        return ResponseEntity.ok(empleadoService.save(empleado));
    }

    private ResponseEntity<?> validarNomina(Empleado empleado) {
        if (empleado.getSalarioBase() == null || empleado.getSalarioBase() < salarioMinimo) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "El salario mensual no puede ser inferior al mínimo configurado de " + salarioMinimo));
        }
        if (empleado.getTasaArl() == null || empleado.getTasaArl() <= 0 || empleado.getTasaArl() > 100) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Indique la tasa ARL asignada al empleado (porcentaje entre 0 y 100)"));
        }
        return null;
    }

    // ✅ Endpoint para traer el total exacto de toda la base de datos (una sola query por estado)
    @GetMapping("/estadisticas")
    public ResponseEntity<Map<String, Long>> getEstadisticas() {
        Map<String, Long> stats = new HashMap<>();
        stats.put("activos", empleadoService.countByEstadoIgnoreCase("Activo"));
        stats.put("inactivos", empleadoService.countByEstadoIgnoreCase("Inactivo"));
        return ResponseEntity.ok(stats);
    }
}