package com.nomina.numa.repository.mongo;

import org.springframework.data.mongodb.repository.MongoRepository;
import com.nomina.numa.model.mongo.PagoNomina;

public interface PagoNominaRepository extends MongoRepository<PagoNomina, String> {}