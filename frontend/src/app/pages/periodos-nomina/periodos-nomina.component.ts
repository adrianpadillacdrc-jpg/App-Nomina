// src/app/pages/periodos-nomina/periodos-nomina.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../guards/components/sidebar/sidebar.component';
import { EncabezadoPaginaComponent } from '../../shared/components/encabezado-pagina/encabezado-pagina.component';
import { TablaBaseComponent } from '../../shared/components/tabla-base/tabla-base.component';
import { EmpleadosService } from '../../services/empleados.service';

interface Periodo {
    id: string;
    description: string;
    fechaInicio: string;
    fechaFin: string;
    estado: string;
    anio?: number;
    tipo?: string;
    costoMillones?: number;
    costoCOP?: number;
    costoEstimado?: boolean;
    origenCosto?: string;
}

interface NominaItem {
    id?: number;
    nombre: string;
    apellido: string;
    sueldoBase: number | null;
    devengos: number;
    deducciones: number;
    totalPagar: number;
    detalleDevengos: { concepto: string; valor: number }[];
    detalleDeducciones: { concepto: string; valor: number }[];
}

@Component({
    selector: 'app-periodos-nomina',
    standalone: true,
    imports: [CommonModule, SidebarComponent, EncabezadoPaginaComponent, TablaBaseComponent],
    templateUrl: './periodos-nomina.component.html',
    styleUrls: ['./periodos-nomina.component.scss']
})
export class PeriodosNominaComponent implements OnInit {

    periodosTodos: Periodo[] = [];
    periodos: Periodo[] = [];
    periodoSeleccionado: Periodo | null = null;
    nominaHistorica: NominaItem[] = [];
    smmlvPeriodo: number | null = null;
    mostrarModalNomina = false;
    cargando = false;

    // Filtros
    filtroTipo: 'QUINCENAL' | 'MENSUAL' | 'TODOS' = 'QUINCENAL';
    filtroEstado: 'TODOS' | 'ABIERTO' | 'CERRADO' = 'TODOS';

    // Estadísticas
    quincenasAbiertas = 0;
    quincenasCerradas = 0;
    totalQuincenas = 0;

    get totalDevengos(): number {
        return this.nominaHistorica.reduce((total, empleado) => total + empleado.devengos, 0);
    }

    get totalDevengado(): number {
        return this.nominaHistorica.reduce(
            (total, empleado) => total + (empleado.sueldoBase || 0) + empleado.devengos, 0);
    }

    get totalDeducciones(): number {
        return this.nominaHistorica.reduce((total, empleado) => total + empleado.deducciones, 0);
    }

    get totalNeto(): number {
        return this.nominaHistorica.reduce((total, empleado) => total + empleado.totalPagar, 0);
    }

    constructor(private empleadosService: EmpleadosService) { }

    ngOnInit(): void {
        this.cargarPeriodos();
    }

  cargarPeriodos(): void {
    this.cargando = true;
    this.empleadosService.getPeriodos().subscribe({
        next: (data: Periodo[]) => {
            const hoy = new Date();
            const hoyISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
            
            // Deduplicación estricta: exactamente 2 quincenas por mes (1ra y 2da)
            const vistos = new Map<string, Periodo>();

            for (const p of data) {
                if (!p.fechaInicio) continue;
                const anioMes = p.fechaInicio.substring(0, 7); // YYYY-MM
                const dia = parseInt(p.fechaInicio.substring(8, 10), 10) || 1;
                const esSegunda = dia > 15 || (p.tipo && p.tipo.includes('2')) || (p.description && (p.description.includes('2da') || p.description.includes('2a')));
                const slot = `${anioMes}_${esSegunda ? 'Q2' : 'Q1'}`;

                // Si ya existe uno para este mes y quincena, preferir el oficial sin paréntesis
                if (!vistos.has(slot)) {
                    vistos.set(slot, p);
                } else {
                    const existente = vistos.get(slot)!;
                    if ((p.description && !p.description.includes('(')) && (existente.description && existente.description.includes('('))) {
                        vistos.set(slot, p);
                    }
                }
            }

            const unicos = Array.from(vistos.values());

            this.periodosTodos = unicos
                .filter(periodo => periodo.fechaInicio <= hoyISO || periodo.estado === 'ABIERTO')
                .sort((a, b) =>
                new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime()
            );

            this.calcularEstadisticas();
            this.aplicarFiltros();
            this.cargando = false;
        },
        error: (err) => {
            console.error('Error al cargar períodos:', err);
            this.periodosTodos = [];
            this.periodos = [];
            this.cargando = false;
            alert('No se pudieron cargar los períodos.\n\nVerifica que el servicio esté activo.');
        }
    });
}

