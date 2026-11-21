import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient, HttpHeaders } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { jsPDF } from 'jspdf';
import { SidebarComponent } from '../../guards/components/sidebar/sidebar.component';
import { EncabezadoPaginaComponent } from '../../shared/components/encabezado-pagina/encabezado-pagina.component';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

// ── Interfaces del Simulador de 3 Escenarios ───────────────────────────────────

export interface DemandaFranja {
  diurna: number;
  nocturna: number;
  dom_diurna: number;
  dom_nocturna: number;
}

export interface CargoConfig {
  cargo_id: number;
  cargo_nombre: string;
  n_activos?: number;
  salario: number;
  demanda: DemandaFranja;
}

export interface AlertaSobrecarga {
  cargo_id: number;
  cargo_nombre: string;
  nivel: string;
  mensaje: string;
  horas_demanda_total: number;
  capacidad_maxima_legal: number;
  deficit_horas: number;
  contrataciones_minimas_requeridas: number;
}

export interface DetalleCargoEscenario {
  cargo_id: number;
  cargo_nombre: string;
  n_activos: number;
  nuevos_a_contratar: number;
  total_horas_extra: number;
  costo_adicional_semanal: number;
  costo_total_semanal: number;
  estado_solver: string;
}

export interface EscenarioResultado {
  nombre: string;
  descripcion: string;
  factible: boolean;
  costo_total_adicional: number;
  costo_total_semanal: number;
  total_nuevos_a_contratar: number;
  total_horas_extra: number;
  ahorro_vs_conservador: number;
  cargos: DetalleCargoEscenario[];
}

export interface SimulacionResponse {
  fecha_ejecucion: string;
  alertas_sobrecarga: AlertaSobrecarga[];
  hay_violacion_legal_severa: boolean;
  escenario_conservador: EscenarioResultado;
  escenario_optimo: EscenarioResultado;
  escenario_expansion: EscenarioResultado;
  recomendacion_solver: string;
  analisis_gemini: string;
  parametros: any;
}

@Component({
  selector: 'app-optimizacion',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    RouterModule,
    SidebarComponent,
    EncabezadoPaginaComponent
  ],
  templateUrl: './optimizacion.component.html',
  styleUrls: ['./optimizacion.component.css']
})
export class OptimizacionComponent implements OnInit {

  readonly API = environment.apiUrl || 'http://localhost:8080';

  // Parámetros legales (Colombia 2026)
  horasSemanMax = 42;
  horasExtraMaxSemana = 12;
  horasDomMaxSemana = 8;

  // Cargos precargados con demanda semanal editable y equipo activo
  cargos: CargoConfig[] = [
    { cargo_id: 1, cargo_nombre: 'Ventas',             n_activos: 65, salario: 1_750_905, demanda: { diurna: 2000, nocturna: 800, dom_diurna: 300, dom_nocturna: 80 } },
    { cargo_id: 2, cargo_nombre: 'Cajero',             n_activos: 50, salario: 1_750_905, demanda: { diurna: 1600, nocturna: 650, dom_diurna: 240, dom_nocturna: 60 } },
    { cargo_id: 3, cargo_nombre: 'Auxiliar de Bodega', n_activos: 45, salario: 1_750_905, demanda: { diurna: 1550, nocturna: 600, dom_diurna: 220, dom_nocturna: 50 } },
  ];

  // Estado del flujo
  cargando = false;
  generandoVacantes = false;
  error = '';
  mensajeVacantes = '';
  simulacion?: SimulacionResponse;

  // Escenario seleccionado para inspeccionar en la vista
  escenarioActivo: 'optimo' | 'conservador' | 'expansion' = 'optimo';

  // ── Modelo Matemático 2D: Región Factible (PL / MILP) ──────────────────────
  mostrarRegionFactible = true;
  factorCostoExtra = 1.0; // Multiplicador slider (0.5 a 2.0)
  readonly costoHoraExtraBase = 10763;
  readonly costoContratoSemanal = 612740;
  readonly costoBaseFijo = 13668083;
  readonly demandaR1 = 1430;
  readonly topeLegalR2 = 1920;
  readonly factorEquilibrio = 1.3556; // 612.740 / (42 * 10.763) = 1.3556

  get costoHoraExtraActual(): number {
    return Math.round(this.costoHoraExtraBase * this.factorCostoExtra);
  }

  setPresetCostoExtra(factor: number): void {
    this.factorCostoExtra = factor;
  }

