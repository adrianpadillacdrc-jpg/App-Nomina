package com.nomina.numa.service;

import com.nomina.numa.model.postgres.Empresa;
import com.nomina.numa.repository.jpa.EmpresaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class EmpresaService {
    private final EmpresaRepository repo;

    public List<Empresa> findAll() {
        return repo.findAll();
    }

    @SuppressWarnings("null")
    public Empresa save(Empresa e) {
        return repo.save(e);
    }

    @SuppressWarnings("null")
    public Optional<Empresa> findById(Long id) {
        return repo.findById(id);
    }
}
