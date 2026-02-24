package com.nomina.numa.model.mongo;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;

@Document(collection = "contratacion")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Contratacion {
    @Id
    private String id;

    private Long idEmpleado;
    private String idTipoContrato;
    private LocalDate fechaInicio;
    private LocalDate fechaFin;

    @Builder.Default
    private String estado = "VIGENTE"; // VIGENTE, TERMINADO
}