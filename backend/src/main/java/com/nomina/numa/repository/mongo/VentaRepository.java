package com.nomina.numa.repository.mongo;

import org.springframework.data.mongodb.repository.MongoRepository;
import com.nomina.numa.model.mongo.Venta;

public interface VentaRepository extends MongoRepository<Venta, String> {}