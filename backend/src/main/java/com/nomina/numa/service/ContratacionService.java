package com.nomina.numa.service;

import com.nomina.numa.model.mongo.Contratacion;
import com.nomina.numa.repository.mongo.ContratacionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ContratacionService {
    private final ContratacionRepository repo;

    public List<Contratacion> findByEmpleado(Long idEmpleado) {
        return repo.findByIdEmpleado(idEmpleado);
    }

    public List<Contratacion> findAll() {
        return repo.findAll();
    }

    public Contratacion save(Contratacion contratacion) {
        // Establecer estado por defecto si no viene
        if (contratacion.getEstado() == null) {
            contratacion.setEstado("VIGENTE");
        }
        return repo.save(contratacion);
    }

    public Contratacion updateEstado(String id, String estado) {
        Optional<Contratacion> contratoOpt = repo.findById(id);
        if (contratoOpt.isPresent()) {
            Contratacion contrato = contratoOpt.get();
            contrato.setEstado(estado);
            return repo.save(contrato);
        }
        throw new RuntimeException("Contrato no encontrado con id: " + id);
    }
}