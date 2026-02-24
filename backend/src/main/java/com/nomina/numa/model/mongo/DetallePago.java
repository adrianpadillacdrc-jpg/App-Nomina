package com.nomina.numa.model.mongo;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "detalle_pago")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DetallePago {
    @Id
    private String id;

    private String idPagoNomina;
    private Long idEmpleado;
    private String tipoConcepto;
    private String nombreConcepto;
    private String valorRecibido;

    @Builder.Default
    private Double valor = 0.0;
}