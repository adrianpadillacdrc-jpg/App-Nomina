// src/app/guards/components/sidebar/sidebar-notificaciones.ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AlertasService, Alerta } from '../../../services/alertas.service';
import { EmpleadosService } from '../../../services/empleados.service';
import { ContratosService, Contrato } from '../../../services/contratos.service';

type Filtro = 'TODAS' | 'CONTRATO' | 'PERIODO' | 'VENCIDO' | 'URGENTE';

/** Evento del historial de un empleado */
export interface EventoHistorial {
  tipo: 'REGISTRO' | 'CONTRATO' | 'LIQUIDACION' | 'FIN_CONTRATO';
  titulo: string;
  fecha: string;
  detalle: string;
}

@Component({
  selector: 'app-notificaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar-notificaciones.html',
  styleUrls: ['./sidebar-notificaciones.scss']
})
export class SidebarNotificacionesComponent implements OnInit, OnDestroy {
  alertas: Alerta[] = [];
  filtro: Filtro = 'TODAS';
  panelAbierto = false;
  private timer: any;
  private readonly claveDescartadas = 'alertasDescartadas';

  // ===== Modal de detalles de contrato =====
  detalleAbierto = false;
  detalleCargando = false;
  detalleEmpleado: any = null;
  detalleContrato: Contrato | null = null;
  detalleContratos: Contrato[] = [];
  detalleHistorial: EventoHistorial[] = [];
  nombreTipoContrato: Record<string, string> = {
    'TERMINO_FIJO': 'Término fijo',
    'TERMINO_INDEFINIDO': 'Término indefinido',
    'OBRA_LABOR': 'Obra o labor',
    'APRENDIZ': 'Aprendizaje'
  };

  constructor(
    private alertasService: AlertasService,
    private router: Router,
    private empleadosService: EmpleadosService,
    private contratosService: ContratosService
  ) { }

