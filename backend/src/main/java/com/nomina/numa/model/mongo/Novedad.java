// src/main/java/com/nomina/numa/model/mongo/Novedad.java
package com.nomina.numa.model.mongo;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;

@Document(collection = "novedades")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Novedad {
    @Id
    private String id;
    private String periodoId;
    private Long idEmpleado;
    private String tipoNovedad;
    private LocalDate fechaInicio;
    private LocalDate fechaFin;
    private Integer horas;   
    private Double valor;    
    private String observaciones;
    @Builder.Default
    private String estado = "PENDIENTE";
}