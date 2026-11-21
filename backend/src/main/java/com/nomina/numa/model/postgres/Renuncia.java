package com.nomina.numa.model.postgres;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "renuncias")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Renuncia {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long idEmpleado;
    private String nombreEmpleado; // nombre + apellido (para la carta)
    private String cargoEmpleado;
    private String motivo;
    @Column(columnDefinition = "TEXT")
    private String contenidoCarta;

    @Builder.Default
    private String estado = "ENVIADA"; // ENVIADA, RETIRADA, ACEPTADA

    private LocalDate fechaEnvio;
    private LocalDate fechaAceptacion;
    private Double liquidacionEstimada;

    // ✅ Estado del pago de la liquidación
    @Builder.Default
    private String estadoPago = "PENDIENTE"; // PENDIENTE, PAGADO
    private LocalDate fechaPago;

    // PDF adjunto de la carta de renuncia
    private String nombrePdf; // nombre original del archivo
    @Column(columnDefinition = "TEXT")
    private String pdfBase64;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
