package com.nomina.numa.service;

import com.nomina.numa.model.mongo.Rol;
import com.nomina.numa.repository.mongo.RolRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RolService {
    private final RolRepository repo;
    public List<Rol> findAll() { return repo.findAll(); }
    @SuppressWarnings("null")
    public Rol save(Rol r) { return repo.save(r); }
}
