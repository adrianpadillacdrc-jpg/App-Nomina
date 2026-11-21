import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export type TipoDocumentoNomina = 'comprobante' | 'novedades' | 'contrato';

@Component({
  selector: 'app-documento-nomina-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './documento-nomina-modal.component.html',
  styleUrls: ['./documento-nomina-modal.component.scss'],
})
export class DocumentoNominaModalComponent implements OnChanges, AfterViewInit {
  @Input() visible = false;
  @Input() pestanaInicial: TipoDocumentoNomina = 'comprobante';
  @Input() empleado: any = null;
  @Input() contrato: any = null;
  @Input() periodo: any = null;
  @Input() novedades: any[] = [];
  @Input() soloLectura = false;

  @Output() cerrar = new EventEmitter<void>();

  @ViewChild('canvasFirmaTrabajador') canvasFirmaTrabajador?: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasFirmaEmpleador')  canvasFirmaEmpleador?: ElementRef<HTMLCanvasElement>;

  pestanaActiva: TipoDocumentoNomina = 'comprobante';
  modoImpresionCompleta = false;
  hoy = new Date();

  // ── Firma táctil ─────────────────────────────────────────────
  firmaTrabajadorGuardada: string | null = null;
  firmaEmpleadorGuardada: string | null = null;
  mostrarPadTrabajador  = false;
  mostrarPadEmpleador   = false;

  private _ctxTrab: CanvasRenderingContext2D | null = null;
  private _ctxEmp:  CanvasRenderingContext2D | null = null;
  private _dibujando = false;
  private _padActivo: 'trab' | 'emp' | null = null;

  // Constantes legales Colombia 2026
  readonly smlmv2026        = 1_750_905;
  readonly auxTransporte2026 = 249_095;

