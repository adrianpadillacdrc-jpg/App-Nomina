package com.nomina.numa.model.mongo;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Document(collection = "periodonomina")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PeriodoNomina {
    
    @Id
    private String id;
    
    @Field("fechaInicio")
    private String fechaInicio;
    
    @Field("fechaFin")
    private String fechaFin;
    
    private String description;
    
    private String estado;
    
    private Integer anio;
    
    private String tipo;
    
    private Double costoMillones;
    
    private Double costoCOP;
    
    // Método helper para obtener descripción formateada
    public String getDescription() {
        if (description != null && !description.isEmpty()) {
            return description;
        }
        return "Período sin descripción";
    }
    
    // Método para validar si el período está activo
    public boolean isActivo() {
        return "ABIERTO".equalsIgnoreCase(estado);
    }
}