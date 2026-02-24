package com.nomina.numa.service;

import com.nomina.numa.model.postgres.Cargo;
import com.nomina.numa.repository.jpa.CargoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CargoService {
    private final CargoRepository repo;
    public List<Cargo> findAll() { return repo.findAll(); }
    @SuppressWarnings("null")
    public Cargo save(Cargo c) { return repo.save(c); }
}