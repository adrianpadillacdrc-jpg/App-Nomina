package com.nomina.numa.repository.mongo;

import org.springframework.data.mongodb.repository.MongoRepository;
import com.nomina.numa.model.mongo.Contratacion;
import java.util.List;

public interface ContratacionRepository extends MongoRepository<Contratacion, String> {
    List<Contratacion> findByIdEmpleado(Long idEmpleado);
}