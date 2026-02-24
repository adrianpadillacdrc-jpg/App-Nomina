package com.nomina.numa.service;

import com.nomina.numa.model.mongo.Venta;
import com.nomina.numa.repository.mongo.VentaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class VentaService {
    private final VentaRepository repo;

    public List<Venta> findAll() {
        return repo.findAll();
    }

    public List<Venta> findByEmpleado(Long idEmpleado) {
        return repo.findAll().stream()
                .filter(v -> v.getIdEmpleado().equals(idEmpleado))
                .toList();
    }

    @SuppressWarnings("null")
    public Venta save(Venta v) {
        return repo.save(v);
    }
}