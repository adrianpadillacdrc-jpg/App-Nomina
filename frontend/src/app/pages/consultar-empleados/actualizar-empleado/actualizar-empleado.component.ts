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
        salarioBase: this.empleado.salarioBase || 1750905,
        tasaArl: Number(this.empleado.tasaArl) > 0 ? Number(this.empleado.tasaArl) : 0.522,
        modalidadTrabajo: this.empleado.modalidadTrabajo || 'PRESENCIAL',
        transporteSuministrado: this.empleado.transporteSuministrado ?? false,
        numeroDocumento: this.empleado.documento || ''
      };
    }
  }

  private normalizarSalario(val: any): number {
    if (val === null || val === undefined) return 1750905;
    if (typeof val === 'number') {
      if (val > 0 && val < 1000) {
        val = val * 1000000;
      }
      return Math.round(val);
    }
    let s = String(val).trim().replace(/[\$\s]/g, '');
    if (s.includes('.') && s.includes(',')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes('.')) {
      const parts = s.split('.');
      if (parts.length > 2 || (parts.length === 2 && (parts[1].length === 3 || parts[1].length === 6))) {
        s = s.replace(/\./g, '');
      }
    }
    const num = Number(s);
    if (!isNaN(num) && num > 0 && num < 1000) {
      return Math.round(num * 1000000);
    }
    return isNaN(num) ? 0 : Math.round(num);
  }

  guardar() {
    if (!this.empleado?.id) {
      alert('Error: ID del empleado no encontrado');
      return;
    }

    const salarioFinal = this.normalizarSalario(this.form.salarioBase);
    let tasaArlFinal = Number(this.form.tasaArl);
    if (isNaN(tasaArlFinal) || tasaArlFinal <= 0) {
      tasaArlFinal = 0.522;
    }

    if (salarioFinal < 1750905) {
      alert('El salario no puede ser inferior al mínimo legal vigente de 2026 ($1.750.905 COP).');
      return;
    }

    const datosActualizados = {
      id: this.empleado.id,
      nombre: this.form.nombre,
      apellido: this.form.apellido,
      cargo: this.form.cargo,
      salarioBase: salarioFinal,
      tasaArl: tasaArlFinal,
      modalidadTrabajo: this.form.modalidadTrabajo,
      transporteSuministrado: this.form.transporteSuministrado,
      numeroDocumento: this.form.numeroDocumento
    };

    this.empleadosService.actualizarEmpleado(datosActualizados).subscribe({
      next: () => {
        alert('¡Empleado actualizado con éxito!');
        this.actualizado.emit();
        this.cerrar.emit();
      },
      error: (err: any) => {
        console.error('Error al actualizar:', err);
        const mensajeError = err.error?.error || err.error?.message || 'Error al actualizar el empleado';
        alert(mensajeError);
      }
    });
  }

  cerrarFormulario() {
    this.cerrar.emit();
  }
}