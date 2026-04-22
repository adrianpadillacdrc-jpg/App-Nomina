// src/app/pages/novedades/novedades.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { AuthService } from '../../services/auth.service';

interface Empleado {
  id?: number;
  numeroDocumento: string;
  nombre: string;
  apellido: string;
  cargo: string;
  salarioBase: number;
}

interface Novedad {
  id: string;
  tipoNovedad: string;
  fechaInicio: string;
  fechaFin: string;
  horaInicio: string;
  horaFin: string;
  valor: number;
  observaciones: string;
  estado: string;
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
  mostrarModalNovedades = false;
  novedadesEmpleado: Novedad[] = [];

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
    this.cargarEmpleados();
  }

  cargarEmpleados() {
    const token = this.authService.getToken();
    console.log('Cargando empleados...');

    this.http.get<Empleado[]>('http://localhost:8080/api/empleados', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: (data) => {
        console.log('Empleados recibidos:', data);
        this.empleados = data.map(e => ({
          id: e.id,
          numeroDocumento: e.numeroDocumento?.toString() || 'S/N',
          nombre: this.capitalizar(e.nombre || ''),
          apellido: this.capitalizar(e.apellido || ''),
          cargo: this.capitalizar(e.cargo || ''),
          salarioBase: Number(e.salarioBase) || 0
        }));
        this.empleadosFiltrados = [...this.empleados];
        console.log('Empleados procesados:', this.empleados);
      },
      error: (err) => {
        console.error('Error al cargar empleados:', err);
        if (err.status === 401) {
          this.authService.logout();
        }
      }
    });
  }

  capitalizar(texto: string): string {
    if (!texto) return '';
    return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
  }

  filtrarEmpleados() {
    const term = this.busqueda.toLowerCase();
    this.empleadosFiltrados = this.empleados.filter(e =>
      e.numeroDocumento.includes(term) ||
      e.nombre.toLowerCase().includes(term) ||
      e.apellido.toLowerCase().includes(term)
    );
  }

  // Redirige a nueva-novedad para agregar
  abrirNovedad(emp: Empleado) {
    this.router.navigate(['/nueva-novedad'], {
      queryParams: {
        cedula: emp.numeroDocumento,
        nombre: emp.nombre,
        apellido: emp.apellido,
        idEmpleado: emp.id
      }
    });
  }

  // Ver novedades del empleado
  verNovedades(emp: Empleado) {
    this.empleadoSeleccionado = emp;
    this.cargarNovedades(emp.id!);
    this.mostrarModalNovedades = true;
  }

  // Cargar novedades desde el backend
  cargarNovedades(idEmpleado: number) {
    const token = this.authService.getToken();
    console.log('Cargando novedades para empleado:', idEmpleado);

    this.http.get<Novedad[]>(`http://localhost:8080/api/novedades/empleado/${idEmpleado}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: (data) => {
        console.log('Novedades recibidas:', data);
        this.novedadesEmpleado = data;
      },
      error: (err) => {
        console.error('Error al cargar novedades:', err);
        this.novedadesEmpleado = [];
      }
    });
  }

  cerrarModalNovedades() {
    this.mostrarModalNovedades = false;
    this.novedadesEmpleado = [];
    this.empleadoSeleccionado = null;
  }

  trackByDocumento(index: number, empleado: Empleado): string {
    return empleado.numeroDocumento;
  }
}