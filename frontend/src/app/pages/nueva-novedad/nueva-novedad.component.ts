import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';

@Component({
  selector: 'app-nueva-novedad',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatIconModule,
    SidebarComponent
  ],
  template: `
    <div class="page-wrapper">
      <app-sidebar></app-sidebar>

      <main class="main-content">
        <div class="content">
          <!-- Header -->
          <div class="page-header">
            <div class="title-section">
              <div class="title-icon">
                <mat-icon>assignment_add</mat-icon>
              </div>
              <div>
                <h1>Registrar Nueva Novedad</h1>
                <p class="subtitle">Complete los campos para registrar una novedad al empleado</p>
              </div>
            </div>
            <button class="btn-back" routerLink="/novedades">
              <mat-icon>arrow_back</mat-icon>
              Volver
            </button>
          </div>

          <!-- Información del empleado -->
          <div class="empleado-card" *ngIf="nombreEmpleado">
            <div class="empleado-avatar">
              <mat-icon>person</mat-icon>
            </div>
            <div class="empleado-details">
              <div class="empleado-name">{{ nombreEmpleado }} {{ apellidoEmpleado }}</div>
              <div class="empleado-documento">Documento: {{ novedad.cedula }}</div>
            </div>
          </div>

          <!-- Formulario -->
          <div class="form-card">
            <form (ngSubmit)="guardar()" #novedadForm="ngForm">

              <!-- Tipo de novedad -->
              <div class="campo">
                <label class="etiqueta">
                  <mat-icon>category</mat-icon>
                  Tipo de novedad
                  <span class="requerido">*</span>
                </label>
                <select class="input-select" [(ngModel)]="novedad.tipo" name="tipo" (change)="onTipoChange()" required>
                  <option value="" disabled selected>Seleccione un tipo...</option>
                  <option value="AUXILIO_TRANSPORTE"> Auxilio de Transporte</option>
                  <option value="BONO"> Bono / Bonificación</option>
                  <option value="HORAS_EXTRAS"> Horas Extras</option>
                  <option value="INCAPACIDAD"> Incapacidad</option>
                  <option value="VACACIONES"> Vacaciones</option>
                  <option value="PERMISO"> Permiso</option>
                  <option value="LICENCIA"> Licencia</option>
                  <option value="OTRO"> Otro</option>
                </select>
              </div>

              <!-- Campos específicos según tipo -->
              <div *ngIf="novedad.tipo === 'AUXILIO_TRANSPORTE'" class="subseccion">
                <div class="subseccion-titulo">
                  <mat-icon>directions_bus</mat-icon>
                  Detalles del Auxilio de Transporte
                </div>
                <div class="fila">
                  <div class="campo mitad">
                    <label class="etiqueta-pequena">Monto del auxilio</label>
                    <div class="input-con-prefijo">
                      <span class="prefijo">$</span>
                      <input type="number" class="input-text" [(ngModel)]="novedad.auxilioTransporte.monto" name="auxilioMonto" placeholder="0">
                    </div>
                  </div>
                  <div class="campo mitad">
                    <label class="etiqueta-pequena">Concepto</label>
                    <input type="text" class="input-text" [(ngModel)]="novedad.auxilioTransporte.concepto" name="auxilioConcepto" placeholder="Ej: Transporte mes de marzo">
                  </div>
                </div>
              </div>

              <div *ngIf="novedad.tipo === 'BONO'" class="subseccion">
                <div class="subseccion-titulo">
                  <mat-icon>card_giftcard</mat-icon>
                  Detalles del Bono
                </div>
                <div class="fila">
                  <div class="campo mitad">
                    <label class="etiqueta-pequena">Monto del bono</label>
                    <div class="input-con-prefijo">
                      <span class="prefijo">$</span>
                      <input type="number" class="input-text" [(ngModel)]="novedad.bono.monto" name="bonoMonto" placeholder="0">
                    </div>
                  </div>
                  <div class="campo mitad">
                    <label class="etiqueta-pequena">Motivo</label>
                    <input type="text" class="input-text" [(ngModel)]="novedad.bono.motivo" name="bonoMotivo" placeholder="Ej: Cumplimiento de metas">
                  </div>
                </div>
              </div>

              <div *ngIf="novedad.tipo === 'HORAS_EXTRAS'" class="subseccion">
                <div class="subseccion-titulo">
                  <mat-icon>schedule</mat-icon>
                  Detalles de Horas Extras
                </div>
                <div class="fila">
                  <div class="campo mitad">
                    <label class="etiqueta-pequena">Tipo de hora extra</label>
                    <select class="input-select" [(ngModel)]="novedad.horasExtras.tipo" name="horasExtrasTipo">
                      <option value="diurnas">Diurnas (6am - 9pm)</option>
                      <option value="nocturnas">Nocturnas (9pm - 6am)</option>
                      <option value="festivas">Festivas / Dominicales</option>
                    </select>
                  </div>
                  <div class="campo mitad">
                    <label class="etiqueta-pequena">Valor por hora</label>
                    <div class="input-con-prefijo">
                      <span class="prefijo">$</span>
                      <input type="number" class="input-text" [(ngModel)]="novedad.horasExtras.valorHora" name="horasExtrasValorHora" placeholder="0">
                    </div>
                  </div>
                </div>
              </div>

              <!-- Período de la novedad -->
              <div class="seccion-titulo">
                <mat-icon>calendar_today</mat-icon>
                Período de la novedad
              </div>

              <div class="fila">
                <div class="campo mitad">
                  <label class="etiqueta-pequena">Fecha de inicio <span class="requerido">*</span></label>
                  <div class="input-con-icono">
                    <mat-icon class="icono">event</mat-icon>
                    <input type="date" class="input-fecha" [(ngModel)]="novedad.fechaInicio" name="fechaInicio" required>
                  </div>
                </div>
                <div class="campo mitad">
                  <label class="etiqueta-pequena">Hora de inicio</label>
                  <div class="input-con-icono">
                    <mat-icon class="icono">schedule</mat-icon>
                    <input type="time" class="input-hora" step="60" [(ngModel)]="novedad.horaInicio" name="horaInicio">
                  </div>
                </div>
              </div>

              <div class="fila">
                <div class="campo mitad">
                  <label class="etiqueta-pequena">Fecha de fin</label>
                  <div class="input-con-icono">
                    <mat-icon class="icono">event</mat-icon>
                    <input type="date" class="input-fecha" [(ngModel)]="novedad.fechaFin" name="fechaFin">
                  </div>
                </div>
                <div class="campo mitad">
                  <label class="etiqueta-pequena">Hora de fin</label>
                  <div class="input-con-icono">
                    <mat-icon class="icono">schedule</mat-icon>
                    <input type="time" class="input-hora" step="60" [(ngModel)]="novedad.horaFin" name="horaFin">
                  </div>
                </div>
              </div>

              <!-- Observaciones -->
              <div class="campo">
                <label class="etiqueta">
                  <mat-icon>description</mat-icon>
                  Observaciones
                </label>
                <textarea class="textarea" [(ngModel)]="novedad.observaciones" name="observaciones" rows="4" placeholder="Motivo detallado de la novedad..."></textarea>
              </div>

              <!-- Resumen -->
              <div class="resumen" *ngIf="calcularResumen()">
                <div class="resumen-titulo">
                  <mat-icon>fact_check</mat-icon>
                  Resumen de la novedad
                </div>
                <div class="resumen-grid">
                  <div><strong>Tipo:</strong> {{ getTipoLabel() }}</div>
                  <div><strong>Inicio:</strong> {{ novedad.fechaInicio }} {{ novedad.horaInicio ? novedad.horaInicio : '' }}</div>
                  <div><strong>Fin:</strong> {{ novedad.fechaFin || 'Indefinido' }} {{ novedad.horaFin ? novedad.horaFin : '' }}</div>
                  <div *ngIf="getMontoTotal() > 0"><strong>Monto:</strong> $ {{ getMontoTotal() | number:'1.0-0' }}</div>
                </div>
              </div>

              <!-- Botones -->
              <div class="botones">
                <button type="button" class="btn-cancelar" routerLink="/novedades">
                  <mat-icon>close</mat-icon>
                  Cancelar
                </button>
                <button type="submit" class="btn-guardar" [disabled]="!novedadForm.valid">
                  <mat-icon>save</mat-icon>
                  Guardar Novedad
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    * {
      box-sizing: border-box;
    }

    .page-wrapper {
      display: flex;
      min-height: 100vh;
    }

    .main-content {
      margin-left: 240px;
      padding: 40px;
      flex: 1;
      background: url('/assets/images/numa.jpg') no-repeat center center fixed;
      background-size: cover;
      min-height: 100vh;
    }

    .content {
      max-width: 1000px;
      margin: 0 auto;
    }

    /* Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .title-section {
      display: flex;
      align-items: center;
      gap: 18px;
    }

    .title-icon {
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #9c27b0, #6a1b9a);
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 20px rgba(106, 27, 154, 0.3);
    }

    .title-icon mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: white;
    }

    .page-header h1 {
      color: white;
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 4px 0;
      text-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .subtitle {
      color: rgba(255,255,255,0.85);
      font-size: 14px;
      margin: 0;
    }

    .btn-back {
      display: flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, #43a047, #2e7d32);
      color: white;
      border: none;
      padding: 12px 28px;
      border-radius: 50px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: 0 4px 12px rgba(46, 125, 50, 0.3);
    }

    .btn-back:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(46, 125, 50, 0.4);
    }

    /* Empleado Card */
    .empleado-card {
      background: rgba(255,255,255,0.12);
      backdrop-filter: blur(12px);
      border-radius: 28px;
      padding: 22px 28px;
      margin-bottom: 28px;
      display: flex;
      align-items: center;
      gap: 22px;
      border: 1px solid rgba(255,255,255,0.25);
    }

    .empleado-avatar {
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #9c27b0, #6a1b9a);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .empleado-avatar mat-icon {
      font-size: 30px;
      width: 30px;
      height: 30px;
      color: white;
    }

    .empleado-name {
      font-size: 18px;
      font-weight: 600;
      color: white;
      margin-bottom: 6px;
    }

    .empleado-documento {
      font-size: 14px;
      color: rgba(255,255,255,0.75);
    }

    /* Form Card */
    .form-card {
      background: white;
      border-radius: 32px;
      padding: 40px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.15);
    }

    /* Campos */
    .campo {
      margin-bottom: 28px;
    }

    .mitad {
      margin-bottom: 0;
    }

    .etiqueta {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 600;
      color: #333;
      margin-bottom: 12px;
      font-size: 15px;
    }

    .etiqueta mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: #6a1b9a;
    }

    .etiqueta-pequena {
      display: block;
      font-weight: 500;
      color: #555;
      margin-bottom: 8px;
      font-size: 13px;
    }

    .requerido {
      color: #e74c3c;
      margin-left: 4px;
    }

    /* Inputs */
    .input-text, .input-select, .input-fecha, .input-hora, .textarea {
      width: 100%;
      padding: 14px 16px;
      border: 2px solid #e8e8e8;
      border-radius: 16px;
      font-size: 14px;
      transition: all 0.3s;
      background: white;
      font-family: inherit;
    }

    .input-text:focus, .input-select:focus, .input-fecha:focus, .input-hora:focus, .textarea:focus {
      outline: none;
      border-color: #9c27b0;
      box-shadow: 0 0 0 3px rgba(156, 39, 176, 0.1);
    }

    .input-select {
      cursor: pointer;
    }

    /* Input con icono */
    .input-con-icono {
      position: relative;
    }

    .icono {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #aaa;
      pointer-events: none;
    }

    .input-fecha, .input-hora {
      padding-left: 44px;
    }

    /* Input con prefijo $ */
    .input-con-prefijo {
      position: relative;
    }

    .prefijo {
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 14px;
      font-weight: 600;
      color: #888;
    }

    .input-con-prefijo .input-text {
      padding-left: 32px;
    }

    /* Textarea */
    .textarea {
      resize: vertical;
    }

    /* Filas */
    .fila {
      display: flex;
      gap: 24px;
      margin-bottom: 20px;
    }

    .fila:last-child {
      margin-bottom: 0;
    }

    .mitad {
      flex: 1;
    }

    /* Secciones */
    .seccion-titulo {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 18px;
      font-weight: 600;
      color: #4a148c;
      margin: 32px 0 24px 0;
      padding-bottom: 12px;
      border-bottom: 2px solid #e3d4ff;
    }

    .seccion-titulo mat-icon {
      color: #6a1b9a;
    }

    .subseccion {
      background: #f9f5ff;
      border-radius: 24px;
      padding: 24px;
      margin: 24px 0;
    }

    .subseccion-titulo {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 600;
      color: #4a148c;
      margin-bottom: 20px;
      font-size: 15px;
    }

    /* Resumen */
    .resumen {
      background: linear-gradient(135deg, #f5f0ff 0%, #e8dff5 100%);
      border-radius: 24px;
      padding: 20px;
      margin: 28px 0;
    }

    .resumen-titulo {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 600;
      color: #4a148c;
      margin-bottom: 16px;
      font-size: 15px;
    }

    .resumen-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .resumen-grid div {
      font-size: 13px;
      color: #333;
    }

    /* Botones */
    .botones {
      display: flex;
      justify-content: flex-end;
      gap: 18px;
      margin-top: 36px;
      padding-top: 28px;
      border-top: 1px solid #eee;
    }

    .btn-cancelar {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #f5f5f5;
      color: #c62828;
      border: 1px solid #e0e0e0;
      padding: 12px 30px;
      border-radius: 50px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.3s;
    }

    .btn-cancelar:hover {
      background: #ffebee;
      border-color: #c62828;
      transform: translateY(-2px);
    }

    .btn-guardar {
      display: flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, #9c27b0, #6a1b9a);
      color: white;
      border: none;
      padding: 12px 36px;
      border-radius: 50px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: 0 4px 12px rgba(156, 39, 176, 0.3);
    }

    .btn-guardar:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(156, 39, 176, 0.4);
    }

    .btn-guardar:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .main-content {
        margin-left: 0;
        padding: 20px;
      }

      .fila {
        flex-direction: column;
        gap: 20px;
      }

      .mitad {
        width: 100%;
      }

      .resumen-grid {
        grid-template-columns: 1fr;
      }

      .page-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .form-card {
        padding: 24px;
      }
    }
  `]
})
export class NuevaNovedadComponent implements OnInit {
  nombreEmpleado: string = '';
  apellidoEmpleado: string = '';
  idEmpleado: number = 0;

