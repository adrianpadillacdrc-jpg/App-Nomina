package com.nomina.numa.service;

import com.nomina.numa.model.mongo.TipoContrato;
import com.nomina.numa.repository.mongo.TipoContratoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TipoContratoService {
    private final TipoContratoRepository repo;
    public List<TipoContrato> findAll() { return repo.findAll(); }
    @SuppressWarnings("null")
    public TipoContrato save(TipoContrato t) { return repo.save(t); }
}