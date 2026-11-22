// src/app/pages/portal-empleado/portal-empleado.component.ts
// Portal de auto-servicio del EMPLEADO: acceso con nombre + cédula.
// Pestañas: Mi nómina | Novedades | + Novedad | Renuncia
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { ChatbotWidgetComponent } from '../../components/chatbot-widget/chatbot-widget.component';

const API = '/api/portal';

interface EmpleadoPortal {
  id: number;
  nombre: string;
  apellido: string;
  cargo: string;
  salarioBase: number;
  estado: string;
}

interface Concepto {
  tipo: string;
  concepto: string;
  valor: number;
  esDeduccion: boolean;
  fecha?: string;
}

interface Renuncia {
  id?: string;
  estado: string;
  motivo: string;
  contenidoCarta: string;
  fechaEnvio?: string;
  fechaAceptacion?: string;
}

@Component({
  selector: 'app-portal-empleado',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatbotWidgetComponent],
  template: `
  <div class="portal" [class.login-mode]="!empleado">
    <main class="portal-card">

    <!-- ============ LOGIN ============ -->
    <div class="login-screen" *ngIf="!empleado">
      <div class="login-card">
        <h1>Consulta tu Nómina</h1>
        <p class="sub">Ingresa tu nombre y cédula registrados para consultar tu información.</p>

        <form (ngSubmit)="login()" #f="ngForm">
          <div class="campo">
            <label for="pe-nombre">Nombre completo</label>
            <input id="pe-nombre" type="text" name="nombre" [(ngModel)]="cred.nombre" required
                   placeholder="Ej: Juan Pérez" autocomplete="name">
          </div>
          <div class="campo">
            <label for="pe-cedula">Cédula</label>
            <input id="pe-cedula" type="text" name="cedula" [(ngModel)]="cred.cedula" required
                   placeholder="Tu documento" autocomplete="off">
          </div>
          <button type="submit" class="btn-principal" [disabled]="!f.valid || cargando">
            {{ cargando ? 'Ingresando…' : 'Ingresar' }}
          </button>
          <p class="error" *ngIf="errorLogin">{{ errorLogin }}</p>

          <div class="login-footer-actions">
            <button type="button" class="btn-cerrar-sesion-portal" (click)="cerrarSesion()">
              ← Cerrar sesión
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ============ PORTAL ============ -->
    <ng-container *ngIf="empleado">
      <header class="topbar">
        <h1>Consulta tu Nómina</h1>
        <div class="topbar-actions">
          <button class="btn-salir" (click)="salir()">Cambiar Empleado</button>
          <button class="btn-cerrar-sesion" (click)="cerrarSesion()">Cerrar Sesión</button>
        </div>
      </header>

      <section class="employee-card">
        <div class="avatar">{{ inicial }}</div>
        <div class="user-info">
          <strong>{{ empleado.nombre }} {{ empleado.apellido }}</strong>
          <small>{{ empleado.cargo || 'Empleado' }}</small>
        </div>
      </section>

      <nav class="tabs">
        <button *ngFor="let t of tabs" [class.activa]="tab === t.key" (click)="tab = t.key">
          {{ t.label }}
          <span class="dot" *ngIf="t.key === 'novedades' && hayNovedadesPendientes"></span>
        </button>
      </nav>

      <!-- ---- MI NÓMINA ---- -->
      <section class="contenido" *ngIf="tab === 'nomina'">
        <!-- COMPROBANTE DE NÓMINA (estilo portal) -->
        <div class="tarjeta comprobante" *ngIf="resumen">
          <div class="comp-encabezado">
            <h3>Comprobante de pago de nómina</h3>
            <span class="comp-empresa">NUMA S.A.S</span>
          </div>

          <div class="comp-datos">
            <div><strong>Empleado:</strong> {{ empleado.nombre }} {{ empleado.apellido }}</div>
            <div><strong>Cargo:</strong> {{ empleado.cargo || 'N/A' }}</div>
          </div>

          <table class="tabla-comp">
            <thead>
              <tr>
                <th class="th-devengo" colspan="2">DEVENGOS</th>
                <th class="th-deduccion" colspan="2">DEDUCCIONES</th>
              </tr>
              <tr>
                <th>Concepto</th>
                <th>Valor</th>
                <th>Concepto</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Salario base</td>
                <td class="der verde">{{ resumen.salarioBase | currency:'COP':'symbol':'1.0-0' }}</td>
                <td></td>
                <td></td>
              </tr>
              <tr *ngFor="let c of resumen.novedadesAprobadas; let i = index">
                <ng-container *ngIf="!c.esDeduccion">
                  <td>{{ c.concepto }}</td>
                  <td class="der verde">{{ c.valor | currency:'COP':'symbol':'1.0-0' }}</td>
                  <td></td>
                  <td></td>
                </ng-container>
                <ng-container *ngIf="c.esDeduccion">
                  <td class="celda-vacia"></td>
                  <td class="celda-vacia"></td>
                  <td>{{ c.concepto }}</td>
                  <td class="der rojo">- {{ c.valor | currency:'COP':'symbol':'1.0-0' }}</td>
                </ng-container>
              </tr>
              <tr class="fila-totales">
                <td><strong>TOTAL DEVENGADO</strong></td>
                <td class="der verde"><strong>{{ resumen.salarioBase + resumen.devengos | currency:'COP':'symbol':'1.0-0' }}</strong></td>
                <td><strong>TOTAL DEDUCIDO</strong></td>
                <td class="der rojo"><strong>{{ resumen.deducciones | currency:'COP':'symbol':'1.0-0' }}</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="liquido-box">
            <span class="liquido-label">LÍQUIDO A PERCIBIR</span>
            <span class="liquido-monto">{{ resumen.neto | currency:'COP':'symbol':'1.0-0' }}</span>
          </div>
        </div>
      </section>

      <!-- ---- NOVEDADES ---- -->
      <section class="contenido" *ngIf="tab === 'novedades'">
        <div class="tarjeta">
          <h3>
            Mis novedades
            <span class="chip">{{ novedadesFiltradas.length }}</span>
          </h3>

          <!-- Filtro -->
          <div class="filtro-bar">
            <div class="filtro-buscar">
              <span class="filtro-icono">🔍</span>
              <input type="text" [(ngModel)]="filtroTexto" name="filtroTexto"
                     placeholder="Buscar por tipo u observación…" />
            </div>
            <select [(ngModel)]="filtroEstado" name="filtroEstado" class="filtro-estado">
              <option value="TODOS">Todos los estados</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="APROBADA">Aprobada</option>
              <option value="RECHAZADA">Rechazada</option>
            </select>
            <button class="btn-limpiar" *ngIf="filtroTexto || filtroEstado !== 'TODOS'" (click)="limpiarFiltro()">✕</button>
          </div>

          <div class="novedad-item" *ngFor="let n of novedadesFiltradas">
            <div class="nov-fila">
              <span class="nov-tipo">{{ etiquetaTipo(n.tipoNovedad) }}</span>
              <span class="badge" [class]="'badge-' + badgeEstado(n.estado)">{{ etiquetaEstado(n.estado) }}</span>
            </div>
            <div class="nov-detalle">
              <span *ngIf="n.fechaInicio">{{ n.fechaInicio | date:'dd/MM/yyyy' }}</span>
              <span class="der" [class.verde]="!esDeduccion(n.tipoNovedad)" [class.rojo]="esDeduccion(n.tipoNovedad)">
                {{ valorNovedad(n) | currency:'COP':'symbol':'1.0-0' }}
              </span>
            </div>
            <p class="nov-obs" *ngIf="n.observaciones">{{ n.observaciones }}</p>
          </div>
          <p class="vacio" *ngIf="novedadesFiltradas.length === 0">No hay novedades que coincidan con el filtro.</p>
        </div>
      </section>

      <!-- ---- + NOVEDAD ---- -->
      <section class="contenido" *ngIf="tab === 'nueva'">
        <div class="tarjeta">
          <h3>Solicitar nueva novedad</h3>
          <form (ngSubmit)="crearNovedad()" #nf="ngForm">
            <div class="campo">
              <label>Tipo de novedad</label>
              <select name="tipo" [(ngModel)]="nueva.tipo" required>
                <option value="BONO">Bono / Bonificación</option>
                <option value="HORAS_EXTRAS">Horas extras</option>
                <option value="AUXILIO_TRANSPORTE">Auxilio de transporte</option>
                <option value="INCAPACIDAD">Incapacidad</option>
                <option value="PERMISO">Permiso</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
            <div class="fila">
              <div class="campo">
                <label>Fecha inicio</label>
                <input type="date" name="fechaInicio" [(ngModel)]="nueva.fechaInicio" required>
              </div>
              <div class="campo">
                <label>Fecha fin</label>
                <input type="date" name="fechaFin" [(ngModel)]="nueva.fechaFin">
              </div>
            </div>
            <div class="campo" *ngIf="nueva.tipo !== 'HORAS_EXTRAS'">
              <label>Valor (si aplica)</label>
              <input type="number" name="valor" [(ngModel)]="nueva.valor" placeholder="0">
            </div>
            <div class="fila" *ngIf="nueva.tipo === 'HORAS_EXTRAS'">
              <div class="campo">
                <label>Horas</label>
                <input type="number" name="horas" [(ngModel)]="nueva.horas">
              </div>
              <div class="campo">
                <label>Valor por hora</label>
                <input type="number" name="valorHora" [(ngModel)]="nueva.valorHora">
              </div>
            </div>
            <div class="campo">
              <label>Motivo / observaciones</label>
              <textarea name="observaciones" [(ngModel)]="nueva.observaciones" rows="3"
                        placeholder="Explica brevemente el motivo de la solicitud…"></textarea>
            </div>
            <button type="submit" class="btn-principal" [disabled]="!nf.valid || cargando">
              {{ cargando ? 'Enviando…' : 'Enviar solicitud' }}
            </button>
            <p class="ok" *ngIf="msgNovedad">{{ msgNovedad }}</p>
          </form>
          <p class="nota">Tu solicitud quedará en estado <strong>Pendiente</strong> hasta que el administrador la apruebe.</p>
        </div>
      </section>

      <!-- ---- RENUNCIA ---- -->
      <section class="contenido" *ngIf="tab === 'renuncia'">
        <div class="tarjeta">

          <!-- Sin renuncia activa: redactar y enviar -->
          <ng-container *ngIf="!renunciaActiva">
            <h3>Carta de renuncia</h3>
            <p class="nota">La carta se genera automáticamente a partir de tus datos. Revisa el motivo antes de enviarla.</p>
            <div class="campo">
              <label>Motivo de la renuncia</label>
              <input type="text" name="motivo" [(ngModel)]="motivoRenuncia" placeholder="Ej: motivos personales"
                     value="motivos personales">
            </div>

            <div class="carta">
              <pre>{{ cartaPreview }}</pre>
            </div>

            <button class="btn-principal" (click)="enviarRenuncia()" [disabled]="cargando">
              {{ cargando ? 'Enviando…' : 'Enviar renuncia' }}
            </button>

            <!-- Adjuntar PDF opcional -->
            <div class="campo pdf-zone">
              <label>Adjuntar tu carta en PDF (opcional, máx. 10 MB)</label>
              <input type="file" accept=".pdf" (change)="onPdfSeleccionado($event)" class="input-pdf">
              <p class="pdf-nombre" *ngIf="pdfPendiente">Seleccionado: {{ pdfPendiente.name }}</p>
            </div>
          </ng-container>

          <!-- ENVIADA: puede retirar -->
          <ng-container *ngIf="renunciaActiva && renunciaActiva.estado === 'ENVIADA'">
            <h3>Renuncia enviada <span class="badge badge-enviada">Enviada</span></h3>
            <p class="nota">Tu renuncia fue enviada el {{ renunciaActiva.fechaEnvio | date:'dd/MM/yyyy' }}. Puedes retirarla si cambias de opinión.</p>
            <div class="carta"><pre>{{ renunciaActiva.contenidoCarta }}</pre></div>

            <!-- PDF ya adjuntado o posibilidad de adjuntarlo ahora -->
            <div class="pdf-acciones" *ngIf="renunciaActiva.id">
              <button type="button" class="btn-pdf-link" (click)="descargarPdf(renunciaActiva.id!)">Ver PDF adjuntado</button>
            </div>
            <div class="campo pdf-zone">
              <label>Adjuntar o reemplazar carta en PDF (máx. 10 MB)</label>
              <input type="file" accept=".pdf" (change)="onPdfSeleccionado($event)" class="input-pdf">
              <p class="pdf-nombre" *ngIf="pdfPendiente">Seleccionado: {{ pdfPendiente.name }}</p>
            </div>

            <button class="btn-peligro" (click)="retirarRenuncia()" [disabled]="cargando">
              Retirar solicitud
            </button>
          </ng-container>

          <!-- ACEPTADA: liquidación estimada -->
          <ng-container *ngIf="renunciaActiva && renunciaActiva.estado === 'ACEPTADA'">
            <h3>Renuncia aceptada <span class="badge badge-aceptada">Aceptada</span></h3>
            <p class="nota">Tu renuncia fue aceptada el {{ renunciaActiva.fechaAceptacion | date:'dd/MM/yyyy' }}. Esta es tu liquidación estimada:</p>

            <!-- PDF de la renuncia aceptada -->
            <div class="pdf-acciones" *ngIf="renunciaActiva.id">
              <button type="button" class="btn-pdf-link" (click)="descargarPdf(renunciaActiva.id!)">Descargar carta de renuncia (PDF)</button>
            </div>

            <div class="grid-resumen" *ngIf="liquidacion">
              <div class="stat violeta">
                <span class="stat-label">Días trabajados</span>
                <span class="stat-valor">{{ liquidacion.diasTrabajados }}</span>
              </div>
              <div class="stat verde">
                <span class="stat-label">Cesantías</span>
                <span class="stat-valor">{{ liquidacion.cesantias | currency:'COP':'symbol':'1.0-0' }}</span>
              </div>
              <div class="stat verde">
                <span class="stat-label">Intereses cesantías</span>
                <span class="stat-valor">{{ liquidacion.interesesCesantias | currency:'COP':'symbol':'1.0-0' }}</span>
              </div>
              <div class="stat verde">
                <span class="stat-label">Prima</span>
                <span class="stat-valor">{{ liquidacion.prima | currency:'COP':'symbol':'1.0-0' }}</span>
              </div>
              <div class="stat verde">
                <span class="stat-label">Vacaciones</span>
                <span class="stat-valor">{{ liquidacion.vacaciones | currency:'COP':'symbol':'1.0-0' }}</span>
              </div>
              <div class="stat morado">
                <span class="stat-label">Total liquidación</span>
                <span class="stat-valor">{{ liquidacion.total | currency:'COP':'symbol':'1.0-0' }}</span>
              </div>
            </div>
          </ng-container>
        </div>
      </section>
    </ng-container>
    </main>
    <app-chatbot-widget
      *ngIf="empleado && portalChatToken"
      mode="employee"
      [portalToken]="portalChatToken"
    ></app-chatbot-widget>
  </div>
  `,
  styles: [`
    *, *::before, *::after { box-sizing: border-box; }
    :host {
      display: block;
      width: 100%;
      min-height: 100vh;
      min-height: 100dvh;
    }

    .portal {
      box-sizing: border-box;
      min-height: 100vh;
      min-height: 100dvh;
      padding: clamp(16px, 3vw, 32px);
      background: linear-gradient(135deg, rgba(240,235,255,.82) 0%, rgba(236,228,255,.78) 35%, rgba(243,236,255,.82) 100%), url('/assets/numa.jpg') center / cover fixed no-repeat;
      font-family: 'Poppins', system-ui, sans-serif;
      position: relative;
    }

    .portal.login-mode {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: clamp(16px, 4vw, 32px);
    }

    .portal.login-mode .portal-card {
      width: 100%;
      max-width: 440px;
      margin: auto;
      padding: clamp(24px, 5vw, 40px);
      border-radius: clamp(20px, 4vw, 32px);
      box-shadow: 0 20px 48px rgba(50, 15, 80, 0.16);
    }

    .portal.login-mode .login-screen {
      display: block;
      width: 100%;
      min-height: auto;
    }

    .login-card {
      width: 100%;
      padding: 0;
      border: 0;
      border-radius: 0;
      background: transparent;
      box-shadow: none;
      text-align: left;
      color: #302441;
    }

    .login-card h1 {
      margin: 0 0 8px;
      color: #3b1f73;
      font-size: clamp(1.4rem, 4.5vw, 1.85rem);
      font-weight: 700;
      text-align: center;
    }

    .login-card .sub {
      margin: 0 0 24px;
      color: #5f5d6e;
      font-size: 0.92rem;
      text-align: center;
      line-height: 1.45;
    }

    .portal-card {
      width: 100%;
      max-width: 1080px;
      margin: 0 auto;
      padding: clamp(16px, 3.5vw, 32px);
      border: 1px solid rgba(122,89,180,.16);
      border-radius: clamp(18px, 3vw, 28px);
      background: rgba(255,255,255,.94);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      color: #302441;
      box-shadow: 0 14px 30px rgba(62,27,90,.08);
    }

    .campo {
      margin-bottom: 16px;
      text-align: left;
    }

    .campo label {
      display: block;
      font-size: 0.9rem;
      font-weight: 600;
      margin-bottom: 7px;
      color: #3b1f73;
    }

    .campo input,
    .campo select,
    .campo textarea {
      width: 100%;
      min-height: 48px;
      padding: 12px 16px;
      border: 1.5px solid #ded9e8;
      border-radius: 12px;
      font-size: 16px; /* Evita auto-zoom en iOS Safari */
      background: #f6f4fa;
      color: #2d1c42;
      font-family: inherit;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .campo input:focus,
    .campo select:focus,
    .campo textarea:focus {
      outline: none;
      background: #ffffff;
      border-color: #6d3fc0;
      box-shadow: 0 0 0 3px rgba(109,63,192,0.16);
    }

    .campo textarea {
      min-height: 80px;
      resize: vertical;
    }

    .fila {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    @media (min-width: 600px) {
      .fila {
        flex-direction: row;
        gap: 16px;
      }
      .fila .campo {
        flex: 1;
      }
    }

    .btn-principal {
      width: 100%;
      min-height: 48px;
      padding: 12px 20px;
      border: none;
      border-radius: 12px;
      background: linear-gradient(135deg,#7c4dff,#5e35b1);
      color: #fff;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: background 0.25s, transform 0.25s;
      box-shadow: 0 6px 18px rgba(124,77,255,.28);
    }

    .btn-principal:hover:not(:disabled) {
      background: linear-gradient(135deg,#6d3cd8,#512da8);
      transform: translateY(-2px);
    }

    .btn-principal:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .btn-peligro {
      min-height: 44px;
      padding: 10px 22px;
      border: 2px solid #e53935;
      border-radius: 50px;
      background: transparent;
      color: #e53935;
      font-weight: 600;
      cursor: pointer;
      transition: 0.2s;
    }

    .btn-peligro:hover {
      background: #ffebee;
    }

    .btn-salir {
      min-height: 40px;
      padding: 8px 18px;
      border: 0;
      border-radius: 50px;
      background: #6b1d9e;
      color: #fff;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.9rem;
      transition: background 0.2s;
    }

    .btn-salir:hover {
      background: #55167d;
    }

    .btn-cerrar-sesion {
      min-height: 40px;
      padding: 8px 18px;
      border: 0;
      border-radius: 50px;
      background: #c62828;
      color: #fff;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.9rem;
      transition: background 0.2s;
    }

    .btn-cerrar-sesion:hover {
      background: #b71c1c;
    }

    .btn-cerrar-sesion-portal {
      background: none;
      border: none;
      color: #6b1d9e;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      padding: 8px 14px;
      text-decoration: underline;
    }

    .btn-cerrar-sesion-portal:hover {
      color: #c62828;
    }

    .login-footer-actions {
      margin-top: 18px;
      text-align: center;
    }

    .error {
      color: #e53935;
      font-size: 0.9rem;
      margin-top: 10px;
      font-weight: 500;
    }

    .ok {
      color: #2e7d32;
      font-size: 0.9rem;
      margin-top: 10px;
      font-weight: 500;
    }

    .topbar {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }

    .topbar h1 {
      margin: 0;
      color: #3b1f73;
      font-size: clamp(1.35rem, 3.5vw, 1.85rem);
      font-weight: 700;
    }

    .topbar-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }

    .employee-card {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      margin: 14px 0 20px;
      padding: 16px 20px;
      border: 1px solid rgba(122,89,180,.12);
      border-radius: 18px;
      background: rgba(255,255,255,.9);
    }

    .avatar {
      width: 48px;
      height: 48px;
      flex: 0 0 48px;
      border-radius: 50%;
      background: linear-gradient(135deg,#7c4dff,#5e35b1);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 18px;
    }

    .user-info strong {
      display: block;
      font-size: 1rem;
      color: #3b1f73;
    }

    .user-info small {
      color: #756b7d;
      font-size: 0.88rem;
    }

    .tabs {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      padding: 6px;
      border: 1px solid rgba(122,89,180,.12);
      border-radius: 14px;
      background: rgba(255,255,255,.76);
      margin-bottom: 20px;
      scrollbar-width: none;
    }

    .tabs::-webkit-scrollbar {
      display: none;
    }

    .tabs button {
      flex: 1 1 auto;
      white-space: nowrap;
      min-height: 44px;
      padding: 10px 16px;
      border-radius: 10px;
      border: none;
      background: transparent;
      color: #4a148c;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      position: relative;
      transition: background 0.2s, color 0.2s;
    }

    .tabs button.activa {
      background: linear-gradient(135deg,#7c4dff,#5e35b1);
      color: #fff;
      box-shadow: 0 4px 14px rgba(124,77,255,.25);
    }

    .dot {
      position: absolute;
      top: 6px;
      right: 8px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ff5252;
    }

    .tarjeta {
      padding: clamp(16px, 3vw, 24px);
      border: 1px solid rgba(122,89,180,.12);
      border-radius: 18px;
      background: rgba(255,255,255,.96);
      box-shadow: 0 10px 24px rgba(62,27,90,.06);
    }

    .tarjeta h3 {
      margin: 0 0 16px;
      color: #3b1f73;
      font-size: clamp(1.1rem, 2.5vw, 1.35rem);
    }

    .comprobante {
      padding-top: 14px;
    }

    .comp-encabezado {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #ede7f6;
    }

    .comp-encabezado h3, .comp-empresa {
      color: #3b1f73;
      margin: 0;
      font-weight: 700;
    }

    .comp-datos {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 16px;
      font-size: 0.92rem;
      color: #333;
    }

    .tabla-comp {
      display: block;
      width: 100%;
      max-width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      border-collapse: collapse;
      margin-bottom: 16px;
    }

    .tabla-comp th {
      padding: 10px;
      font-size: 12px;
      text-transform: uppercase;
      border-bottom: 2px solid #ede7f6;
    }

    .tabla-comp th.th-devengo {
      background: rgba(31,157,85,.85);
      color: #fff;
    }

    .tabla-comp th.th-deduccion {
      background: rgba(198,40,40,.85);
      color: #fff;
    }

    .tabla-comp td {
      padding: 10px;
      font-size: 14px;
      border-bottom: 1px solid #f3eefb;
    }

    .tabla-comp .celda-vacia {
      border-color: transparent;
    }

    .fila-totales td {
      background: #f7f3fb;
      font-weight: 700;
    }

    .liquido-box {
      border-radius: 14px;
      background: #6b1d9e;
      color: #fff;
      padding: 16px 20px;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      margin-top: 16px;
    }

    .grid-resumen {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 14px;
      margin-bottom: 20px;
    }

    .stat {
      border-radius: 16px;
      padding: 16px 18px;
      color: #fff;
    }

    .stat-label {
      display: block;
      font-size: 12px;
      opacity: .88;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: .5px;
    }

    .stat-valor {
      font-size: clamp(1.2rem, 3vw, 1.5rem);
      font-weight: 800;
    }

    .violeta { background: linear-gradient(135deg,#7b1fa2,#9c27b0); }
    .verde { background: linear-gradient(135deg,#2e7d32,#43a047); }
    .rojo { background: linear-gradient(135deg,#b71c1c,#e53935); }
    .morado { background: linear-gradient(135deg,#4a148c,#7b1fa2); }

    .nota {
      background: #f3e8ff;
      border-radius: 12px;
      padding: 12px 16px;
      font-size: 13.5px;
      color: #4a148c;
    }

    .novedad-item {
      border: 1px solid #efe3ff;
      border-radius: 14px;
      padding: 14px 16px;
      margin-bottom: 12px;
      background: #ffffff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.03);
    }

    .nov-fila {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    .nov-tipo {
      font-weight: 700;
      color: #3a1d62;
    }

    .nov-detalle {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: #5f5b6d;
      margin-top: 6px;
      flex-wrap: wrap;
      gap: 8px;
    }

    .nov-obs {
      font-size: 13px;
      color: #756b7d;
      margin: 8px 0 0;
    }

    .badge {
      padding: 4px 12px;
      border-radius: 50px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .badge-pendiente { background: #fff3e0; color: #e65100; }
    .badge-aprobada { background: #e8f5e9; color: #1b5e20; }
    .badge-rechazada { background: #ffebee; color: #b71c1c; }
    .badge-enviada { background: #e3f2fd; color: #1565c0; }
    .badge-aceptada { background: #e8f5e9; color: #1b5e20; }

    .carta {
      background: #faf7ff;
      border: 1px solid #e5d9f5;
      border-radius: 14px;
      padding: clamp(14px, 3vw, 20px);
      margin: 16px 0;
    }

    .carta pre {
      white-space: pre-wrap;
      word-break: break-word;
      font-family: inherit;
      font-size: 14px;
      color: #333;
      line-height: 1.6;
      margin: 0;
    }

    .input-pdf {
      padding: 10px;
      border: 2px dashed #b39ddb;
      border-radius: 12px;
      background: #faf7ff;
      width: 100%;
      min-height: 48px;
    }

    .pdf-nombre {
      color: #2e7d32;
      font-size: 13px;
      font-weight: 600;
      margin-top: 6px;
    }

    .pdf-zone { margin-top: 16px; }
    .pdf-acciones { margin: 14px 0; }
    .btn-pdf-link {
      display: inline-block;
      padding: 10px 20px;
      min-height: 44px;
      border-radius: 50px;
      background: #e8f5e9;
      color: #1b5e20;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      border: none;
    }

    .vacio {
      color: #7a6f8d;
      font-style: italic;
      text-align: center;
      padding: 24px 16px;
      border: 2px dashed #e2dbe8;
      border-radius: 14px;
    }

    .der { text-align: right; }
    .verde { color: #2e7d32; font-weight: 700; }
    .rojo { color: #c62828; font-weight: 700; }
  `]
})
export class PortalEmpleadoComponent {
  // Login
  cred = { nombre: '', cedula: '' };
  errorLogin = '';
  cargando = false;