  novedad: any = {
    cedula: '',
    tipo: '',
    fechaInicio: '',
    fechaFin: '',
    horaInicio: '',
    horaFin: '',
    valor: null,
    observaciones: '',
    auxilioTransporte: { monto: null, concepto: '' },
    bono: { monto: null, motivo: '' },
    horasExtras: { valorHora: null, tipo: 'diurnas' }
  };

  tiposConValor = ['AUXILIO_TRANSPORTE', 'BONO', 'HORAS_EXTRAS'];

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['cedula']) {
        this.novedad.cedula = params['cedula'];
        this.nombreEmpleado = params['nombre'] || '';
        this.apellidoEmpleado = params['apellido'] || '';
        this.idEmpleado = params['idEmpleado'] || 0;
      }
    });
  }

  onTipoChange() {
    if (this.novedad.tipo === 'AUXILIO_TRANSPORTE') {
      this.novedad.auxilioTransporte = { monto: null, concepto: '' };
    } else if (this.novedad.tipo === 'BONO') {
      this.novedad.bono = { monto: null, motivo: '' };
    } else if (this.novedad.tipo === 'HORAS_EXTRAS') {
      this.novedad.horasExtras = { valorHora: null, tipo: 'diurnas' };
    }
  }

  getMontoTotal(): number {
    if (this.novedad.tipo === 'AUXILIO_TRANSPORTE' && this.novedad.auxilioTransporte?.monto) {
      return this.novedad.auxilioTransporte.monto;
    }
    if (this.novedad.tipo === 'BONO' && this.novedad.bono?.monto) {
      return this.novedad.bono.monto;
    }
    if (this.novedad.tipo === 'HORAS_EXTRAS' && this.novedad.horasExtras?.valorHora && this.novedad.horaInicio && this.novedad.horaFin) {
      const horas = this.calcularHoras(this.novedad.horaInicio, this.novedad.horaFin);
      return horas * this.novedad.horasExtras.valorHora;
    }
    if (this.novedad.valor) {
      return this.novedad.valor;
    }
    return 0;
  }

  calcularHoras(horaInicio: string, horaFin: string): number {
    if (!horaInicio || !horaFin) return 0;
    const [h1, m1] = horaInicio.split(':').map(Number);
    const [h2, m2] = horaFin.split(':').map(Number);
    let horas = h2 - h1;
    let minutos = m2 - m1;
    if (minutos < 0) {
      horas--;
      minutos += 60;
    }
    return horas + (minutos / 60);
  }

  getTipoLabel(): string {
    const tipos: any = {
      'AUXILIO_TRANSPORTE': '🚌 Auxilio de Transporte',
      'BONO': '🎁 Bono / Bonificación',
      'HORAS_EXTRAS': '⏰ Horas Extras',
      'INCAPACIDAD': '🏥 Incapacidad',
      'VACACIONES': '🌴 Vacaciones',
      'PERMISO': '📋 Permiso',
      'LICENCIA': '📄 Licencia',
      'OTRO': '📌 Otro'
    };
    return tipos[this.novedad.tipo] || this.novedad.tipo;
  }

  calcularResumen(): boolean {
    return !!this.novedad.tipo && !!this.novedad.cedula && !!this.novedad.fechaInicio;
  }

  guardar() {
    let datosEnviar: any = {
      idEmpleado: this.idEmpleado,
      cedula: this.novedad.cedula,
      tipoNovedad: this.novedad.tipo,
      fechaInicio: this.novedad.fechaInicio,
      fechaFin: this.novedad.fechaFin,
      horaInicio: this.novedad.horaInicio,
      horaFin: this.novedad.horaFin,
      observaciones: this.novedad.observaciones,
      estado: 'PENDIENTE'
    };

    if (this.novedad.tipo === 'HORAS_EXTRAS') {
      const horas = this.calcularHoras(this.novedad.horaInicio, this.novedad.horaFin);
      datosEnviar.horas = horas;
      datosEnviar.valorHora = this.novedad.horasExtras.valorHora;
      datosEnviar.tipoHora = this.novedad.horasExtras.tipo;
      datosEnviar.valor = horas * this.novedad.horasExtras.valorHora;
    }

    if (this.novedad.tipo === 'AUXILIO_TRANSPORTE') {
      datosEnviar.monto = this.novedad.auxilioTransporte.monto;
      datosEnviar.concepto = this.novedad.auxilioTransporte.concepto;
      datosEnviar.valor = this.novedad.auxilioTransporte.monto;
    } else if (this.novedad.tipo === 'BONO') {
      datosEnviar.monto = this.novedad.bono.monto;
      datosEnviar.motivo = this.novedad.bono.motivo;
      datosEnviar.valor = this.novedad.bono.monto;
    } else if (this.novedad.valor && this.novedad.tipo !== 'HORAS_EXTRAS') {
      datosEnviar.valor = this.novedad.valor;
    }

    this.http.post('http://localhost:8080/api/novedades', datosEnviar)
      .subscribe({
        next: () => {
          alert('✅ ¡Novedad guardada exitosamente!');
          this.router.navigate(['/novedades']);
        },
        error: (err) => {
          alert('❌ Error al guardar: ' + err.message);
        }
      });
  }
}