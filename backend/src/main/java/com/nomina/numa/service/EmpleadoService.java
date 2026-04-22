package com.nomina.numa.service;

import com.nomina.numa.model.postgres.Empleado;
import com.nomina.numa.repository.jpa.EmpleadoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class EmpleadoService {

    private final EmpleadoRepository repository;

    public List<Empleado> findAll() {
        return repository.findAll();
    }

    public List<Empleado> findActivos() {
        return repository.findByEstado("ACTIVO");
    }

    public Empleado findById(Long id) {
        return repository.findById(id).orElse(null);
    }

    public Empleado save(Empleado empleado) {
        return repository.save(empleado);
    }

    public void deleteById(Long id) {
        repository.deleteById(id);
    }

    public boolean existsById(Long id) {
        return repository.existsById(id);
    }

    // ✅ NUEVO MÉTODO: Contar empleados por estado
    public long countByEstado(String estado) {
        return repository.countByEstado(estado);
    }
}