  // Estado
  empleado: EmpleadoPortal | null = null;
  portalChatToken: string | null = null;
  tab = 'nomina';
  tabs = [
    { key: 'nomina', label: 'Mi nómina' },
    { key: 'novedades', label: 'Novedades' },
    { key: 'nueva', label: '+ Novedad' },
    { key: 'renuncia', label: 'Renuncia' }
  ];

  // Mi nómina
  resumen: { salarioBase: number; devengos: number; deducciones: number; neto: number; novedadesAprobadas: Concepto[] } | null = null;

  // Novedades
  novedades: any[] = [];

  // Filtro de novedades
  filtroTexto = '';
  filtroEstado = 'TODOS';

  get novedadesFiltradas(): any[] {
    const t = this.filtroTexto.trim().toLowerCase();
    return this.novedades.filter(n =>
      (this.filtroEstado === 'TODOS' || (n.estado || '').toUpperCase() === this.filtroEstado) &&
      (!t ||
        (n.tipoNovedad || '').toLowerCase().includes(t) ||
        (n.observaciones || '').toLowerCase().includes(t))
    );
  }

  limpiarFiltro() {
    this.filtroTexto = '';
    this.filtroEstado = 'TODOS';
  }

  // Nueva novedad
  nueva: any = { tipo: 'BONO', fechaInicio: '', fechaFin: '', valor: null, horas: null, valorHora: null, observaciones: '' };
  msgNovedad = '';

