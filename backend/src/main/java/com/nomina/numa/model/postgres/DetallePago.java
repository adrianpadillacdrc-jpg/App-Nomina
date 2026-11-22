package com.nomina.numa.model.postgres;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "detalle_pago")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DetallePago {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String idPagoNomina;
    private Long idEmpleado;
    private String tipoConcepto;
    private String nombreConcepto;
    private String valorRecibido;

    @Builder.Default
    private Double valor = 0.0;
}
