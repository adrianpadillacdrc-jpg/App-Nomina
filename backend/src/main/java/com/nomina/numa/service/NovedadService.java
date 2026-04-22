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

    public List<Novedad> findByEmpleadoId(Long empleadoId) {
        return repository.findByIdEmpleado(empleadoId);
    }

    public List<Novedad> findByCedula(String cedula) { // ← NUEVO
        return repository.findByCedula(cedula);
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

    public List<Novedad> findByEmpleado(Long id) {
        return repository.findByIdEmpleado(id);
    }
}