  // Renuncia
  renunciaActiva: Renuncia | null = null;
  liquidacion: any = null;
  motivoRenuncia = 'motivos personales';
  pdfPendiente: File | null = null;

  constructor(private http: HttpClient, private router: Router) {
    // Recuperar sesión del portal
    const guardado = localStorage.getItem('portalEmpleado');
    if (guardado) {
      try {
        const chatToken = sessionStorage.getItem('portalChatToken');
        if (!chatToken) {
          localStorage.removeItem('portalEmpleado');
          return;
        }
        this.empleado = JSON.parse(guardado);
        this.portalChatToken = chatToken;
        this.cargarTodo();
      } catch { localStorage.removeItem('portalEmpleado'); }
    }
  }

  get inicial(): string {
    return this.empleado?.nombre?.charAt(0).toUpperCase() ?? '?';
  }

  get hayNovedadesPendientes(): boolean {
    return this.novedades.some(n => (n.estado || '').toUpperCase() === 'PENDIENTE');
  }

  // ===== LOGIN =====
  login() {
    this.cargando = true;
    this.errorLogin = '';
    this.http.post<any>(`${API}/login`, this.cred).subscribe({
      next: (emp) => {
        if (typeof emp?.chatToken !== 'string' || !emp.chatToken) {
          this.errorLogin = 'No se pudo iniciar la sesión del asistente. Intenta de nuevo.';
          this.cargando = false;
          return;
        }
        const { chatToken, ...datosEmpleado } = emp;
        this.empleado = datosEmpleado;
        this.portalChatToken = chatToken;
        sessionStorage.setItem('portalChatToken', chatToken);
        localStorage.setItem('portalEmpleado', JSON.stringify(datosEmpleado));
        this.cargando = false;
        this.cargarTodo();
      },
      error: (err) => {
        this.errorLogin = err.error?.error || 'Credenciales incorrectas';
        this.cargando = false;
      }
    });
  }

