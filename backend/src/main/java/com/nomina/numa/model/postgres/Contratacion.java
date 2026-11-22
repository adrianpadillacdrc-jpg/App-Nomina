package com.nomina.numa.model.postgres;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Table(name = "contratacion")
@Data
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Contratacion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long idEmpleado;
    private Long idCargo;
    private LocalDate fechaInicio;
    private LocalDate fechaFin;

    @Builder.Default
    private String estado = "VIGENTE";

    @Column(name = "firma_empleado", columnDefinition = "TEXT")
    private String firmaEmpleado;

    @Column(name = "firma_empleador", columnDefinition = "TEXT")
    private String firmaEmpleador;

    @Column(name = "fecha_firma_empleado")
    private LocalDate fechaFirmaEmpleado;

    @Column(name = "fecha_firma_empleador")
    private LocalDate fechaFirmaEmpleador;

    public Long getId() { return this.id; }
    public void setId(Long id) { this.id = id; }

    public Long getIdEmpleado() { return this.idEmpleado; }
    public void setIdEmpleado(Long idEmpleado) { this.idEmpleado = idEmpleado; }

    public Long getIdCargo() { return this.idCargo; }
    public void setIdCargo(Long idCargo) { this.idCargo = idCargo; }

    public LocalDate getFechaInicio() { return this.fechaInicio; }
    public void setFechaInicio(LocalDate fechaInicio) { this.fechaInicio = fechaInicio; }

    public LocalDate getFechaFin() { return this.fechaFin; }
    public void setFechaFin(LocalDate fechaFin) { this.fechaFin = fechaFin; }

    public String getEstado() { return this.estado; }
    public void setEstado(String estado) { this.estado = estado; }
}
