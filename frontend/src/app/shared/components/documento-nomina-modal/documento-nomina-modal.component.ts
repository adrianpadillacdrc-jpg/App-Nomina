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
import { ContratosService, Contrato } from '../../../services/contratos.service';
import { EmpleadosService } from '../../../services/empleados.service';

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
  @Output() renovar = new EventEmitter<any>();

  @ViewChild('canvasFirmaTrabajador') canvasFirmaTrabajador?: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasFirmaEmpleador')  canvasFirmaEmpleador?: ElementRef<HTMLCanvasElement>;

  pestanaActiva: TipoDocumentoNomina = 'comprobante';
  modoImpresionCompleta = false;
  hoy = new Date();

  // ── Renovación de contrato ────────────────────────────────────
  mostrarModalRenovacion = false;
  guardandoRenovacion = false;
  mensajeErrorRenovacion = '';
  mensajeExitoRenovacion = '';

  renovacion = {
    tipoContrato: 'TERMINO_FIJO',
    fechaInicio: '',
    fechaFin: '',
    salario: 0,
    duracionMeses: 12
  };

  constructor(
    private contratosService: ContratosService,
    private empleadosService: EmpleadosService
  ) {}

  // ── Firma táctil ─────────────────────────────────────────────
  firmaTrabajadorGuardada: string | null = null;
  firmaEmpleadorGuardada: string | null = null;
  mostrarPadTrabajador  = false;
  mostrarPadEmpleador   = false;

  // ── Firma con código OTP (tabla firma_contrato_codigo) ─────
  mostrarModalOTP = false;
  codigoOTPInput = '';
  codigoEnviado = false;
  enviandoCodigoOTP = false;
  validandoCodigoOTP = false;
  mensajeExitoOTP = '';
  mensajeErrorOTP = '';
  correoDestinoOTP = '';

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
    if (changes['empleado'] || changes['visible']) {
      this.cargarFirmasPermanentes();
    }
  }

  cargarFirmasPermanentes(): void {
    try {
      // 1. Firma del empleador (Adrian Padilla - Representante legal)
      if (this.contrato?.firmaEmpleador) {
        this.firmaEmpleadorGuardada = this.contrato.firmaEmpleador;
      } else {
        const fEmpLocal = localStorage.getItem('numa_firma_empleador_adrian');
        if (fEmpLocal) {
          this.firmaEmpleadorGuardada = fEmpLocal;
        } else {
          this.empleadosService.getEmpresas().subscribe({
            next: (empresas) => {
              const emp = empresas?.[0];
              if (emp?.firmaRepresentante) {
                this.firmaEmpleadorGuardada = emp.firmaRepresentante;
                try { localStorage.setItem('numa_firma_empleador_adrian', emp.firmaRepresentante); } catch (e) {}
              }
            }
          });
        }
      }

      // 2. Firma del trabajador (por contrato, por empleado BD, o por localStorage)
      if (this.contrato?.firmaEmpleado) {
        this.firmaTrabajadorGuardada = this.contrato.firmaEmpleado;
      } else if (this.empleado?.firmaDigital) {
        this.firmaTrabajadorGuardada = this.empleado.firmaDigital;
        try { localStorage.setItem(`numa_firma_trab_${this.documentoIdentidad}`, this.empleado.firmaDigital); } catch (e) {}
      } else {
        const doc = this.documentoIdentidad;
        const fTrabLocal = doc ? localStorage.getItem(`numa_firma_trab_${doc}`) : null;
        if (fTrabLocal) {
          this.firmaTrabajadorGuardada = fTrabLocal;
        } else {
          this.firmaTrabajadorGuardada = null;
          const idEmp = this.empleado?.id || this.empleado?.idEmpleado;
          if (idEmp) {
            this.empleadosService.getEmpleadoPorId(idEmp).subscribe({
              next: (emp) => {
                if (emp?.firmaDigital) {
                  this.firmaTrabajadorGuardada = emp.firmaDigital;
                  try { localStorage.setItem(`numa_firma_trab_${this.documentoIdentidad}`, emp.firmaDigital); } catch (e) {}
                }
              }
            });
          }
        }
      }
    } catch (e) {
      console.warn('Error cargando firmas permanentes:', e);
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
    if (quien === 'trab') {
      this.firmaTrabajadorGuardada = null;
      try { localStorage.removeItem(`numa_firma_trab_${this.documentoIdentidad}`); } catch (e) {}
      const idEmp = this.empleado?.id || this.empleado?.idEmpleado;
      if (idEmp) this.empleadosService.guardarFirmaEmpleado(idEmp, '').subscribe();
    } else {
      this.firmaEmpleadorGuardada  = null;
      try { localStorage.removeItem('numa_firma_empleador_adrian'); } catch (e) {}
      this.empleadosService.guardarFirmaEmpresa(1, '').subscribe();
    }
  }

  guardarFirma(quien: 'trab' | 'emp'): void {
    this._padActivo = quien;
    const canvas = this._canvas();
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    if (quien === 'trab') {
      this.firmaTrabajadorGuardada = dataUrl;
      this.mostrarPadTrabajador    = false;
      try { localStorage.setItem(`numa_firma_trab_${this.documentoIdentidad}`, dataUrl); } catch (e) {}
      const idEmp = this.empleado?.id || this.empleado?.idEmpleado;
      if (idEmp) {
        this.empleadosService.guardarFirmaEmpleado(idEmp, dataUrl).subscribe({
          next: () => console.log('✅ Firma de empleado guardada permanentemente en PostgreSQL'),
          error: (err) => console.warn('⚠️ No se pudo guardar firma de empleado en BD:', err)
        });
      }
      if (this.contrato?.id) {
        this.contratosService.guardarFirmaEmpleadoContrato(this.contrato.id, dataUrl).subscribe({
          next: () => console.log('✅ Firma de empleado guardada en Contrato en PostgreSQL'),
          error: (err) => console.warn('⚠️ No se pudo guardar firma en contrato:', err)
        });
      }
    } else {
      this.firmaEmpleadorGuardada = dataUrl;
      this.mostrarPadEmpleador    = false;
      try { localStorage.setItem('numa_firma_empleador_adrian', dataUrl); } catch (e) {}
      this.empleadosService.guardarFirmaEmpresa(1, dataUrl).subscribe({
        next: () => console.log('✅ Firma del representante guardada permanentemente en PostgreSQL'),
        error: (err) => console.warn('⚠️ No se pudo guardar firma de empresa en BD:', err)
      });
      if (this.contrato?.id) {
        this.contratosService.guardarFirmaEmpleadorContrato(this.contrato.id, dataUrl).subscribe({
          next: () => console.log('✅ Firma de empleador guardada en Contrato en PostgreSQL'),
          error: (err) => console.warn('⚠️ No se pudo guardar firma de empleador en contrato:', err)
        });
      }
    }
  }

  cancelarPad(quien: 'trab' | 'emp'): void {
    if (quien === 'trab') this.mostrarPadTrabajador = false;
    else                  this.mostrarPadEmpleador  = false;
  }

  // ── Métodos Firma con Código de Seguridad OTP ────────────────
  esFirmaOTP(firma: string | null): boolean {
    return !!firma && firma.startsWith('FIRMADO_ELECTRONICAMENTE_OTP');
  }

  obtenerDetalleFirmaOTP(firma: string | null): string {
    if (!firma || !firma.startsWith('FIRMADO_ELECTRONICAMENTE_OTP')) return '';
    const partes = firma.split(':');
    const correo = partes[1] || '';
    return correo ? `Firma verificada vía código enviado a ${correo}` : 'Firma electrónica verificada vía OTP';
  }

  abrirModalOTP(): void {
    this.mostrarModalOTP = true;
    this.codigoOTPInput = '';
    this.codigoEnviado = false;
    this.mensajeExitoOTP = '';
    this.mensajeErrorOTP = '';
    this.correoDestinoOTP = this.empleado?.correo || 'correo del empleado';
  }

  cerrarModalOTP(): void {
    this.mostrarModalOTP = false;
    this.codigoOTPInput = '';
    this.mensajeExitoOTP = '';
    this.mensajeErrorOTP = '';
  }

  solicitarCodigoOTP(): void {
    const idContrato = this.contrato?.id;
    if (!idContrato) {
      this.mensajeErrorOTP = 'No se encontró el ID del contrato activo para solicitar el código.';
      return;
    }

    this.enviandoCodigoOTP = true;
    this.mensajeErrorOTP = '';
    this.mensajeExitoOTP = '';

    this.contratosService.solicitarCodigoFirma(idContrato).subscribe({
      next: (res) => {
        this.enviandoCodigoOTP = false;
        this.codigoEnviado = true;
        this.correoDestinoOTP = res.correoEnmascarado || this.correoDestinoOTP;
        this.mensajeExitoOTP = res.mensaje || 'Código de seguridad generado y enviado.';
      },
      error: (err) => {
        this.enviandoCodigoOTP = false;
        this.mensajeErrorOTP = err.error?.error || 'Error al solicitar el código de verificación.';
      }
    });
  }

  validarCodigoOTP(): void {
    const idContrato = this.contrato?.id;
    if (!idContrato) {
      this.mensajeErrorOTP = 'No se encontró el contrato a firmar.';
      return;
    }
    if (!this.codigoOTPInput || this.codigoOTPInput.trim().length !== 6) {
      this.mensajeErrorOTP = 'Por favor ingresa los 6 dígitos del código.';
      return;
    }

    this.validandoCodigoOTP = true;
    this.mensajeErrorOTP = '';
    this.mensajeExitoOTP = '';

    this.contratosService.verificarCodigoFirma(idContrato, this.codigoOTPInput.trim(), this.firmaTrabajadorGuardada || '').subscribe({
      next: (contratoActualizado) => {
        this.validandoCodigoOTP = false;
        this.contrato = contratoActualizado;
        this.firmaTrabajadorGuardada = contratoActualizado.firmaEmpleado || 'FIRMADO_ELECTRONICAMENTE_OTP';
        try {
          localStorage.setItem(`numa_firma_trab_${this.documentoIdentidad}`, this.firmaTrabajadorGuardada);
        } catch (e) {}
        this.mensajeExitoOTP = '¡Contrato firmado y validado con éxito!';
        setTimeout(() => {
          this.cerrarModalOTP();
        }, 1200);
      },
      error: (err) => {
        this.validandoCodigoOTP = false;
        this.mensajeErrorOTP = err.error?.error || 'Código inválido o ha ocurrido un error.';
      }
    });
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

  // ── Métodos de Renovación de Contrato ─────────────────────────
  abrirModalRenovacion(): void {
    let inicio = '';
    if (this.fechaFinContrato) {
      const fFin = new Date(this.fechaFinContrato);
      if (!isNaN(fFin.getTime())) {
        fFin.setDate(fFin.getDate() + 1);
        inicio = fFin.toISOString().split('T')[0];
      }
    }
    if (!inicio) {
      inicio = new Date().toISOString().split('T')[0];
    }

    const fInicio = new Date(inicio);
    const fFinNueva = new Date(fInicio);
    fFinNueva.setFullYear(fFinNueva.getFullYear() + 1);
    fFinNueva.setDate(fFinNueva.getDate() - 1);

    this.renovacion = {
      tipoContrato: this.contrato?.idTipoContrato || 'TERMINO_FIJO',
      fechaInicio: inicio,
      fechaFin: fFinNueva.toISOString().split('T')[0],
      salario: this.salarioBase,
      duracionMeses: 12
    };
    this.mensajeErrorRenovacion = '';
    this.mensajeExitoRenovacion = '';
    this.mostrarModalRenovacion = true;
  }

  cerrarModalRenovacion(): void {
    if (this.guardandoRenovacion) return;
    this.mostrarModalRenovacion = false;
  }

  setDuracionMeses(meses: number): void {
    this.renovacion.duracionMeses = meses;
    if (!this.renovacion.fechaInicio) return;
    const fInicio = new Date(this.renovacion.fechaInicio);
    if (isNaN(fInicio.getTime())) return;
    const fFin = new Date(fInicio);
    fFin.setMonth(fFin.getMonth() + meses);
    fFin.setDate(fFin.getDate() - 1);
    this.renovacion.fechaFin = fFin.toISOString().split('T')[0];
  }

  calcularFechaFinPorDuracion(): void {
    if (this.renovacion.duracionMeses && this.renovacion.tipoContrato !== 'INDEFINIDO') {
      this.setDuracionMeses(this.renovacion.duracionMeses);
    }
  }

  confirmarRenovacion(): void {
    if (!this.empleado) return;
    if (!this.renovacion.fechaInicio) {
      this.mensajeErrorRenovacion = 'Debes ingresar una fecha de inicio.';
      return;
    }
    if (this.renovacion.tipoContrato !== 'INDEFINIDO' && !this.renovacion.fechaFin) {
      this.mensajeErrorRenovacion = 'Debes ingresar la fecha de vencimiento.';
      return;
    }
    if (this.renovacion.tipoContrato !== 'INDEFINIDO' && this.renovacion.fechaFin <= this.renovacion.fechaInicio) {
      this.mensajeErrorRenovacion = 'La fecha de fin debe ser posterior a la fecha de inicio.';
      return;
    }

    this.guardandoRenovacion = true;
    this.mensajeErrorRenovacion = '';
    this.mensajeExitoRenovacion = '';

    const idEmp = Number(this.empleado.id || this.empleado.idEmpleado || this.empleado.documento);
    const payload: Contrato = {
      idEmpleado: idEmp,
      idTipoContrato: this.renovacion.tipoContrato,
      fechaInicio: this.renovacion.fechaInicio,
      fechaFin: this.renovacion.tipoContrato === 'INDEFINIDO' ? '' : this.renovacion.fechaFin,
      estado: 'VIGENTE'
    };

    this.contratosService.crearContrato(payload).subscribe({
      next: (nuevo) => {
        this.guardandoRenovacion = false;
        this.mensajeExitoRenovacion = '¡Contrato renovado con éxito!';
        this.contrato = nuevo;
        if (this.empleado) {
          this.empleado.fechaInicioContrato = nuevo.fechaInicio;
          this.empleado.fechaFinContrato = nuevo.fechaFin;
          if (this.renovacion.salario && this.renovacion.salario !== this.salarioBase) {
            this.empleado.salarioBase = this.renovacion.salario;
          }
        }
        this.renovar.emit(nuevo);
        setTimeout(() => {
          this.mostrarModalRenovacion = false;
          this.mensajeExitoRenovacion = '';
        }, 1200);
      },
      error: (err) => {
        this.guardandoRenovacion = false;
        console.error('Error al renovar contrato:', err);
        this.mensajeErrorRenovacion = 'No se pudo registrar la renovación en el servidor. Intenta de nuevo.';
      }
    });
  }
}
