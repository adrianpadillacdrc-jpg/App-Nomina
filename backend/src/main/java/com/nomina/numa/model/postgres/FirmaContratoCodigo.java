package com.nomina.numa.model.postgres;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "firma_contrato_codigo")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FirmaContratoCodigo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "codigo_hash", nullable = false, length = 100)
    private String codigoHash;

    @Column(name = "expira_en", nullable = false)
    private LocalDateTime expiraEn;

    @Column(name = "id_contratacion", nullable = false)
    private Long idContratacion;

    @Column(name = "id_empleado", nullable = false)
    private Long idEmpleado;

    @Column(name = "intentos", nullable = false)
    private Integer intentos;

    @Column(name = "correo_destinatario", nullable = false, length = 255)
    private String correoDestinatario;
}
