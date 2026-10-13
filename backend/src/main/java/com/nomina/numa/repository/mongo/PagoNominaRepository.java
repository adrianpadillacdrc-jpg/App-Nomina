package com.nomina.numa.repository.mongo;

import org.springframework.data.mongodb.repository.MongoRepository;
import com.nomina.numa.model.mongo.PagoNomina;
import java.util.List;

public interface PagoNominaRepository extends MongoRepository<PagoNomina, String> {
	List<PagoNomina> findByIdNominaAndIdEmpleadoIsNotNull(String idNomina);
	List<PagoNomina> findByIdNominaAndIdEmpleadoIsNull(String idNomina);
	List<PagoNomina> findByIdEmpleadoOrderByFechaPagoDesc(Long idEmpleado);
}