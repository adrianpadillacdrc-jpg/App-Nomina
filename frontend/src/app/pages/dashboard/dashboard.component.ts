import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SidebarComponent } from '../../guards/components/sidebar/sidebar.component';
import { EncabezadoPaginaComponent } from '../../shared/components/encabezado-pagina/encabezado-pagina.component';
import { TablaBaseComponent } from '../../shared/components/tabla-base/tabla-base.component';
import { Empleado } from '../../models/empleado.model';
import { EmpleadosService } from '../../services/empleados.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SidebarComponent,
    EncabezadoPaginaComponent,
    TablaBaseComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  empleados: Empleado[] = [];
  empleadosFiltrados: Empleado[] = [];
  loading = true;
  periodoActual: any = null;
  costoActualMillones = 0;
  costoAnteriorMillones = 0;

  paginaActual = 0;
  tamanoPagina = 10;
  totalElementosReal = 0;
  totalPaginas = 0;

  totalEmpleados = 0;
  liquidados = 0;
  pendientes = 0;
  porcentajeLiquidado = 0;
  nominaMes = 0;

  deltaNomina = '+0.0% vs periodo anterior';

  constructor(
    private router: Router,
    private empleadosService: EmpleadosService,
    private authService: AuthService,
  ) { }

  ngOnInit() {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
    } else {
      this.cargarDashboard();
    }
  }

  cargarDashboard() {
    this.loading = true;
    forkJoin({
      empleados: this.empleadosService.getEmpleados(this.paginaActual, this.tamanoPagina).pipe(
        catchError(() => of({ content: [], totalElements: 0, totalPages: 0 }))
      ),
      // ✅ Pedimos las estadísticas al nuevo endpoint
      estadisticas: this.empleadosService.getEstadisticasEmpleados().pipe(
        catchError(() => of({ activos: 0, inactivos: 0 }))
      ),
      periodoActual: this.empleadosService.getPeriodoActualConCosto().pipe(
        catchError(() => of(null))
      ),
      periodos: this.empleadosService.getPeriodos().pipe(
        catchError(() => of([]))
      )
    }).subscribe({
      next: ({ empleados, estadisticas, periodoActual, periodos }) => {
        const rawContent = empleados.content ? empleados.content : (Array.isArray(empleados) ? empleados : []);

        this.empleados = rawContent.map((emp: any): Empleado => ({
          id: emp.id,
          numeroDocumento: emp.numeroDocumento?.toString() || emp.documento?.toString() || 'S/N',
          nombre: this.capitalizar(this.limpiarTexto(emp.nombre || 'Sin nombre')),
          apellido: this.capitalizar(this.limpiarTexto(emp.apellido || 'Sin apellido')),
          cargo: this.capitalizar(this.limpiarTexto(emp.cargo || 'Sin cargo')),
          salarioBase: Number(emp.salarioBase) || 0,
          estado: emp.estado === 'Inactivo' ? 'Inactivo' : 'Activo'
        }));

        this.empleadosFiltrados = [...this.empleados];

        this.totalElementosReal = empleados.totalElements || rawContent.length;
        this.totalPaginas = empleados.totalPages || 1;

        // ✅ Asignamos los valores REALES de la base de datos
        this.liquidados = estadisticas.activos;
        this.pendientes = estadisticas.inactivos;

        this.periodoActual = periodoActual;
        this.costoActualMillones = periodoActual?.costoMillones || 0;
        this.costoAnteriorMillones = this.obtenerCostoPeriodoAnterior(periodos);

        this.calcularEstadisticas();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  cambiarPagina(nuevaPagina: number) {
    if (nuevaPagina >= 0 && nuevaPagina < this.totalPaginas) {
      this.paginaActual = nuevaPagina;
      this.cargarDashboard();
    }
  }

  limpiarTexto(texto: string): string {
    if (!texto) return '';
    return texto
      .replace(/Mart\?nez/gi, 'Martínez')
      .replace(/Hern\?ndez/gi, 'Hernández')
      .replace(/G\?mez/gi, 'Gómez')
      .replace(/P\?rez/gi, 'Pérez')
      .replace(/Rodr\?guez/gi, 'Rodríguez')
      .replace(/S\?nchez/gi, 'Sánchez')
      .replace(/D\?az/gi, 'Díaz')
      .replace(/Garc\?a/gi, 'García')
      .replace(/L\?pez/gi, 'López')
      .replace(/Ram\?rez/gi, 'Ramírez')
      .replace(/Gonz\?lez/gi, 'González')
      .replace(/Mu\?oz/gi, 'Muñoz')
      .replace(/Pe\?a/gi, 'Peña')
      .replace(/Ni\?o/gi, 'Niño')
      .replace(/Berm\?dez/gi, 'Bermúdez')
      .replace(/Jim\?nez/gi, 'Jiménez')
      .replace(/Guti\?rrez/gi, 'Gutiérrez')
      .replace(/V\?squez/gi, 'Vásquez')
      .replace(/Vel\?squez/gi, 'Velásquez')
      .replace(/Su\?rez/gi, 'Suárez')
      .replace(/M\?rquez/gi, 'Márquez')
      .replace(/C\?rdenas/gi, 'Cárdenas')
      .replace(/Casta\?eda/gi, 'Castañeda')
      .replace(/Ca\?averal/gi, 'Cañaveral')
      .replace(/Qui\?ones/gi, 'Quiñones')
      .replace(/Monta\?o/gi, 'Montaño')
      .replace(/Acu\?a/gi, 'Acuña')
      .replace(/Londo\?o/gi, 'Londoño')
      .replace(/Pati\?o/gi, 'Patiño')
      .replace(/Andr\?s/gi, 'Andrés')
      .replace(/Jos\?(\b|\s)/gi, 'José$1')
      .replace(/Mar\?a/gi, 'María')
      .replace(/Jes\?s/gi, 'Jesús')
      .replace(/Sebasti\?n/gi, 'Sebastián')
      .replace(/Juli\?n/gi, 'Julián')
      .replace(/Mart\?n/gi, 'Martín')
      .replace(/Hern\?n/gi, 'Hernán')
      .replace(/Ra\?l/gi, 'Raúl')
      .replace(/Iv\?n/gi, 'Iván')
      .replace(/Rub\?n/gi, 'Rubén')
      .replace(/C\?sar/gi, 'César')
      .replace(/\?/g, '');
  }

  capitalizar(texto: string): string {
    if (!texto) return '';
    return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
  }

  getInitials(nombre: string, apellido: string): string {
    const n = nombre ? nombre.charAt(0).toUpperCase() : '';
    const a = apellido ? apellido.charAt(0).toUpperCase() : '';
    return n + a;
  }

  onFiltroChange(event: Event) {
    const term = (event.target as HTMLInputElement).value.toLowerCase();
    this.empleadosFiltrados = this.empleados.filter(e =>
      e.numeroDocumento.includes(term) ||
      e.nombre.toLowerCase().includes(term) ||
      e.apellido.toLowerCase().includes(term) ||
      e.cargo.toLowerCase().includes(term)
    );
    // Nota: Como no implementamos la búsqueda paginada, esto filtrará localmente los 10 en pantalla
  }

  calcularEstadisticas() {
    this.totalEmpleados = this.totalElementosReal;

    // ✅ Calculamos el porcentaje sobre el total real
    this.porcentajeLiquidado = this.totalEmpleados > 0
      ? Math.round((this.liquidados / this.totalEmpleados) * 100)
      : 0;

    this.nominaMes = this.empleadosFiltrados
      .filter(e => e.estado === 'Activo')
      .reduce((s, e) => s + e.salarioBase, 0);

    if (this.costoAnteriorMillones > 0) {
      this.deltaNomina = `${this.formatPercentChange(this.costoActualMillones, this.costoAnteriorMillones)} vs periodo anterior`;
    } else {
      this.deltaNomina = '+0.0% vs periodo anterior';
    }
  }

  private obtenerCostoPeriodoAnterior(periodos: any[]): number {
    if (!Array.isArray(periodos) || periodos.length === 0) return 0;
    const anteriores = periodos.filter(p => p.estado?.toUpperCase() === 'CERRADO');
    return anteriores.length > 0 ? (anteriores[0].costoMillones || 0) : 0;
  }

  private formatPercentChange(current: number, previous: number): string {
    const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  }

  formatearMillones(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valor || 0);
  }

  cerrarSesion() {
    if (confirm('¿Seguro que quieres cerrar sesión?')) {
      this.authService.logout();
    }
  }

  trackByDocumento(index: number, empleado: Empleado): string {
    return empleado.numeroDocumento;
  }
}