  calcularEstadisticas(): void {
      const quincenas = this.periodosTodos.filter(p => this.esQuincenal(p));
      this.totalQuincenas = quincenas.length;
      this.quincenasAbiertas = quincenas.filter(p => p.estado?.toUpperCase() === 'ABIERTO').length;
      this.quincenasCerradas = quincenas.filter(p => p.estado?.toUpperCase() === 'CERRADO').length;
  }

  esQuincenal(p: Periodo): boolean {
      const tipo = (p.tipo || '').toUpperCase();
      const desc = (p.description || '').toLowerCase();
      return tipo === 'QUINCENAL' || tipo === '1RA' || tipo === '2DA' || desc.includes('quincena');
  }

  setFiltroTipo(tipo: 'QUINCENAL' | 'MENSUAL' | 'TODOS'): void {
      this.filtroTipo = tipo;
      this.aplicarFiltros();
  }

  setFiltroEstado(estado: 'TODOS' | 'ABIERTO' | 'CERRADO'): void {
      this.filtroEstado = estado;
      this.aplicarFiltros();
  }

  aplicarFiltros(): void {
      this.periodos = this.periodosTodos.filter(p => {
          const matchTipo =
              this.filtroTipo === 'TODOS' ? true :
              this.filtroTipo === 'QUINCENAL' ? this.esQuincenal(p) :
              !this.esQuincenal(p);

          const matchEstado =
              this.filtroEstado === 'TODOS' ? true :
              (p.estado || '').toUpperCase() === this.filtroEstado;

          return matchTipo && matchEstado;
      });
  }

    verNominaPeriodo(periodo: Periodo): void {
        this.periodoSeleccionado = periodo;
        this.cargando = true;

        // SMMLV vigente según el año del período (para mostrar en la columna de sueldo base)
        const anio = periodo.anio ?? new Date(periodo.fechaInicio).getFullYear();
        const minimos: Record<number, number> = { 2023: 1300000, 2024: 1423500, 2025: 1623500, 2026: 1750905 };
        this.smmlvPeriodo = minimos[anio] ?? null;

        if (periodo.estado === 'ABIERTO') {
            this.empleadosService.getLiquidacionNomina(periodo.id).subscribe({
                next: (liquidacion: any) => {
                    this.nominaHistorica = (liquidacion.empleados || []).map((empleado: any) => ({
                        id: empleado.id,
                        nombre: empleado.nombre || '',
                        apellido: empleado.apellido || '',
                        sueldoBase: empleado.sueldoBase || 0,
                        devengos: empleado.devengos || 0,
                        deducciones: empleado.deducciones || 0,
                        totalPagar: empleado.totalPagar || 0,
                        detalleDevengos: empleado.detalleDevengos || [],
                        detalleDeducciones: empleado.detalleDeducciones || []
                    }));
                    this.mostrarModalNomina = true;
                    this.cargando = false;
                },
                error: (err) => {
                    console.error('Error al calcular la nómina del período abierto:', err);
                    this.nominaHistorica = [];
                    this.mostrarModalNomina = true;
                    this.cargando = false;
                    alert('No se pudo calcular la nómina del período actual.');
                }
            });
            return;
        }

        this.empleadosService.getPagosPorPeriodo(periodo.id).subscribe({
            next: (pagos: any[]) => {
                if (pagos.length > 0) {
                    this.nominaHistorica = pagos
                        .filter(pago => pago.estado !== 'ANULADO')
                        .map(pago => ({
                            nombre: pago.nombreEmpleado || `Nombre no disponible (ID: ${pago.idEmpleado})`,
                            apellido: '',
                            sueldoBase: null,
                            devengos: pago.totalDevengado || 0,
                            deducciones: pago.totalDeducciones || 0,
                            totalPagar: pago.totalPagar || 0,
                            detalleDevengos: [],
                            detalleDeducciones: []
                        }));
                } else {
                    this.nominaHistorica = [];
                }
                this.mostrarModalNomina = true;
                this.cargando = false;
            },
            error: (err) => {
                console.error('Error al cargar nómina del período:', err);
                this.nominaHistorica = [];
                this.mostrarModalNomina = true;
                this.cargando = false;
                alert('Este período aún no tiene nómina generada o no hay empleados registrados.');
            }
        });
    }

    cerrarModal(): void {
        this.mostrarModalNomina = false;
        this.periodoSeleccionado = null;
        this.nominaHistorica = [];
        this.smmlvPeriodo = null;
    }

    formatearCosto(costoCOP: number): string {
        if (!costoCOP) return '';
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(costoCOP);
    }
}
