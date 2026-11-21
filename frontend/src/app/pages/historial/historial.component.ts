// src/app/pages/historial/historial.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../guards/components/sidebar/sidebar.component';
import { EncabezadoPaginaComponent } from '../../shared/components/encabezado-pagina/encabezado-pagina.component';
import { TablaBaseComponent } from '../../shared/components/tabla-base/tabla-base.component';
import { HistorialService, ResumenHistorial, EmpleadoHistorial, EventoHistorial } from '../../services/historial.service';

type Vista = 'EMPLEADOS' | 'EVENTOS';
type FiltroEstado = '' | 'EN_EMPRESA' | 'INACTIVO' | 'LIQUIDADO' | 'PENDIENTE' | 'SALIDO';
type FiltroMovimiento = '' | 'PAGO_NOMINA' | 'LIQUIDACION' | 'PAGO_LIQUIDACION' | 'CONTRATACION' | 'RENUNCIA';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, EncabezadoPaginaComponent, TablaBaseComponent],
  templateUrl: './historial.component.html',
  styleUrls: ['./historial.component.scss']
})
export class HistorialComponent implements OnInit {
  vista: Vista = 'EMPLEADOS';
  filtroEstado: FiltroEstado = '';
  filtroMovimiento: FiltroMovimiento = '';
  filtroFrecuencia = '';
  filtroEstadoPago = '';
  fechaDesde = '';
  fechaHasta = '';
  busqueda = '';
  cargando = false;
  error = '';

  resumen: ResumenHistorial | null = null;
  empleados: EmpleadoHistorial[] = [];
  eventos: EventoHistorial[] = [];
  eventosTotal = 0;
  paginaEventos = 0;
  paginasEventos = 0;
  readonly tamanoEventos = 100;
  empleadosConEventos: number[] = [];
  paginaEmpleados = 0;
  readonly tamanoEmpleados = 50;

  empleadoDetalle: EmpleadoHistorial | null = null;
  eventosDeEmpleado: EventoHistorial[] = [];

  // Etiquetas bonitas por categoría
  etiquetas: Record<string, string> = {
    'EN_EMPRESA': 'En la empresa',
    'LIQUIDADO': 'Liquidado',
    'PENDIENTE': 'Pendiente',
    'SALIDO': 'Salió de la empresa',
    'INACTIVO': 'Inactivo'
  };

  iconosEvento: Record<string, string> = {
    'REGISTRO': 'fa-user-plus',
    'CONTRATO_INICIO': 'fa-file-signature',
    'CONTRATACION': 'fa-file-contract',
    'FIN_CONTRATO': 'fa-hourglass-end',
    'LIQUIDACION': 'fa-file-invoice-dollar',
    'PAGO_NOMINA': 'fa-money-bill-wave',
    'PAGO_LIQUIDACION': 'fa-hand-holding-dollar',
    'RENUNCIA': 'fa-file-circle-minus'
  };

  get eventosFiltrados(): EventoHistorial[] {
    if (this.rangoFechasInvalido) return [];
    return this.eventos.filter(evento =>
      (!this.filtroMovimiento || evento.tipo === this.filtroMovimiento) &&
      (!this.filtroFrecuencia || evento.frecuencia === this.filtroFrecuencia) &&
      (!this.filtroEstadoPago || evento.estadoPago === this.filtroEstadoPago) &&
      (!this.fechaDesde || (!!evento.fecha && evento.fecha >= this.fechaDesde)) &&
      (!this.fechaHasta || (!!evento.fecha && evento.fecha <= this.fechaHasta))
    );
  }

  get empleadosFiltrados(): EmpleadoHistorial[] {
    const hayFiltroDeMovimiento = !!this.filtroMovimiento || !!this.filtroFrecuencia ||
      !!this.filtroEstadoPago || !!this.fechaDesde || !!this.fechaHasta;
    if (!hayFiltroDeMovimiento) return this.empleados;

    const idsConMovimientos = new Set(this.empleadosConEventos);
    return this.empleados.filter(empleado => idsConMovimientos.has(empleado.id));
  }

  get empleadosEnPagina(): EmpleadoHistorial[] {
    const inicio = this.paginaEmpleados * this.tamanoEmpleados;
    return this.empleadosFiltrados.slice(inicio, inicio + this.tamanoEmpleados);
  }

