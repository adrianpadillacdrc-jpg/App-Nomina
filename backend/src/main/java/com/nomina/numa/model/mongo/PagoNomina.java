package com.nomina.numa.model.mongo;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;

@Document(collection = "pago_nomina")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class PagoNomina {
    @Id
    private String id;

    private String idNomina;
    private LocalDate fechaPago;
    private String metodoPago;

    private Long idEmpleado;
    private String nombreEmpleado;

    @Builder.Default
    private Double totalDevengado = 0.0;

    @Builder.Default
    private Double totalDeducciones = 0.0;

    @Builder.Default
    private Double totalPagar = 0.0;

    @Builder.Default
    private String estado = "PENDIENTE"; // PENDIENTE, PAGADO, ANULADO
}