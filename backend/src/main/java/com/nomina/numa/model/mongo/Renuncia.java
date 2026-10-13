package com.nomina.numa.model.mongo;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Document(collection = "renuncias")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Renuncia {
    @Id
    private String id;

    private Long idEmpleado;
    private String nombreEmpleado;      // nombre + apellido (para la carta)
    private String cargoEmpleado;
    private String motivo;
    private String contenidoCarta;      // texto completo de la carta autogenerada

    @Builder.Default
    private String estado = "ENVIADA";  // ENVIADA, RETIRADA, ACEPTADA

    private LocalDate fechaEnvio;
    private LocalDate fechaAceptacion;
    private Double liquidacionEstimada;

    // ✅ Estado del pago de la liquidación
    @Builder.Default
    private String estadoPago = "PENDIENTE";  // PENDIENTE, PAGADO
    private LocalDate fechaPago;

    // PDF adjunto de la carta de renuncia
    private String nombrePdf;     // nombre original del archivo
    private String pdfBase64;     // contenido del PDF en Base64

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
