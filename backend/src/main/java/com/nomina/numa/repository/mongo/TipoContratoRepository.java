package com.nomina.numa.repository.mongo;

import org.springframework.data.mongodb.repository.MongoRepository;
import com.nomina.numa.model.mongo.TipoContrato;

public interface TipoContratoRepository extends MongoRepository<TipoContrato, String> {}