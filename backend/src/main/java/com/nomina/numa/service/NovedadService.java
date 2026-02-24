// src/main/java/com/nomina/numa/service/NovedadService.java
package com.nomina.numa.service;

import com.nomina.numa.model.mongo.Novedad;
import com.nomina.numa.repository.mongo.NovedadRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;


@Service
@RequiredArgsConstructor
public class NovedadService {

    private final NovedadRepository repository;

    // PARA EL ENDPOINT QUE USA EL FRONTEND
    public List<Novedad> findByEmpleadoId(String empleadoId) {
        return repository.findByIdEmpleado(empleadoId); // ← Asegúrate que el repo tenga este método
    }

    public List<Novedad> findByPeriodoId(String periodoId) {
        return repository.findByPeriodoId(periodoId);
    }

    public Novedad save(Novedad novedad) {
        return repository.save(novedad);
    }

    public List<Novedad> findAll() {
        return repository.findAll();
    }

    // Puedes dejar este si lo usas en otro lado
    public List<Novedad> findByEmpleado(Long id) {
        return repository.findByIdEmpleado(id.toString());
    }
}