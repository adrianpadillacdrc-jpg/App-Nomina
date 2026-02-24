package com.nomina.numa.repository.mongo;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.nomina.numa.model.mongo.ConceptoNomina;

public interface ConceptoNominaRepository extends MongoRepository<ConceptoNomina, String> {
}