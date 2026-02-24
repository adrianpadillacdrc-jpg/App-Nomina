package com.nomina.numa.model.mongo;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "roles")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Rol {
    @Id
    private String id;

    private String rol; // ADMIN, EMPLEADO, CONTADOR
    private String descripcion;

    @Builder.Default
    private Boolean activo = true;
}