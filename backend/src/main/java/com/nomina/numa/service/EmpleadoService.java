// src/main/java/com/nomina/numa/service/EmpleadoService.java
package com.nomina.numa.service;

import com.nomina.numa.model.postgres.Empleado;
import com.nomina.numa.repository.jpa.EmpleadoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class EmpleadoService {

    private final EmpleadoRepository repo;

    public List<Empleado> findAll() {
        return repo.findAll();
    }

    public List<Empleado> findActivos() {
        return repo.findByEstado("ACTIVO");
    }

    public Empleado findById(Long id) {
        return repo.findById(id).orElse(null);
    }

    public Empleado save(Empleado e) {
        return repo.save(e);
    }

    public void deleteById(Long id) {
        repo.deleteById(id);
    }

    // MÉTODO AUXILIAR PARA VERIFICAR SI EXISTE
    public boolean existsById(Long id) {
        return repo.existsById(id);
    }
}