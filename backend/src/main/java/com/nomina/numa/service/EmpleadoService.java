package com.nomina.numa.service;

import com.nomina.numa.model.postgres.Empleado;
import com.nomina.numa.repository.jpa.EmpleadoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class EmpleadoService {

    private final EmpleadoRepository repository;

    public Page<Empleado> findAll(final Pageable pageable) {
        return repository.findAll(pageable);
    }

    public Page<Empleado> findActivos(final Pageable pageable) {
        return repository.findByEstado("ACTIVO", pageable);
    }

    public List<Empleado> findAllNonPageable() {
        return repository.findAll();
    }

    // ✅ Agregado final para limpiar el subrayado de id
    public Empleado findById(final Long id) {
        return repository.findById(id).orElse(null);
    }

    // ✅ Agregado final para limpiar el subrayado de empleado
    public Empleado save(final Empleado empleado) {
        return repository.save(empleado);
    }

    // ✅ Agregado final para limpiar el subrayado de id
    public void deleteById(final Long id) {
        repository.deleteById(id);
    }

    // ✅ Agregado final para limpiar el subrayado de id
    public boolean existsById(final Long id) {
        return repository.existsById(id);
    }

    public long countByEstado(final String estado) {
        return repository.countByEstado(estado);
    }

    // ✅ Conteo insensible a mayúsculas/minúsculas (una sola query en vez de 2-4)
    public long countByEstadoIgnoreCase(final String estado) {
        return repository.countByEstadoIgnoreCase(estado);
    }
}