  salir() {
    this.empleado = null;
    this.portalChatToken = null;
    this.resumen = null;
    this.novedades = [];
    this.renunciaActiva = null;
    this.liquidacion = null;
    this.tab = 'nomina';
    localStorage.removeItem('portalEmpleado');
    sessionStorage.removeItem('portalChatToken');
  }

  cerrarSesion() {
    this.salir();
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }

  cargarTodo() {
    if (!this.empleado) return;
    const id = this.empleado.id;
    this.cargarResumen(id);
    this.cargarNovedades(id);
    this.cargarRenuncia(id);
  }

  // ===== MI NÓMINA =====
  cargarResumen(id: number) {
    this.http.get<any>(`${API}/${id}/resumen`, { headers: this.portalHeaders() }).subscribe({
      next: (r) => this.resumen = r,
      error: () => this.resumen = null
    });
  }

  // ===== NOVEDADES =====
  cargarNovedades(id: number) {
    this.http.get<any[]>(`${API}/${id}/novedades`, { headers: this.portalHeaders() }).subscribe({
      next: (n) => this.novedades = n,
      error: () => this.novedades = []
    });
  }

  crearNovedad() {
    if (!this.empleado) return;
    this.cargando = true;
    this.msgNovedad = '';
    this.http.post(`${API}/${this.empleado.id}/novedades`, this.nueva, {
      headers: this.portalHeaders()
    }).subscribe({
      next: () => {
        this.msgNovedad = '✓ Solicitud enviada. Quedó en estado Pendiente.';
        this.nueva = { tipo: 'BONO', fechaInicio: '', fechaFin: '', valor: null, horas: null, valorHora: null, observaciones: '' };
        this.cargando = false;
        this.cargarNovedades(this.empleado!.id);
      },
      error: () => {
        this.msgNovedad = 'Error al enviar la solicitud.';
        this.cargando = false;
      }
    });
  }

