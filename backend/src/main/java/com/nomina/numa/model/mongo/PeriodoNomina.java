package com.nomina.numa.model.mongo;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;

@Document(collection = "periodonomina")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PeriodoNomina {
    @Id
    private String id;
    private LocalDate fechaInicio;
    private LocalDate fechaFin;
    private String description;
    private String estado; // "CERRADO", "ABIERTO", "PENDIENTE"
    private Integer anio;
    private String tipo; // "QUINCENAL"

    // ✅ NUEVO CAMPO
    private Double costoMillones; // Costo de nómina en millones COP
    private Double costoCOP; // Costo de nómina en COP
}