  get esModoHorasExtras(): boolean {
    return this.factorCostoExtra <= this.factorEquilibrio;
  }

  get verticeA() {
    const x1 = 0;
    const x2 = this.demandaR1;
    const z = this.costoBaseFijo + (this.costoContratoSemanal * x1) + (this.costoHoraExtraActual * x2);
    return { x1, x2, z };
  }

  get verticeB() {
    const x1 = 34.05;
    const x2 = 0;
    const z = this.costoBaseFijo + (this.costoContratoSemanal * (this.demandaR1 / 42)) + (this.costoHoraExtraActual * x2);
    return { x1, x2, z };
  }

  get verticeC() {
    const x1 = 0;
    const x2 = this.topeLegalR2;
    const z = this.costoBaseFijo + (this.costoContratoSemanal * x1) + (this.costoHoraExtraActual * x2);
    return { x1, x2, z };
  }

  get verticeMinimo(): 'A' | 'B' {
    return this.verticeA.z <= this.verticeB.z ? 'A' : 'B';
  }

  get optimoActual() {
    if (this.esModoHorasExtras) {
      return {
        punto: 'A',
        x1: 0,
        x2: 1430,
        z: this.verticeA.z,
        titulo: 'Vértice A (Prioridad Horas Extras)',
        razon: 'Horas extras a bajo costo: sale más barato pagar horas extras ($ ' + this.formatMillones(this.verticeA.z) + ') que abrir contratos fijos ($ ' + this.formatMillones(this.verticeB.z) + ').'
      };
    } else {
      return {
        punto: 'B',
        x1: 34.05,
        x2: 0,
        z: this.verticeB.z,
        titulo: 'Vértice B (Prioridad Nuevas Contrataciones)',
        razon: 'Recargos elevados: pagar horas extras se vuelve carísimo ($ ' + this.formatMillones(this.verticeA.z) + '). Lo más económico es contratar personal fijo ($ ' + this.formatMillones(this.verticeB.z) + ').'
      };
    }
  }

  get svgPuntoOptimoActual() {
    const opt = this.optimoActual;
    return {
      cx: this.mapX(opt.x1),
      cy: this.mapY(opt.x2)
    };
  }

  get puntoConservador() {
    return { x1: 0, x2: 1430, z: this.costoBaseFijo + (this.costoHoraExtraActual * 1430) };
  }

  get puntoOptimoMILP() {
    const x1 = 32, x2 = 86;
    const z = this.costoBaseFijo + (this.costoContratoSemanal * x1) + (this.costoHoraExtraActual * x2);
    return { x1, x2, z };
  }

  get puntoExpansion() {
    const x1 = 35, x2 = 0;
    const z = this.costoBaseFijo + (this.costoContratoSemanal * x1);
    return { x1, x2, z };
  }

  // Mapeo a coordenadas SVG (viewBox="0 0 620 370")
  mapX(x1: number): number {
    const left = 65, right = 585;
    return left + (x1 / 42) * (right - left);
  }

  mapY(x2: number): number {
    const top = 30, bottom = 320;
    return bottom - (x2 / 2200) * (bottom - top);
  }

  get svgRegionFactible(): string {
    const pA = `${this.mapX(0)},${this.mapY(1430)}`;
    const pB = `${this.mapX(34.05)},${this.mapY(0)}`;
    const pRightBottom = `${this.mapX(42)},${this.mapY(0)}`;
    const pRightTop = `${this.mapX(42)},${this.mapY(2200)}`;
    const pLeftTop = `${this.mapX(0)},${this.mapY(2200)}`;
    return `${pA} ${pB} ${pRightBottom} ${pRightTop} ${pLeftTop}`;
  }

  get isocostLine1(): string {
    const c1 = this.costoContratoSemanal;
    const c2 = this.costoHoraExtraActual;
    const opt = this.optimoActual;
    const zRel = c1 * opt.x1 + c2 * opt.x2;
    const x1_a = 0;
    const x2_a = Math.min(2200, zRel / c2);
    const x1_b = Math.min(42, zRel / c1);
    const x2_b = 0;
    return `M ${this.mapX(x1_a)} ${this.mapY(x2_a)} L ${this.mapX(x1_b)} ${this.mapY(x2_b)}`;
  }

