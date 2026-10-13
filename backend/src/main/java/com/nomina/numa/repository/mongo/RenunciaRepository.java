package com.nomina.numa.repository.mongo;

import com.nomina.numa.model.mongo.Renuncia;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface RenunciaRepository extends MongoRepository<Renuncia, String> {
    List<Renuncia> findByIdEmpleado(Long idEmpleado);

    // Última renuncia activa (ENVIADA o ACEPTADA); RETIRADA no cuenta
    List<Renuncia> findByIdEmpleadoAndEstadoInOrderByIdDesc(Long idEmpleado, List<String> estados);

    List<Renuncia> findByEstado(String estado);
}
