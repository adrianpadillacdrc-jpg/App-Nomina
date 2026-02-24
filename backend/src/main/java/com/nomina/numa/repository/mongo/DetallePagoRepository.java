package com.nomina.numa.repository.mongo;

import org.springframework.data.mongodb.repository.MongoRepository;
import com.nomina.numa.model.mongo.DetallePago;

public interface DetallePagoRepository extends MongoRepository<DetallePago, String> {
}