  // ===== RENUNCIA =====
  cargarRenuncia(id: number) {
    this.http.get<any>(`${API}/${id}/renuncia`, { headers: this.portalHeaders() }).subscribe({
      next: (r) => {
        this.renunciaActiva = r.renuncia;
        this.liquidacion = r.liquidacion;
      },
      error: () => {
        this.renunciaActiva = null;
        this.liquidacion = null;
      }
    });
  }

  get cartaPreview(): string {
    if (!this.empleado) return '';
    const hoy = new Date();
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const fecha = `${hoy.getDate()} de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()}`;
    const nombre = `${this.empleado.nombre} ${this.empleado.apellido}`;
    return `CARTA DE RENUNCIA

${fecha}

Señores
NUMA Nómina
Presente.

Por medio de la presente, yo, ${nombre}, comunico formalmente mi decisión de renunciar al cargo que desempeño en la empresa, por motivos de ${this.motivoRenuncia || 'motivos personales'}.

Agradezco sinceramente la oportunidad, la confianza depositada en mí y la experiencia adquirida durante mi tiempo en la empresa. Estoy disponible para realizar el proceso de entrega de responsabilidades y facilitar una transición ordenada.

Atentamente,

${nombre}`;
  }

  enviarRenuncia() {
    if (!this.empleado) return;
    this.cargando = true;
    this.http.post<any>(`${API}/${this.empleado.id}/renuncia`, {
      motivo: this.motivoRenuncia || 'motivos personales'
    }, { headers: this.portalHeaders() }).subscribe({
      next: (r) => {
        this.renunciaActiva = r;
        this.cargando = false;
        // Si había PDF seleccionado, subirlo tras crear la renuncia
        const id = this.empleado?.id;
        if (this.pdfPendiente && id != null) this.subirPdf(id);
      },
      error: (err) => {
        alert(err.error?.error || 'Error al enviar la renuncia');
        this.cargando = false;
      }
    });
  }

