package com.nomina.numa.service;

import com.nomina.numa.model.mongo.DetallePago;
import com.nomina.numa.repository.mongo.DetallePagoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DetallePagoService {
    private final DetallePagoRepository repo;

    public List<DetallePago> findByPagoNomina(String idPagoNomina) {
        return repo.findAll().stream()
                .filter(d -> d.getIdPagoNomina().equals(idPagoNomina))
                .toList();
    }

    @SuppressWarnings("null")
    public DetallePago save(DetallePago d) {
        return repo.save(d);
    }

    @SuppressWarnings("null")
    public List<DetallePago> saveAll(List<DetallePago> detalles) {
        return repo.saveAll(detalles);
    }
}