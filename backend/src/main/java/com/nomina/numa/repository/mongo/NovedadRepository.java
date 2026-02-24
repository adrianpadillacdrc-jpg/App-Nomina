package com.nomina.numa.repository.mongo;

import com.nomina.numa.model.mongo.Novedad;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface NovedadRepository extends MongoRepository<Novedad, String> {
    List<Novedad> findByIdEmpleado(String idEmpleado);
    List<Novedad> findByPeriodoId(String periodoId);
}