  get isocostLine2(): string {
    const c1 = this.costoContratoSemanal;
    const c2 = this.costoHoraExtraActual;
    const opt = this.optimoActual;
    const zRel = (c1 * opt.x1 + c2 * opt.x2) * 1.15;
    const x1_a = 0;
    const x2_a = Math.min(2200, zRel / c2);
    const x1_b = Math.min(42, zRel / c1);
    const x2_b = 0;
    return `M ${this.mapX(x1_a)} ${this.mapY(x2_a)} L ${this.mapX(x1_b)} ${this.mapY(x2_b)}`;
  }

  constructor(private http: HttpClient, private auth: AuthService) {}

  ngOnInit(): void {}

  get token(): string {
    return this.auth.getToken?.() ?? localStorage.getItem('token') ?? '';
  }

  get escenarioActual(): EscenarioResultado | undefined {
    if (!this.simulacion) return undefined;
    if (this.escenarioActivo === 'conservador') return this.simulacion.escenario_conservador;
    if (this.escenarioActivo === 'expansion') return this.simulacion.escenario_expansion;
    return this.simulacion.escenario_optimo;
  }

  // ── Métricas y Cálculos de Demanda en Tiempo Real ───────────────────────────
  totalHorasCargo(c: CargoConfig): number {
    return Math.round(
      (Number(c.demanda.diurna) || 0) +
      (Number(c.demanda.nocturna) || 0) +
      (Number(c.demanda.dom_diurna) || 0) +
      (Number(c.demanda.dom_nocturna) || 0)
    );
  }

  capacidadOrdinariaCargo(c: CargoConfig): number {
    return (c.n_activos || 1) * this.horasSemanMax;
  }

  capacidadMaxLegalCargo(c: CargoConfig): number {
    return (c.n_activos || 1) * (this.horasSemanMax + this.horasExtraMaxSemana);
  }

  estadoCargo(c: CargoConfig): { label: string; clase: string } {
    const total = this.totalHorasCargo(c);
    const ord = this.capacidadOrdinariaCargo(c);
    const max = this.capacidadMaxLegalCargo(c);
    if (total > max) {
      return { label: 'Sobrecarga Severa', clase: 'pill-danger' };
    }
    if (total > ord) {
      return { label: 'Requiere Extras', clase: 'pill-warning' };
    }
    return { label: 'Capacidad OK', clase: 'pill-success' };
  }

  get totalPersonalActivo(): number {
    return this.cargos.reduce((acc, c) => acc + (c.n_activos || 0), 0);
  }

  get totalDiurna(): number {
    return this.cargos.reduce((acc, c) => acc + (Number(c.demanda.diurna) || 0), 0);
  }

  get totalNocturna(): number {
    return this.cargos.reduce((acc, c) => acc + (Number(c.demanda.nocturna) || 0), 0);
  }

  get totalDomDiurna(): number {
    return this.cargos.reduce((acc, c) => acc + (Number(c.demanda.dom_diurna) || 0), 0);
  }

  get totalDomNocturna(): number {
    return this.cargos.reduce((acc, c) => acc + (Number(c.demanda.dom_nocturna) || 0), 0);
  }

  get granTotalDemanda(): number {
    return this.totalDiurna + this.totalNocturna + this.totalDomDiurna + this.totalDomNocturna;
  }

  get granTotalCapacidadOrdinaria(): number {
    return this.totalPersonalActivo * this.horasSemanMax;
  }

  get horasSuplementariasProyectadas(): number {
    return Math.max(0, this.granTotalDemanda - this.granTotalCapacidadOrdinaria);
  }

  // ── Presets Rápidos ────────────────────────────────────────────────────────
  cargarOperacionEstandar(): void {
    this.cargos = [
      { cargo_id: 1, cargo_nombre: 'Ventas',             n_activos: 65, salario: 1_750_905, demanda: { diurna: 2000, nocturna: 800, dom_diurna: 300, dom_nocturna: 80 } },
      { cargo_id: 2, cargo_nombre: 'Cajero',             n_activos: 50, salario: 1_750_905, demanda: { diurna: 1600, nocturna: 650, dom_diurna: 240, dom_nocturna: 60 } },
      { cargo_id: 3, cargo_nombre: 'Auxiliar de Bodega', n_activos: 45, salario: 1_750_905, demanda: { diurna: 1550, nocturna: 600, dom_diurna: 220, dom_nocturna: 50 } },
    ];
  }

