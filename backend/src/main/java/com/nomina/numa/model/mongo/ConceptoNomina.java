package com.nomina.numa.model.mongo;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "concepto_nomina")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ConceptoNomina {
    @Id
    private String id;

    private String nombreConcepto;
    private String tipoConcepto; // DEVENGADO / DEDUCCION

    @Builder.Default
    private Boolean activo = true;
}
