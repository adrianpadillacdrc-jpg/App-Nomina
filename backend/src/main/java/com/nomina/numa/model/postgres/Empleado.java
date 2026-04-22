package com.nomina.numa.model.postgres;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Table(name = "empleado")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Empleado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nombre;
    private String apellido;
    private String tipoDocumento;
    private String numeroDocumento;
    private String correo;
    private String direccion;
    private String genero;
    private String numeroCliente;
    private Long idCargo;
    private String cargo;
    private Double salarioBase;

    @Builder.Default
    private Long idEmpresa = 1L;

    @Builder.Default
    private String estado = "ACTIVO";

    // ✅ NUEVOS CAMPOS (agregar estos)
    @Column(name = "fecha_inicio_contrato")
    private LocalDate fechaInicioContrato;

    @Column(name = "fecha_fin_contrato")
    private LocalDate fechaFinContrato;

    @Column(name = "fecha_creacion")
    private LocalDate fechaCreacion;
}