package com.nomina.numa.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PagoIndividualRequest {
    private Long empleadoId;
    private Double monto;
    private String metodoPago;      // "TRANSFERENCIA" | "EFECTIVO"
    private String referencia;      // opcional
}
