// src/app/pages/novedades/novedades.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { EmpleadosService } from '../../services/empleados.service';

interface Empleado {
  id?: number;
  numeroDocumento: string;
  nombre: string;
  apellido: string;
  cargo: string;
  salarioBase: number;
}

interface NovedadForm {
  tipoNovedad: string;
  fechaInicio: string;
  fechaFin: string;
  observaciones: string;
  horas?: number;
  valor?: number;
}

@Component({
  selector: 'app-novedades',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './novedades.component.html',
  styleUrls: ['./novedades.component.scss']
})
export class NovedadesComponent implements OnInit {
  empleados: Empleado[] = [];
  empleadosFiltrados: Empleado[] = [];
  busqueda = '';
  empleadoSeleccionado: Empleado | null = null;
  mostrarModal = false;
  periodoActual: any = null;

  novedad: NovedadForm = {
    tipoNovedad: '',
    fechaInicio: '',
    fechaFin: '',
    observaciones: '',
    horas: 0,
    valor: 0
  };

  constructor(
    private empleadosService: EmpleadosService,
    private router: Router
  ) { }

  ngOnInit() {
    this.cargarPeriodoActual();
    this.cargarEmpleados();
  }

  cargarPeriodoActual() {
    this.empleadosService.getPeriodoActual().subscribe({
      next: (data) => this.periodoActual = data,
      error: () => alert('Error al cargar período actual')
    });
  }

  cargarEmpleados() {
    this.empleadosService.getEmpleados().subscribe({
      next: (data: any[]) => {
        this.empleados = data.map(e => ({
          id: e.id,
          numeroDocumento: e.numeroDocumento?.toString() || 'S/N',
          nombre: this.cap(e.nombre || ''),
          apellido: this.cap(e.apellido || ''),
          cargo: this.cap(e.cargo || ''),
          salarioBase: Number(e.salarioBase) || 0
        }));
        this.empleadosFiltrados = [...this.empleados];
      }
    });
  }

  cap(t: string): string {
    return t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : '';
  }

  filtrarEmpleados() {
    const term = this.busqueda.toLowerCase();
    this.empleadosFiltrados = this.empleados.filter(e =>
      e.numeroDocumento.includes(term) ||
      e.nombre.toLowerCase().includes(term) ||
      e.apellido.toLowerCase().includes(term)
    );
  }

  abrirNovedad(emp: Empleado) {
    this.empleadoSeleccionado = emp;
    this.mostrarModal = true;
    this.novedad = {
      tipoNovedad: '',
      fechaInicio: '',
      fechaFin: '',
      observaciones: '',
      horas: 0,
      valor: 0
    };
  }

  onTipoChange() {
    this.novedad.horas = 0;
    this.novedad.valor = 0;
    this.novedad.fechaInicio = '';
    this.novedad.fechaFin = '';
  }

  usaFechas(): boolean {
    const tipos = ['INCAPACIDAD', 'PERMISO_NO_REMUNERADO', 'VACACIONES'];
    return tipos.includes(this.novedad.tipoNovedad);
  }

  esTipoValor(): boolean {
    const tipos = ['BONIFICACION', 'COMISION', 'PRESTAMO', 'EMBARGO'];
    return tipos.includes(this.novedad.tipoNovedad);
  }

  labelValor(): string {
    switch (this.novedad.tipoNovedad) {
      case 'BONIFICACION': return 'Valor de la Bonificación';
      case 'COMISION': return 'Valor de la Comisión';
      case 'PRESTAMO': return 'Valor del Préstamo';
      case 'EMBARGO': return 'Valor del Embargo';
      default: return 'Valor';
    }
  }

  guardarNovedad() {
    if (!this.empleadoSeleccionado || !this.periodoActual) {
      alert('Falta empleado o período');
      return;
    }

    const payload = {
      idEmpleado: Number(this.empleadoSeleccionado.id),
      periodoId: this.periodoActual.id,
      tipoNovedad: this.novedad.tipoNovedad,
      fechaInicio: this.novedad.fechaInicio || null,
      fechaFin: this.novedad.fechaFin || null,
      observaciones: this.novedad.observaciones || '',
      horas: this.novedad.horas || 0,
      valor: this.novedad.valor || 0,
      estado: 'PENDIENTE'
    };

    this.empleadosService.guardarNovedad(payload).subscribe({
      next: () => {
        alert('Novedad guardada correctamente');
        this.cerrarModal();
      },
      error: (err) => {
        console.error(err);
        alert('Error al guardar');
      }
    });
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.empleadoSeleccionado = null;
  }

  trackByDocumento(i: number, e: Empleado) {
    return e.numeroDocumento;
  }
}