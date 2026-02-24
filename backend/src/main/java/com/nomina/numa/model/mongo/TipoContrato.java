package com.nomina.numa.model.mongo;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "tipo_contrato")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class TipoContrato {
    @Id
    private String id;

    private String tipoContrato; // FIJO, INDEFINIDO, APRENDIZAJE
    private String descripcion;

    @Builder.Default
    private Boolean activo = true;
}