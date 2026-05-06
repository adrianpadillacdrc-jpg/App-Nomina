// src/app/pages/dashboard/dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../guards/components/sidebar/sidebar.component';
import { Empleado } from '../../models/empleado.model';
import { EmpleadosService } from '../../services/empleados.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SidebarComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  empleados: Empleado[] = [];
  empleadosFiltrados: Empleado[] = [];
  loading = true;
  periodoActual: any = null;

  totalEmpleados = 0;
  liquidados = 0;
  porcentajeLiquidado = 0;
  nominaMes = 0;

  constructor(
    private router: Router,
    private empleadosService: EmpleadosService,
    private authService: AuthService,
  ) { }

  ngOnInit() {
    if (!this.authService.isLoggedIn()) {
      console.log('No hay token vÃ¡lido â†’ redirigiendo a login');
      this.router.navigate(['/login']);
    } else {
      console.log('Usuario autenticado con token â†’ cargando datos del dashboard');
      this.cargarEmpleados();
    }
  }

  cargarEmpleados() {
    this.loading = true;
    console.log('Solicitando empleados...');

    this.empleadosService.getEmpleados().subscribe({
      next: (data: any[]) => {
        console.log('RAW DATA FROM API:', data);

        if (!Array.isArray(data)) {
          console.error('La API no devolviÃ³ un array:', data);
          this.loading = false;
          return;
        }

        this.empleados = data.map((emp: any): Empleado => ({
          id: emp.id,
          numeroDocumento: emp.numeroDocumento?.toString() || 'S/N',
          nombre: this.capitalizar(emp.nombre || 'Sin nombre'),
          apellido: this.capitalizar(emp.apellido || 'Sin apellido'),
          cargo: this.capitalizar(emp.cargo || 'Sin cargo'),
          salarioBase: Number(emp.salarioBase) || 0,
          estado: emp.estado === 'Inactivo' ? 'Inactivo' : 'Activo'
        }));

        this.empleadosFiltrados = [...this.empleados];
        this.calcularEstadisticas();
        this.loading = false;
        console.log('Empleados cargados:', this.empleados);
      },
      error: (err) => {
        console.error('ERROR COMPLETO:', err);
        alert('Error al conectar con el backend. Ver consola.');
        this.loading = false;
      }
    });
  }


  capitalizar(texto: string): string {
    if (!texto) return '';
    return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
  }

  onFiltroChange(event: Event) {
    const term = (event.target as HTMLInputElement).value.toLowerCase();
    this.empleadosFiltrados = this.empleados.filter(e =>
      e.numeroDocumento.includes(term) ||
      e.nombre.toLowerCase().includes(term) ||
      e.apellido.toLowerCase().includes(term) ||
      e.cargo.toLowerCase().includes(term)
    );
    this.calcularEstadisticas();
  }

  calcularEstadisticas() {
    this.totalEmpleados = this.empleadosFiltrados.length;
    this.liquidados = this.empleadosFiltrados.filter(e => e.estado === 'Activo').length;
    this.porcentajeLiquidado = this.totalEmpleados > 0
      ? Math.round((this.liquidados / this.totalEmpleados) * 100)
      : 0;
    this.nominaMes = this.empleadosFiltrados
      .filter(e => e.estado === 'Activo')
      .reduce((s, e) => s + e.salarioBase, 0);
  }

  cerrarSesion() {
    const confirmar = confirm('Â¿Seguro que quieres cerrar sesiÃ³n?');
    if (confirmar) {
      console.log('Cerrando sesiÃ³n...');
      this.authService.logout();
    }
  }

  trackByDocumento(index: number, empleado: Empleado): string {
    return empleado.numeroDocumento;
  }
}