  // ===== PDF de la renuncia =====
  onPdfSeleccionado(event: any) {
    const file: File = event.target.files?.[0] ?? null;
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Solo se aceptan archivos PDF');
      event.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('El PDF supera el límite de 10 MB');
      event.target.value = '';
      return;
    }
    this.pdfPendiente = file;

    // Si ya hay renuncia activa, subir de inmediato; si no, se sube al enviar
    if (this.renunciaActiva) this.subirPdf(this.empleado!.id);
  }

  private subirPdf(idEmpleado: number) {
    if (!this.pdfPendiente) return;
    const fd = new FormData();
    fd.append('archivo', this.pdfPendiente);
    this.http.post<any>(`${API}/${idEmpleado}/renuncia/pdf`, fd, {
      headers: this.portalHeaders()
    }).subscribe({
      next: (r) => {
        alert('PDF adjuntado correctamente');
        this.pdfPendiente = null;
        this.cargarRenuncia(idEmpleado); // refresca para activar el link de descarga
      },
      error: (err) => alert(err.error?.error || 'Error al subir el PDF')
    });
  }

  descargarPdf(idRenuncia: string) {
    this.http.get(`${API}/renuncia/${idRenuncia}/pdf`, {
      headers: this.portalHeaders(),
      responseType: 'blob'
    }).subscribe({
      next: (pdf) => this.descargarArchivo(pdf, `renuncia-${idRenuncia}.pdf`),
      error: () => alert('No se pudo descargar la carta de renuncia')
    });
  }

  retirarRenuncia() {
    if (!this.empleado || !this.renunciaActiva) return;
    if (!confirm('¿Seguro que deseas retirar tu solicitud de renuncia?')) return;
    this.cargando = true;
    this.http.post<any>(`${API}/${this.empleado.id}/renuncia/retirar`, {}, {
      headers: this.portalHeaders()
    }).subscribe({
      next: () => {
        this.renunciaActiva = null;
        this.cargando = false;
      },
      error: (err) => {
        alert(err.error?.error || 'Error al retirar la renuncia');
        this.cargando = false;
      }
    });
  }

  private portalHeaders(): HttpHeaders {
    const token = this.portalChatToken ?? sessionStorage.getItem('portalChatToken');
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  private descargarArchivo(archivo: Blob, nombre: string): void {
    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  // ===== Helpers =====
  etiquetaTipo(tipo: string): string {
    const mapa: any = {
      BONO: 'Bono', BONIFICACION: 'Bonificación', COMISION: 'Comisión',
      HORAS_EXTRAS: 'Horas extras', AUXILIO_TRANSPORTE: 'Auxilio transporte',
      INCAPACIDAD: 'Incapacidad', PERMISO: 'Permiso',
      PERMISO_NO_REMUNERADO: 'Permiso no remunerado', PRESTAMO: 'Préstamo',
      EMBARGO: 'Embargo', DEDUCCION: 'Deducción', OTRO: 'Otro'
    };
    return mapa[tipo] || tipo;
  }

  etiquetaEstado(estado: string): string {
    const e = (estado || '').toUpperCase();
    return e === 'PENDIENTE' ? 'Pendiente' : e === 'APROBADA' ? 'Aprobada' : e === 'RECHAZADA' ? 'Rechazada' : estado;
  }

  badgeEstado(estado: string): string {
    return (estado || '').toLowerCase();
  }

  esDeduccion(tipo: string): boolean {
    return ['PRESTAMO', 'EMBARGO', 'DEDUCCION', 'INCAPACIDAD', 'PERMISO_NO_REMUNERADO'].includes(tipo);
  }

  valorNovedad(n: any): number {
    return Number(n.valor) || Number(n.monto) || 0;
  }
}