  cargarTemporadaAlta(): void {
    this.cargos = [
      { cargo_id: 1, cargo_nombre: 'Ventas',             n_activos: 65, salario: 1_750_905, demanda: { diurna: 2700, nocturna: 1050, dom_diurna: 420, dom_nocturna: 120 } },
      { cargo_id: 2, cargo_nombre: 'Cajero',             n_activos: 50, salario: 1_750_905, demanda: { diurna: 2100, nocturna: 850, dom_diurna: 320, dom_nocturna: 90 } },
      { cargo_id: 3, cargo_nombre: 'Auxiliar de Bodega', n_activos: 45, salario: 1_750_905, demanda: { diurna: 2000, nocturna: 800, dom_diurna: 290, dom_nocturna: 70 } },
    ];
  }

  // ── Formateo ────────────────────────────────────────────────────────────────
  formatCOP(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(value || 0);
  }

  formatMillones(value: number): string {
    const mill = (value || 0) / 1_000_000;
    return `$ ${mill.toFixed(1)} M`;
  }

  // ── Simular los 3 Escenarios ────────────────────────────────────────────────
  simular(): void {
    this.cargando = true;
    this.error = '';
    this.mensajeVacantes = '';

    const demandaPorCargo: Record<number, DemandaFranja> = {};
    for (const c of this.cargos) {
      demandaPorCargo[c.cargo_id] = {
        diurna: Math.max(0, Number(c.demanda.diurna) || 0),
        nocturna: Math.max(0, Number(c.demanda.nocturna) || 0),
        dom_diurna: Math.max(0, Number(c.demanda.dom_diurna) || 0),
        dom_nocturna: Math.max(0, Number(c.demanda.dom_nocturna) || 0),
      };
    }

    const body = {
      demandaPorCargo,
      horasSemanMax: this.horasSemanMax,
      horasExtraMaxSemana: this.horasExtraMaxSemana,
      horasDomMaxSemana: this.horasDomMaxSemana
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`
    });

    this.http.post<SimulacionResponse>(`${this.API}/api/optimizacion/simular`, body, { headers })
      .subscribe({
        next: (res) => {
          this.simulacion = res;
          this.escenarioActivo = 'optimo';
          this.cargando = false;
        },
        error: (err) => {
          this.error = err?.error?.message ?? err?.message ?? 'Error al conectar con el servidor de simulación.';
          this.cargando = false;
        }
      });
  }

  // ── Convertir Solicitud a Vacantes en Borrador ─────────────────────────────
  generarVacantesEnBorrador(): void {
    if (!this.simulacion || !this.simulacion.escenario_optimo) return;

    this.generandoVacantes = true;
    this.mensajeVacantes = '';

    const contratacionesPorCargo: Record<number, number> = {};
    for (const c of this.simulacion.escenario_optimo.cargos) {
      if (c.nuevos_a_contratar > 0) {
        contratacionesPorCargo[c.cargo_id] = c.nuevos_a_contratar;
      }
    }

    const body = { contrataciones_por_cargo: contratacionesPorCargo };
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`
    });

