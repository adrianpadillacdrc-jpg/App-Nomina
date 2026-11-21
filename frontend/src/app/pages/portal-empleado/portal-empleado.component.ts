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
            <label>Nombre completo</label>
            <input type="text" name="nombre" [(ngModel)]="cred.nombre" required
                   placeholder="Ej: Juan Pérez" autocomplete="name">
          </div>
          <div class="campo">
            <label>Cédula</label>
            <input type="text" name="cedula" [(ngModel)]="cred.cedula" required
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
    * { box-sizing: border-box; }
    .portal { min-height: 100vh; background: linear-gradient(135deg, rgba(32,11,54,.68) 0%, rgba(72,35,112,.62) 38%, rgba(96,48,141,.62) 100%), url('/assets/numa.jpg') center / cover fixed no-repeat; padding: 24px; font-family: 'Segoe UI', sans-serif; position: relative; overflow: visible; }
    .portal::before { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 15% 20%, rgba(255,255,255,0.18), transparent 22%), radial-gradient(circle at 90% 18%, rgba(255,255,255,0.12), transparent 20%); pointer-events: none; }
    .login-screen { display: flex; align-items: center; justify-content: center; min-height: calc(100vh - 48px); position: relative; z-index: 1; }
    .login-card { background: rgba(255,255,255,0.14); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); border: 1px solid rgba(255,255,255,0.18); border-radius: 28px; padding: 36px 32px; width: min(92vw, 500px); color: #fff; text-align: center; box-shadow: 0 25px 45px rgba(0,0,0,.18); }
    .login-card .logo { width: 80px; margin-bottom: 14px; filter: drop-shadow(0 8px 18px rgba(0,0,0,.25)); }
    .login-card h1 { font-size: 28px; margin: 0 0 6px; color: #fff; }
    .login-card .sub { color: rgba(255,255,255,.8); margin-bottom: 24px; }
    .campo { margin-bottom: 16px; text-align: left; }
    .campo label { display: block; font-size: 13px; font-weight: 700; margin-bottom: 7px; color: rgba(255,255,255,.9); }
    .campo input, .campo select, .campo textarea { width: 100%; padding: 13px 16px; border: 1px solid rgba(255,255,255,.25); border-radius: 16px; font-size: 14px; background: rgba(255,255,255,.96); color: #2d1c42; box-shadow: inset 0 1px 2px rgba(0,0,0,.04); }
    .campo textarea { resize: vertical; }
    .fila { display: flex; gap: 14px; }
    .fila .campo { flex: 1; }
    .btn-principal { width: 100%; padding: 13px; border: none; border-radius: 16px; background: linear-gradient(135deg,#8d3ddd,#6a1b9a); color: #fff; font-weight: 700; font-size: 15px; cursor: pointer; transition: .3s; box-shadow: 0 12px 28px rgba(120,61,170,.35); }
    .btn-principal:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 16px 32px rgba(120,61,170,.42); }
    .btn-principal:disabled { opacity: .55; cursor: not-allowed; }
    .btn-peligro { padding: 12px 26px; border: 2px solid #e53935; border-radius: 50px; background: transparent; color: #e53935; font-weight: 700; cursor: pointer; transition: .3s; }
    .btn-peligro:hover { background: #ffebee; }
    .btn-salir { padding: 9px 22px; border: 2px solid rgba(255,255,255,.5); border-radius: 50px; background: rgba(255,255,255,.08); color: #fff; font-weight: 600; cursor: pointer; transition: .25s; }
    .btn-salir:hover { background: rgba(255,255,255,.15); }
    .error { color: #ffb3ae; font-size: 13px; margin-top: 10px; }
    .ok { color: #b7f0bc; font-size: 13px; margin-top: 10px; }
    .topbar { display: flex; justify-content: space-between; align-items: center; color: #fff; margin-bottom: 18px; max-width: 1000px; margin-inline: auto; position: relative; z-index: 1; }
    .user-info { display: flex; align-items: center; gap: 12px; }
    .user-info strong { display: block; }
    .user-info small { color: rgba(255,255,255,.72); }
    .avatar { width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg,#9c27b0,#e040fb); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 18px; box-shadow: 0 12px 26px rgba(200,118,255,.33); }
    .tabs { display: flex; gap: 8px; max-width: 1000px; margin: 0 auto 20px; flex-wrap: wrap; position: relative; z-index: 1; }
    .tabs button { padding: 11px 22px; border: none; border-radius: 50px; background: rgba(255,255,255,.15); color: rgba(255,255,255,.85); font-weight: 700; cursor: pointer; transition: .25s; position: relative; }
    .tabs button:hover { background: rgba(255,255,255,.24); }
    .tabs button.activa { background: #fff; color: #6a1b9a; box-shadow: 0 10px 24px rgba(255,255,255,.18); }
    .dot { position: absolute; top: 8px; right: 10px; width: 8px; height: 8px; border-radius: 50%; background: #ff5252; }
    .contenido { max-width: 1000px; margin: 0 auto; position: relative; z-index: 1; }
    .grid-resumen { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 20px; }
    .stat { border-radius: 18px; padding: 18px 20px; color: #fff; }
    .stat-label { display: block; font-size: 12px; opacity: .85; margin-bottom: 6px; text-transform: uppercase; letter-spacing: .5px; }
    .stat-valor { font-size: 20px; font-weight: 800; }
    .violeta { background: linear-gradient(135deg,#7b1fa2,#9c27b0); }
    .verde { background: linear-gradient(135deg,#2e7d32,#43a047); }
    .rojo { background: linear-gradient(135deg,#b71c1c,#e53935); }
    .morado { background: linear-gradient(135deg,#4a148c,#7b1fa2); }
    .tarjeta { background: rgba(255,255,255,.96); border-radius: 22px; padding: 26px; box-shadow: 0 18px 35px rgba(0,0,0,.14); border: 1px solid rgba(123, 31, 162, .12); }
    .tarjeta h3 { margin: 0 0 16px; color: #4a148c; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 12px; text-transform: uppercase; color: #8a7aa5; padding: 8px; border-bottom: 2px solid #ede7f6; }
    td { padding: 10px 8px; border-bottom: 1px solid #f3eefb; font-size: 14px; }
    .der { text-align: right; }
    .verde { color: #2e7d32; font-weight: 700; }
    .rojo { color: #c62828; font-weight: 700; }
    .vacio { color: #999; font-style: italic; text-align: center; padding: 18px; }
    .nota { background: #f3e8ff; border-radius: 12px; padding: 12px 16px; font-size: 13px; color: #4a148c; }
    .novedad-item { border: 1px solid #ede7f6; border-radius: 14px; padding: 14px 16px; margin-bottom: 10px; background: linear-gradient(180deg,#fff,#faf7ff); }
    .nov-fila { display: flex; justify-content: space-between; align-items: center; }
    .nov-tipo { font-weight: 700; color: #4a148c; }
    .nov-detalle { display: flex; justify-content: space-between; font-size: 13px; color: #666; margin-top: 6px; }
    .nov-obs { font-size: 13px; color: #888; margin: 8px 0 0; }
    .badge { padding: 4px 12px; border-radius: 50px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .badge-pendiente { background: #fff3e0; color: #e65100; }
    .badge-aprobada { background: #e8f5e9; color: #1b5e20; }
    .badge-rechazada { background: #ffebee; color: #b71c1c; }
    .badge-enviada { background: #e3f2fd; color: #1565c0; }
    .badge-aceptada { background: #e8f5e9; color: #1b5e20; }
    .carta { background: #faf7ff; border: 1px solid #e5d9f5; border-radius: 14px; padding: 20px; margin: 16px 0; }
    .carta pre { white-space: pre-wrap; font-family: 'Georgia', serif; font-size: 14px; color: #333; line-height: 1.6; }
    .cargando-msg { text-align: center; color: #fff; padding: 30px; }
    .input-pdf { padding: 10px; border: 2px dashed #b39ddb; border-radius: 12px; background: #faf7ff; width: 100%; }
    .pdf-nombre { color: #2e7d32; font-size: 13px; font-weight: 600; margin-top: 6px; }
    .pdf-zone { margin-top: 16px; }
    .pdf-acciones { margin: 14px 0; }
    .btn-pdf-link { display: inline-block; padding: 10px 22px; border-radius: 50px; background: #e8f5e9; color: #1b5e20; font-weight: 700; text-decoration: none; }
    .btn-pdf-link:hover { background: #d9f0dc; }
    .portal { box-sizing: border-box; min-height: 100vh; padding: 24px 14px; overflow: visible; background: linear-gradient(135deg, rgba(240,235,255,.78) 0%, rgba(236,228,255,.74) 35%, rgba(243,236,255,.78) 100%), url('/assets/numa.jpg') center / cover fixed no-repeat; font-family: Poppins, system-ui, sans-serif; }
    .portal.login-mode { min-height: 100dvh; display: flex; align-items: center; justify-content: center; padding-block: 24px; }
    .portal.login-mode .portal-card { width: min(100%,760px); }
    .portal::before { display: none; }
    .portal-card { width: min(100%,1000px); margin: 0 auto; padding: 32px; border: 1px solid rgba(122,89,180,.16); border-radius: 28px; background: rgba(255,255,255,.82); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); color: #302441; box-shadow: 0 14px 30px rgba(62,27,90,.08); }
    .login-screen { display: block; min-height: 0; }
    .portal.login-mode .login-screen { display: flex; align-items: center; min-height: calc(100dvh - 144px); }
    .login-card { width: 100%; padding: 0; border: 0; border-radius: 0; background: transparent; box-shadow: none; text-align: left; backdrop-filter: none; -webkit-backdrop-filter: none; color: #302441; }
    .login-card h1, .topbar h1 { margin: 0; color: #4a148c; font-size: clamp(1.5rem,5vw,2rem); font-weight: 700; }
    .login-card .sub { margin: 6px 0 22px; color: #756b7d; }
    .topbar { max-width: none; margin: 0 0 16px; color: #4a148c; }
    .topbar-actions { display: flex; gap: 10px; align-items: center; }
    .btn-salir { border: 0; border-radius: 99px; padding: 10px 22px; background: #6b1d9e; color: #fff; cursor: pointer; font-weight: 600; font-family: Poppins, system-ui, sans-serif; }
    .btn-salir:hover { background: #55167d; }
    .btn-cerrar-sesion { border: 0; border-radius: 99px; padding: 10px 22px; background: #c62828; color: #fff; cursor: pointer; font-weight: 600; font-family: Poppins, system-ui, sans-serif; transition: background 0.2s; }
    .btn-cerrar-sesion:hover { background: #b71c1c; }
    .login-footer-actions { margin-top: 18px; text-align: center; }
    .btn-cerrar-sesion-portal { background: none; border: none; color: #6b1d9e; font-weight: 600; font-size: 14px; cursor: pointer; padding: 8px 14px; text-decoration: underline; font-family: Poppins, system-ui, sans-serif; }
    .btn-cerrar-sesion-portal:hover { color: #c62828; }
    .employee-card { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin: 14px 0; padding: 18px 20px; border: 1px solid rgba(122,89,180,.12); border-radius: 22px; background: rgba(255,255,255,.9); color: #302441; }
    .avatar { width: 56px; height: 56px; flex: 0 0 56px; background: #6b1d9e; box-shadow: none; }
    .user-info strong { display: block; font-size: 1rem; }
    .user-info small { color: #756b7d; }
    .tabs { display: flex; gap: 8px; max-width: none; margin: 18px 0 14px; padding: 5px; border: 1px solid rgba(122,89,180,.12); border-radius: 16px; background: rgba(255,255,255,.76); }
    .tabs button { flex: 1; min-width: 0; padding: 10px 8px; border-radius: 12px; background: transparent; color: #4a148c; font-family: Poppins, system-ui, sans-serif; font-size: .84rem; line-height: 1.2; }
    .tabs button.activa { background: linear-gradient(135deg,#7c4dff,#5e35b1); color: #fff; box-shadow: 0 8px 18px rgba(124,77,255,.22); }
    .contenido { max-width: none; }
    .tarjeta { padding: 20px; border: 1px solid rgba(122,89,180,.12); border-radius: 22px; background: rgba(255,255,255,.92); box-shadow: 0 14px 30px rgba(62,27,90,.08); }
    .tarjeta h3 { color: #4a148c; }
    .nota { color: #4a148c; background: #f3e8ff; }
    .novedad-item { border: 1px solid #efe3ff; background: linear-gradient(180deg,#fff,#faf7ff); color: #302441; }
    .nov-tipo { color: #3a1d62; }
    .nov-obs { color: #756b7d; }
    .nov-detalle { color: #5f5b6d; }
    .vacio { color: #7a6f8d; }
    .comprobante { padding-top: 12px; }
    .comp-encabezado { border-color: #ede7f6; }
    .comp-encabezado h3, .comp-empresa { color: #4a148c; }
    .comp-datos, .tabla-comp td { color: #302441; }
    .tabla-comp th { border-color: #ede7f6; }
    .tabla-comp td { border-color: #f3eefb; }
    .tabla-comp { display: block; max-width: 100%; overflow-x: auto; }
    .tabla-comp th.th-devengo { background: rgba(31,157,85,.75); color: #fff; }
    .tabla-comp th.th-deduccion { background: rgba(198,40,40,.75); color: #fff; }
    .tabla-comp .celda-vacia { border-color: transparent; }
    .fila-totales, .fila-totales td { background: #f7f3fb; color: #302441; }
    .liquido-box { border-radius: 16px; background: #6b1d9e; }
    .campo label { color: #4a148c; }
    .campo input, .campo select, .campo textarea { border-radius: 12px; font-family: Poppins, system-ui, sans-serif; }
    .btn-principal { border-radius: 12px; background: linear-gradient(135deg,#7c4dff,#5e35b1); box-shadow: 0 8px 18px rgba(124,77,255,.22); font-family: Poppins, system-ui, sans-serif; }
    .btn-principal:hover:not(:disabled) { transform: none; box-shadow: none; }
    .btn-pdf-link { border-radius: 10px; }
    @media (max-width: 520px) { .portal-card { padding: 22px; } .tabs { gap: 2px; } .tabs button { font-size: .7rem; padding-inline: 3px; } .fila { flex-direction: column; gap: 0; } }
  `
  ]
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