  // ── Lifecycle ────────────────────────────────────────────────
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pestanaInicial'] && this.pestanaInicial) {
      this.pestanaActiva = this.pestanaInicial;
    }
  }

  ngAfterViewInit(): void { /* Los canvas se inicializan al abrir el pad */ }

  // ── Tabs y modal ─────────────────────────────────────────────
  cambiarPestana(p: TipoDocumentoNomina): void {
    this.pestanaActiva = p;
    this.modoImpresionCompleta = false;
  }

  imprimir(): void { window.print(); }

  cerrarModal(): void { this.cerrar.emit(); }

  // ── Pad de firma ─────────────────────────────────────────────
  abrirPadTrabajador(): void {
    this.mostrarPadTrabajador = true;
    setTimeout(() => this._initCanvas('trab'), 50);
  }

  abrirPadEmpleador(): void {
    this.mostrarPadEmpleador = true;
    setTimeout(() => this._initCanvas('emp'), 50);
  }

  private _initCanvas(quien: 'trab' | 'emp'): void {
    const ref = quien === 'trab' ? this.canvasFirmaTrabajador : this.canvasFirmaEmpleador;
    if (!ref) return;
    const canvas = ref.nativeElement;
    canvas.width  = canvas.offsetWidth  || 420;
    canvas.height = canvas.offsetHeight || 160;
    const ctx = canvas.getContext('2d')!;
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    if (quien === 'trab') this._ctxTrab = ctx;
    else                  this._ctxEmp  = ctx;
    this._padActivo = quien;
  }

  private _ctx(): CanvasRenderingContext2D | null {
    return this._padActivo === 'trab' ? this._ctxTrab : this._ctxEmp;
  }

  private _canvas(): HTMLCanvasElement | null {
    const ref = this._padActivo === 'trab' ? this.canvasFirmaTrabajador : this.canvasFirmaEmpleador;
    return ref?.nativeElement ?? null;
  }

  private _pos(e: MouseEvent | TouchEvent): { x: number; y: number } {
    const canvas = this._canvas();
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const src = e instanceof TouchEvent ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  }

  onPointerDown(e: MouseEvent | TouchEvent): void {
    e.preventDefault();
    this._dibujando = true;
    const { x, y } = this._pos(e);
    this._ctx()?.beginPath();
    this._ctx()?.moveTo(x, y);
  }

  onPointerMove(e: MouseEvent | TouchEvent): void {
    if (!this._dibujando) return;
    e.preventDefault();
    const { x, y } = this._pos(e);
    this._ctx()?.lineTo(x, y);
    this._ctx()?.stroke();
  }

  onPointerUp(): void { this._dibujando = false; }

  limpiarFirma(quien: 'trab' | 'emp'): void {
    this._padActivo = quien;
    const canvas = this._canvas();
    const ctx    = this._ctx();
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (quien === 'trab') this.firmaTrabajadorGuardada = null;
    else                  this.firmaEmpleadorGuardada  = null;
  }

  guardarFirma(quien: 'trab' | 'emp'): void {
    this._padActivo = quien;
    const canvas = this._canvas();
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    if (quien === 'trab') {
      this.firmaTrabajadorGuardada = dataUrl;
      this.mostrarPadTrabajador    = false;
    } else {
      this.firmaEmpleadorGuardada = dataUrl;
      this.mostrarPadEmpleador    = false;
    }
  }

  cancelarPad(quien: 'trab' | 'emp'): void {
    if (quien === 'trab') this.mostrarPadTrabajador = false;
    else                  this.mostrarPadEmpleador  = false;
  }

  // ── Cálculos de nómina ───────────────────────────────────────
  get salarioBase(): number { return Number(this.empleado?.salarioBase) || 1_870_236; }

  get sueldoQuincenal(): number { return Math.round(this.salarioBase / 2); }

  get auxilioAplica(): boolean { return this.salarioBase <= this.smlmv2026 * 2; }

  get auxilioQuincenal(): number { return this.auxilioAplica ? Math.round(this.auxTransporte2026 / 2) : 0; }

  get valorHorasExtras(): number {
    if (this.novedades && this.novedades.length > 0) {
      return this.novedades.reduce((acc, n) => acc + (Number(n.valor) || Number(n.monto) || 0), 0);
    }
    return Number(this.empleado?.totalExtras) || 0;
  }

  get totalDevengado(): number { return this.sueldoQuincenal + this.auxilioQuincenal + this.valorHorasExtras; }

  get ibc(): number { return this.sueldoQuincenal + this.valorHorasExtras; }

  get deduccionSalud(): number   { return Math.round(this.ibc * 0.04); }
  get deduccionPension(): number { return Math.round(this.ibc * 0.04); }
  get totalDeducido(): number    { return this.deduccionSalud + this.deduccionPension; }
  get totalNeto(): number        { return this.totalDevengado - this.totalDeducido; }

  get codigoDocumento(): string {
    const doc = this.empleado?.numeroDocumento || '0000';
    return `CP-2026-11-Q2-${doc}`;
  }

  get codigoContrato(): string {
    const doc = this.empleado?.numeroDocumento || '0000';
    return `CT-${doc}`;
  }

  get descripcionPeriodo(): string {
    return this.periodo?.description || this.periodo?.descripcion || 'Noviembre 2026, 2.ª quincena';
  }

  get nombreCompleto(): string {
    if (!this.empleado) return 'Juan Antonio Cabrera García';
    return `${this.empleado.nombre || ''} ${this.empleado.apellido || ''}`.trim();
  }

  get documentoIdentidad(): string { return this.empleado?.numeroDocumento || '1000007919'; }
  get cargo(): string              { return this.empleado?.cargo || 'Auxiliar de Bodega'; }
  get direccionEmpleado(): string  { return this.empleado?.direccion || 'Avenida 30 #61-64'; }
  get telefonoEmpleado(): string   { return this.empleado?.telefono  || 'Sin registrar'; }

  get fechaInicioContrato(): string {
    return this.contrato?.fechaInicio || this.empleado?.fechaInicioContrato || '2024-02-25';
  }

  get fechaFinContrato(): string {
    return this.contrato?.fechaFin || this.empleado?.fechaFinContrato || '2027-02-25';
  }

  formatCOP(val: number): string {
    return '$ ' + Math.round(val).toLocaleString('es-CO');
  }
}
