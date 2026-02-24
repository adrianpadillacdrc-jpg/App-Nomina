// src/app/pages/consultar-empleados/actualizar-empleado/actualizar-empleado.component.ts

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { EmpleadosService } from '../../../services/empleados.service'; // RUTA CORREGIDA
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-actualizar-empleado',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './actualizar-empleado.component.html',
  styleUrls: ['./actualizar-empleado.component.scss']
})
export class ActualizarEmpleadoComponent {
  @Input() empleado: any;
  @Output() cerrar = new EventEmitter<void>();
  @Output() actualizado = new EventEmitter<void>();

  form: any = {};

  constructor(private empleadosService: EmpleadosService) { }

  ngOnChanges() {
    if (this.empleado) {
      this.form = {
        nombre: this.empleado.nombre || '',
        apellido: this.empleado.apellido || '',
        cargo: this.empleado.cargo || '',
        salarioBase: this.empleado.salarioBase || 0,
        numeroDocumento: this.empleado.documento || ''
      };
    }
  }

  guardar() {
    if (!this.empleado?.id) {
      alert('Error: ID del empleado no encontrado');
      return;
    }

    const datosActualizados = {
      id: this.empleado.id,
      nombre: this.form.nombre,
      apellido: this.form.apellido,
      cargo: this.form.cargo,
      salarioBase: Number(this.form.salarioBase),
      numeroDocumento: this.form.numeroDocumento
    };

    this.empleadosService.actualizarEmpleado(datosActualizados).subscribe({
      next: () => {
        alert('¡Empleado actualizado con éxito!');
        this.actualizado.emit();
        this.cerrar.emit();
      },
      error: (err: any) => {  // TIPADO CORREGIDO
        console.error('Error al actualizar:', err);
        alert('Error al actualizar el empleado');
      }
    });
  }

  cerrarFormulario() {
    this.cerrar.emit();
  }
}