  get paginasEmpleados(): number {
    return Math.max(1, Math.ceil(this.empleadosFiltrados.length / this.tamanoEmpleados));
  }

  get rangoFechasInvalido(): boolean {
    return !!this.fechaDesde && !!this.fechaHasta && this.fechaDesde > this.fechaHasta;
  }

  constructor(private historialService: HistorialService) { }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = '';
    this.historialService.getHistorial(this.busqueda, this.filtroEstado, {
      tipo: this.filtroMovimiento,
      frecuencia: this.filtroFrecuencia,
      estadoPago: this.filtroEstadoPago,
      desde: this.fechaDesde,
      hasta: this.fechaHasta,
      pagina: this.paginaEventos,
      tamano: this.tamanoEventos
    }).subscribe({
      next: (data) => {
        this.resumen = data.resumen;
        this.empleados = data.empleados || [];
        this.eventos = data.eventos || [];
        this.eventosTotal = data.eventosTotal || 0;
        this.paginaEventos = data.paginaEventos || 0;
        this.paginasEventos = data.paginasEventos || 0;
        this.empleadosConEventos = data.empleadosConEventos || [];
        this.paginaEmpleados = Math.min(this.paginaEmpleados, this.paginasEmpleados - 1);
        this.cargando = false;
      },
      error: () => {
        this.error = 'No se pudo cargar el historial. Verifica que el backend esté corriendo.';
        this.cargando = false;
      }
    });
  }

  aplicarFiltros(): void {
    if (this.rangoFechasInvalido) return;
    this.paginaEventos = 0;
    this.paginaEmpleados = 0;
    this.cargar();
  }

  setVista(v: Vista): void {
    this.vista = v;
  }

  setFiltroEstado(f: FiltroEstado): void {
    this.filtroEstado = f;
    this.aplicarFiltros();
  }

  cambiarPaginaEventos(direccion: number): void {
    const pagina = this.paginaEventos + direccion;
    if (pagina < 0 || pagina >= this.paginasEventos) return;
    this.paginaEventos = pagina;
    this.cargar();
  }

  cambiarPaginaEmpleados(direccion: number): void {
    const pagina = this.paginaEmpleados + direccion;
    if (pagina < 0 || pagina >= this.paginasEmpleados) return;
    this.paginaEmpleados = pagina;
  }

  abrirDetalle(emp: EmpleadoHistorial): void {
    this.empleadoDetalle = emp;
    this.eventosDeEmpleado = [];
    this.historialService.getHistorial(this.busqueda, this.filtroEstado, {
      tipo: this.filtroMovimiento,
      frecuencia: this.filtroFrecuencia,
      estadoPago: this.filtroEstadoPago,
      desde: this.fechaDesde,
      hasta: this.fechaHasta,
      empleadoId: emp.id,
      pagina: 0,
      tamano: 500
    }).subscribe({
      next: data => {
        this.eventosDeEmpleado = data.eventos || [];
        if (this.empleadoDetalle && !this.empleadoDetalle.fechaFinContrato) {
          const evContrato = this.eventosDeEmpleado.find(ev => ev.tipo === 'CONTRATACION' && ev.detalle?.includes(' al '));
          if (evContrato?.detalle) {
            const match = evContrato.detalle.match(/al\s+(\d{4}-\d{2}-\d{2})/);
            if (match && match[1]) {
              this.empleadoDetalle.fechaFinContrato = match[1];
            }
          }
        }
      },
      error: () => this.eventosDeEmpleado = []
    });
  }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.filtroEstado = '';
    this.filtroMovimiento = '';
    this.filtroFrecuencia = '';
    this.filtroEstadoPago = '';
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.paginaEmpleados = 0;
    this.paginaEventos = 0;
    this.cargar();
  }

  cerrarDetalle(): void {
    this.empleadoDetalle = null;
  }

  moneda(v?: number): string {
    return v == null ? 'N/A' : '$' + v.toLocaleString('es-CO');
  }

  fechaBonita(fecha?: string | null): string {
    if (!fecha) return 'N/A';
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return fecha;
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  /** Muestra "Indefinido" cuando el empleado está activo y no tiene fecha de fin */
  fechaFinDisplay(fecha?: string | null, categoria?: string): string {
    if (!fecha) {
      const cat = (categoria ?? '').toUpperCase();
      if (cat === 'EN_EMPRESA' || cat === 'ACTIVO') return 'Indefinido';
      return '—';
    }
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return fecha;
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