  ngOnInit(): void {
    this.cargar();
    // Consulta automática cada 5 minutos
    this.timer = setInterval(() => this.cargar(), 5 * 60 * 1000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  cargar(): void {
    this.alertasService.getAlertas().subscribe({
      next: (resp) => {
        const descartadas = this.leerDescartadas();
        this.alertas = resp.alertas.filter(a => !descartadas.includes(this.clave(a)));
        if (this.total > 0) this.notificarNavegador();
      },
      error: () => { /* silencioso: sin conexión no interrumpe la app */ }
    });
  }

  get total(): number {
    return this.alertas.length;
  }

  get filtradas(): Alerta[] {
    switch (this.filtro) {
      case 'CONTRATO': return this.alertas.filter(a => a.tipo === 'CONTRATO' || a.tipo === 'CONTRATACION');
      case 'PERIODO': return this.alertas.filter(a => a.tipo === 'PERIODO');
      case 'VENCIDO': return this.alertas.filter(a => a.nivel === 'VENCIDO');
      case 'URGENTE': return this.alertas.filter(a => a.nivel === 'URGENTE');
      default: return this.alertas;
    }
  }

  contar(f: Filtro): number {
    const anterior = this.filtro;
    this.filtro = f;
    const n = this.filtradas.length;
    this.filtro = anterior;
    return n;
  }

  setFiltro(f: Filtro): void {
    this.filtro = f;
  }

  togglePanel(): void {
    this.panelAbierto = !this.panelAbierto;
    if (this.panelAbierto) this.cargar();
  }

  /** Solo queda navegación para PERIODO; los contratos abren el modal de detalles */
  irA(alerta: Alerta): void {
    this.panelAbierto = false;
    if (alerta.tipo === 'PERIODO') {
      this.router.navigate(['/pago-nomina']);
    }
  }

  /** Abre el modal con todos los detalles del contrato del empleado */
  verDetalle(alerta: Alerta): void {
    if (alerta.tipo === 'PERIODO') { this.irA(alerta); return; }
    this.panelAbierto = false;
    this.detalleAbierto = true;
    this.detalleCargando = true;
    this.detalleEmpleado = null;
    this.detalleContrato = null;
    this.detalleContratos = [];
    this.detalleHistorial = [];

    this.buscarEmpleado(alerta, (emp) => {
      if (!emp) {
        this.detalleCargando = false;
        return;
      }
      this.detalleEmpleado = emp;
      this.contratosService.getContratosPorEmpleado(Number(emp.id)).subscribe({
        next: (contratos) => {
          this.detalleContratos = contratos || [];
          this.detalleContrato = this.elegirContrato(contratos || [], alerta);
          this.construirHistorial(emp, this.detalleContratos);
          this.detalleCargando = false;
        },
        error: () => {
          this.construirHistorial(emp, []);
          this.detalleCargando = false;
        }
      });
    });
  }

  cerrarDetalle(): void {
    this.detalleAbierto = false;
  }

  /** Navega al módulo de contratos y abre automáticamente el contrato del empleado */
  irAContrato(emp: any): void {
    this.detalleAbierto = false;
    this.panelAbierto = false;
    this.router.navigate(['/contratos-empleados'], {
      queryParams: { empleadoId: emp.id, verContrato: 1 }
    });
  }

  /** Elige el contrato relevante: VIGENTE primero, luego el que coincide con la alerta */
  private elegirContrato(contratos: Contrato[], alerta: Alerta): Contrato | null {
    if (contratos.length === 0) return null;
    const vigente = contratos.find(c => (c.estado || '').toUpperCase() === 'VIGENTE');
    if (vigente) return vigente;
    const porFecha = contratos.find(c => c.fechaFin === alerta.fecha);
    return porFecha || contratos[0];
  }

  /** Busca el empleado: por ID directo, luego por documento */
  private buscarEmpleado(alerta: Alerta, callback: (emp: any) => void): void {
    const id = alerta.idReferencia;
    this.empleadosService.getEmpleadoPorId(String(id)).subscribe({
      next: (emp: any) => { callback(emp); },
      error: () => this.buscarPorDocumento(alerta, callback)
    });
  }

  private buscarPorDocumento(alerta: Alerta, callback: (emp: any) => void): void {
    const doc = alerta.documento;
    if (!doc) { callback(null); return; }
    const buscar = (pagina: number): void => {
      this.empleadosService.getEmpleados(pagina, 100).subscribe({
        next: (data: any) => {
          const raw = data.content ? data.content : (Array.isArray(data) ? data : []);
          const emp = raw.find((e: any) => String(e.numeroDocumento) === String(doc));
          if (emp) { callback(emp); return; }
          const totalPaginas = data.totalPages ?? 0;
          if (pagina + 1 < totalPaginas) buscar(pagina + 1);
          else callback(null);
        },
        error: () => callback(null)
      });
    };
    buscar(0);
  }

  /** Historial: registro, cada contrato, fin de contrato y estado actual */
  private construirHistorial(emp: any, contratos: Contrato[]): void {
    const eventos: EventoHistorial[] = [];

    const fechaRegistro = emp.fechaRegistro || emp.createdAt;
    if (fechaRegistro) {
      eventos.push({
        tipo: 'REGISTRO',
        titulo: 'Registro del empleado',
        fecha: String(fechaRegistro),
        detalle: `${emp.nombre} ${emp.apellido} fue registrado en el sistema`
      });
    }

    contratos.forEach(c => {
      const estado = (c.estado || '').toUpperCase();
      const esVigente = estado === 'VIGENTE';
      eventos.push({
        tipo: 'CONTRATO',
        titulo: `Contrato ${this.nombreTipoContrato[c.idTipoContrato] || c.idTipoContrato}`,
        fecha: c.fechaInicio,
        detalle: `Del ${this.fechaBonita(c.fechaInicio)} al ${this.fechaBonita(c.fechaFin)} · ${esVigente ? 'Vigente' : (estado || 'N/A')}`
      });
      if (!esVigente && c.fechaFin && new Date(c.fechaFin) < new Date()) {
        eventos.push({
          tipo: 'FIN_CONTRATO',
          titulo: 'Fin de contrato',
          fecha: c.fechaFin,
          detalle: `El contrato finalizó el ${this.fechaBonita(c.fechaFin)}`
        });
      }
    });

    if (emp.fechaFinContrato && !contratos.some(c => c.fechaFin === emp.fechaFinContrato)) {
      eventos.push({
        tipo: 'FIN_CONTRATO',
        titulo: 'Fin de contrato (ficha del empleado)',
        fecha: emp.fechaFinContrato,
        detalle: `Fecha de fin registrada: ${this.fechaBonita(emp.fechaFinContrato)}`
      });
    }

    const estado = (emp.estado || '').toUpperCase();
    eventos.push({
      tipo: estado === 'INACTIVO' ? 'LIQUIDACION' : 'REGISTRO',
      titulo: estado === 'INACTIVO' ? 'Empleado liquidado / inactivo' : 'Empleado activo',
      fecha: estado === 'INACTIVO' ? (emp.fechaFinContrato || '') : '',
      detalle: estado === 'INACTIVO'
        ? 'El empleado se encuentra inactivo en el sistema'
        : 'El empleado se encuentra activo, con nómina corriendo'
    });

    eventos.sort((a, b) => {
      if (!a.fecha) return 1;
      if (!b.fecha) return -1;
      return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
    });
    this.detalleHistorial = eventos;
  }

  fechaBonita(fecha?: string): string {
    if (!fecha) return 'N/A';
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return fecha;
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  descartar(alerta: Alerta): void {
    const descartadas = this.leerDescartadas();
    descartadas.push(this.clave(alerta));
    localStorage.setItem(this.claveDescartadas, JSON.stringify(descartadas));
    this.alertas = this.alertas.filter(a => a !== alerta);
  }

  limpiarTodas(): void {
    const descartadas = this.leerDescartadas();
    this.alertas.forEach(a => descartadas.push(this.clave(a)));
    localStorage.setItem(this.claveDescartadas, JSON.stringify(descartadas));
    this.alertas = [];
  }

  /** Notificación nativa del navegador (opcional, solo si el usuario lo permitió) */
  private notificarNavegador(): void {
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      new Notification('NUMA Nómina - Alertas', {
        body: `Tienes ${this.total} alerta(s) pendiente(s)`,
        icon: '/assets/logo.svg'
      });
    }
  }

  solicitarPermiso(): void {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  private clave(a: Alerta): string {
    return `${a.tipo}-${a.idReferencia}-${a.fecha}`;
  }

  private leerDescartadas(): string[] {
    try {
      return JSON.parse(localStorage.getItem(this.claveDescartadas) || '[]');
    } catch {
      return [];
    }
  }
}
