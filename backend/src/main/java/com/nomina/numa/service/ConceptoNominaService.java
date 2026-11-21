package com.nomina.numa.service;

import com.nomina.numa.model.postgres.ConceptoNomina;
import com.nomina.numa.repository.jpa.ConceptoNominaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ConceptoNominaService {
    private final ConceptoNominaRepository repo;
    public List<ConceptoNomina> findAll() { return repo.findAll(); }
    @SuppressWarnings("null")
    public ConceptoNomina save(ConceptoNomina c) { return repo.save(c); }
}