    this.http.post<any>(`${this.API}/api/optimizacion/generar-vacantes`, body, { headers })
      .subscribe({
        next: (res) => {
          this.mensajeVacantes = res.mensaje || 'Vacantes generadas exitosamente en estado BORRADOR.';
          this.generandoVacantes = false;
        },
        error: (err) => {
          this.error = err?.error?.mensaje ?? 'Error al generar las solicitudes de vacantes.';
          this.generandoVacantes = false;
        }
      });
  }

  // ── Exportación Formal en PDF con jsPDF ────────────────────────────────────
  descargarPDFEjecutivo(): void {
    if (!this.simulacion) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 15;

    // Encabezado Corporativo
    doc.setFillColor(109, 40, 217); // Púrpura NUMA
    doc.rect(0, 0, pageWidth, 24, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('NUMA STORE — NÓMINA INTELIGENTE', 14, 12);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Reporte Ejecutivo: Planificación y Optimización de Turnos (Ley 42h Colombia 2026)', 14, 18);

    y = 32;

    // Metadatos
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(9);
    doc.text(`Fecha de Emisión: ${new Date(this.simulacion.fecha_ejecucion).toLocaleString('es-CO')}`, 14, y);
    doc.text(`Estado del Solver: ${this.simulacion.recomendacion_solver}`, 120, y);
    y += 8;

    // 1. COMPARATIVA DE LOS 3 ESCENARIOS
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(109, 40, 217);
    doc.text('1. COMPARATIVA DE ESCENARIOS ("¿Qué pasaría si...?")', 14, y);
    y += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(243, 244, 246);
    doc.rect(14, y, pageWidth - 28, 7, 'F');
    doc.setTextColor(30, 30, 30);
    doc.text('Escenario', 16, y + 5);
    doc.text('Nuevos Contratos', 70, y + 5);
    doc.text('Horas Extra / sem', 110, y + 5);
    doc.text('Costo Adicional Semanal', 150, y + 5);
    y += 9;

    const escList = [
      { tag: 'Conservador (0 contratos)', data: this.simulacion.escenario_conservador },
      { tag: 'Óptimo (MILP sugerido)',    data: this.simulacion.escenario_optimo },
      { tag: 'Expansión (0 extras)',      data: this.simulacion.escenario_expansion }
    ];

    doc.setFont('helvetica', 'normal');
    for (const item of escList) {
      if (item.data) {
        doc.text(item.tag, 16, y);
        doc.text(`${item.data.total_nuevos_a_contratar} pers.`, 75, y);
        doc.text(`${Math.round(item.data.total_horas_extra)} h`, 115, y);
        doc.text(this.formatCOP(item.data.costo_total_adicional), 150, y);
        y += 6;
      }
    }

    if (this.simulacion.escenario_optimo && this.simulacion.escenario_optimo.ahorro_vs_conservador > 0) {
      y += 2;
      doc.setFillColor(236, 253, 245);
      doc.rect(14, y, pageWidth - 28, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(5, 150, 105);
      doc.text(
        `AHORRO PROYECTADO CON ESCENARIO ÓPTIMO: ${this.formatCOP(this.simulacion.escenario_optimo.ahorro_vs_conservador)} semanales`,
        16,
        y + 5
      );
      y += 11;
    } else {
      y += 6;
    }

    // 2. ALERTAS DE SOBRECARGA Y FATIGA
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(220, 38, 38);
    doc.text('2. AUDITORÍA NORMATIVA Y ALERTAS DE FATIGA', 14, y);
    y += 6;

    if (!this.simulacion.alertas_sobrecarga || this.simulacion.alertas_sobrecarga.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 50);
      doc.text('Sin alertas de sobrecarga legal detectadas. La jornada planificada cumple los límites del MinTrabajo.', 14, y);
      y += 8;
    } else {
      doc.setFontSize(8.5);
      for (const al of this.simulacion.alertas_sobrecarga) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(185, 28, 28);
        doc.text(`• [${al.cargo_nombre}]:`, 14, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 50, 50);
        const splitText = doc.splitTextToSize(al.mensaje, pageWidth - 50);
        doc.text(splitText, 45, y);
        y += (splitText.length * 4.5) + 2;
      }
      y += 4;
    }

    // 3. ANÁLISIS ESTRATÉGICO DE GEMINI
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(109, 40, 217);
    doc.text('3. DIAGNÓSTICO ESTRATÉGICO DE INTELIGENCIA ARTIFICIAL (GEMINI)', 14, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(40, 40, 40);
    const splitAnalisis = doc.splitTextToSize(this.simulacion.analisis_gemini || 'Análisis no generado.', pageWidth - 28);
    doc.text(splitAnalisis, 14, y);
    y += (splitAnalisis.length * 4.2) + 8;

    // 4. CUADRO DE CUMPLIMIENTO LEGAL (Colombia 2026)
    if (y < 240) {
      doc.setFillColor(249, 250, 251);
      doc.rect(14, y, pageWidth - 28, 26, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(75, 85, 99);
      doc.text('MARCO NORMATIVO VIGENTE (COLOMBIA 2026):', 16, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('• Jornada máxima semanal: 42 horas (Ley 2101 / Divisor 210 para valor de hora ordinaria).', 16, y + 10);
      doc.text('• Límite legal de horas extra: máximo 2 horas diarias y 12 horas semanales.', 16, y + 15);
      doc.text('• Factor recargo dominical: 100% sobre hora ordinaria (1.90x diurna, 2.25x nocturna).', 16, y + 20);
    }

    // Pie de página
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Generado por Sistema NUMA Nómina — Planificación Óptima MILP & Gemini AI', 14, 288);

    doc.save(`Reporte_Ejecutivo_Optimizacion_NUMA_${Date.now()}.pdf`);
  }

  resetear(): void {
    this.simulacion = undefined;
    this.error = '';
    this.mensajeVacantes = '';
  }

  trackByCargo(_: number, item: CargoConfig) { return item.cargo_id; }
}
