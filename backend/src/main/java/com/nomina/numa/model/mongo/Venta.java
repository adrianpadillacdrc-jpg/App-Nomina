package com.nomina.numa.model.mongo;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;

@Document(collection = "ventas")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Venta {
    @Id
    private String id;

    private Long idEmpleado;
    private LocalDate fechaVenta;
    private Double totalVenta;
    private String detalle;

    @Builder.Default
    private String estado = "REGISTRADA";
}