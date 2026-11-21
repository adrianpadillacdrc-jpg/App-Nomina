// src/app/pages/admin-aprobaciones/admin-aprobaciones.component.ts
// Vista del ADMINISTRADOR: pendientes de novedades y renuncias,
// aprobar/rechazar novedades, aceptar/rechazar renuncias, liquidar y pagar.
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { SidebarComponent } from '../../guards/components/sidebar/sidebar.component';

const API = '/api/portal';

interface NovedadPend {
  id: string;
  idEmpleado: number;
  cedula?: string;
  tipoNovedad: string;
  valor?: number;
  monto?: number;
  horas?: number;
  fechaInicio?: string;
  observaciones?: string;
  estado: string;
}

interface RenunciaItem {
  id: string;
  idEmpleado: number;
  nombreEmpleado: string;
  cargoEmpleado?: string;
  motivo: string;
  estado: string;
  fechaEnvio?: string;
  fechaAceptacion?: string;
  liquidacionEstimada?: number;
  estadoPago?: string;
  fechaPago?: string;
  nombrePdf?: string;
}

@Component({
  selector: 'app-admin-aprobaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  template: `
  <div class="page-wrapper">
    <app-sidebar></app-sidebar>
    <main class="main-content">
      <div class="container">
        <h1 class="page-title">Gestión de Novedades y Aprobaciones</h1>

        <!-- ===== PESTAÑAS ===== -->
        <div class="pestanas">
          <button class="pestanas-btn" [class.activa]="vista === 'APROBACIONES'" (click)="vista = 'APROBACIONES'">
            <i class="fas fa-check-double"></i> Aprobaciones
          </button>
          <button class="pestanas-btn" [class.activa]="vista === 'NOVEDADES'" (click)="vista = 'NOVEDADES'">
            <i class="fas fa-clipboard-list"></i> Novedades (registrar)
          </button>
        </div>

        <ng-container *ngIf="vista === 'APROBACIONES'">
        <!-- ===== FILTRO ===== -->
        <div class="tarjeta filtro-tarjeta">
          <div class="filtro-bar">
            <div class="filtro-campo filtro-buscar">
              <span class="filtro-icono">🔍</span>
              <input type="text" [(ngModel)]="filtroTexto" name="filtroTexto"
                     placeholder="Buscar por empleado o motivo..." />
            </div>
            <div class="filtro-campo">
              <label>Sección</label>
              <select [(ngModel)]="filtroSeccion" name="filtroSeccion">
                <option value="TODAS">Todas</option>
                <option value="NOVEDADES">Novedades</option>
                <option value="RENUNCIAS">Renuncias</option>
              </select>
            </div>
            <div class="filtro-campo">
              <label>Tipo de novedad</label>
              <select [(ngModel)]="filtroTipo" name="filtroTipo">
                <option value="TODOS">Todos</option>
                <option *ngFor="let t of tiposDisponibles" [value]="t">{{ etiquetaTipo(t) }}</option>
              </select>
            </div>
            <button class="btn limpiar" (click)="limpiarFiltro()" title="Limpiar filtros">✕ Limpiar</button>
          </div>
          <p class="filtro-resumen">
            Mostrando <strong>{{ totalFiltrado }}</strong> de {{ totalGeneral }} registros
          </p>
        </div>

        <!-- ===== NOVEDADES PENDIENTES ===== -->
        <div class="tarjeta" *ngIf="verSeccion('NOVEDADES')">
          <h3>
            Novedades pendientes
            <span class="chip">{{ novedadesFiltradas.length }}</span>
          </h3>

          <div class="item" *ngFor="let n of novedadesFiltradas">
            <div class="item-head">
              <span class="item-tipo">{{ etiquetaTipo(n.tipoNovedad) }}</span>
              <span class="badge badge-pendiente">Pendiente</span>
            </div>
            <div class="item-body">
              <span>Empleado: <strong>{{ nombreEmpleado(n.idEmpleado) }}</strong></span>
              <span *ngIf="n.fechaInicio">{{ n.fechaInicio }}</span>
              <span class="der" [class.verde]="!esDeduccion(n.tipoNovedad)" [class.rojo]="esDeduccion(n.tipoNovedad)">
                {{ valorN(n) | currency:'COP':'symbol':'1.0-0' }}
              </span>
            </div>
            <p class="obs" *ngIf="n.observaciones">{{ n.observaciones }}</p>
            <div class="acciones">
              <button class="btn ok" (click)="responderNovedad(n, 'APROBADA')">✔ Aprobar</button>
              <button class="btn no" (click)="responderNovedad(n, 'RECHAZADA')">✖ Rechazar</button>
            </div>
          </div>
          <p class="vacio" *ngIf="novedadesFiltradas.length === 0">No hay novedades pendientes. ✅</p>
        </div>

        <!-- ===== RENUNCIAS ENVIADAS ===== -->
        <div class="tarjeta" *ngIf="verSeccion('RENUNCIAS')">
          <h3>
            Renuncias enviadas
            <span class="chip">{{ renunciasFiltradas.length }}</span>
          </h3>

          <div class="item" *ngFor="let r of renunciasFiltradas">
            <div class="item-head">
              <span class="item-tipo">{{ r.nombreEmpleado }}</span>
              <span class="badge badge-enviada">Enviada</span>
            </div>
            <div class="item-body">
              <span>{{ r.cargoEmpleado || 'Empleado' }}</span>
              <span *ngIf="r.fechaEnvio">Enviada: {{ r.fechaEnvio }}</span>
              <button *ngIf="r.id" type="button" class="pdf-link" (click)="descargarPdf(r.id)">📄 PDF</button>
            </div>
            <p class="obs">Motivo: {{ r.motivo }}</p>
            <div class="acciones">
              <button class="btn ok" (click)="aceptarRenuncia(r)">✔ Aceptar y liquidar</button>
              <button class="btn no" (click)="rechazarRenuncia(r)">✖ Rechazar</button>
            </div>
          </div>
          <p class="vacio" *ngIf="renunciasFiltradas.length === 0">No hay renuncias enviadas. ✅</p>
        </div>

        </ng-container>

        <ng-container *ngIf="vista === 'NOVEDADES'">
          <!-- ===== BUSCADOR DE EMPLEADOS ===== -->
          <div class="tarjeta filtro-tarjeta">
            <div class="filtro-bar novedades-busqueda">
              <div class="filtro-campo filtro-buscar">
                <span class="filtro-icono">🔍</span>
                <input type="text" [(ngModel)]="busquedaNovedades" name="busquedaNovedades"
                       placeholder="Buscar empleado por nombre, apellido o documento..." />
              </div>
            </div>
            <p class="filtro-resumen">
              Mostrando <strong>{{ empleadosFiltrados.length }}</strong> de {{ empleados.length }} empleados
            </p>
          </div>

          <div class="tarjeta">
            <h3>Empleados <span class="chip">{{ empleadosFiltrados.length }}</span></h3>
            <div class="item" *ngFor="let emp of empleadosFiltrados">
              <div class="item-head">
                <span class="item-tipo">{{ emp.nombre }} {{ emp.apellido }}</span>
              </div>
              <div class="item-body">
                <span>Documento: {{ emp.numeroDocumento }} | {{ emp.cargo || 'Sin cargo' }}</span>
              </div>
              <div class="acciones">
                <button class="btn ok" (click)="abrirNovedad(emp)">＋ Agregar Novedad</button>
                <button class="btn no" (click)="verNovedades(emp)">👁 Ver Novedades</button>
              </div>
            </div>
            <p class="vacio" *ngIf="empleadosFiltrados.length === 0 && busquedaNovedades">❌ No se encontraron empleados</p>
            <p class="vacio" *ngIf="empleados.length === 0 && !busquedaNovedades">📭 No hay empleados activos</p>
          </div>
        </ng-container>
      </div>
    </main>
  </div>

  <!-- ===== MODAL VER NOVEDADES ===== -->
  <div class="modal-overlay" *ngIf="mostrarModalNovedades" (click)="cerrarModalNovedades()">
    <div class="modal-caja" (click)="$event.stopPropagation()">
      <div class="modal-cab">
        <h3>Novedades de {{ empleadoSeleccionado?.nombre }} {{ empleadoSeleccionado?.apellido }}</h3>
        <button class="btn no" (click)="cerrarModalNovedades()">✖</button>
      </div>
      <div class="item" *ngFor="let nov of novedadesEmpleado">
        <div class="item-head">
          <span class="item-tipo">{{ etiquetaTipo(nov.tipoNovedad) }}</span>
          <span class="badge" [class.badge-pendiente]="nov.estado === 'PENDIENTE'" [class.badge-aprobada]="nov.estado === 'APROBADO'">
            {{ nov.estado || 'PENDIENTE' }}
          </span>
        </div>
        <div class="item-body">
          <span *ngIf="nov.fechaInicio">{{ nov.fechaInicio | date:'dd/MM/yyyy' }}</span>
          <span class="der" *ngIf="nov.valor">$ {{ nov.valor | number:'1.0-0' }}</span>
        </div>
        <p class="obs" *ngIf="nov.observaciones">{{ nov.observaciones }}</p>
      </div>
      <p class="vacio" *ngIf="novedadesEmpleado.length === 0">📭 No hay novedades registradas para este empleado</p>
    </div>
  </div>
  `,
  styles: [`
    .page-wrapper { display: flex; min-height: 100vh; }
    .main-content { margin-left: 240px; padding: 40px; flex: 1; min-height: 100vh; background: linear-gradient(135deg, rgba(240,235,255,.78) 0%, rgba(236,228,255,.74) 35%, rgba(243,236,255,.78) 100%), url('/assets/numa.jpg') center / cover fixed no-repeat; }
    .container { max-width: 1180px; margin: 0 auto; }
    .page-title { color: #4a148c; font-size: 34px; font-weight: 800; margin-bottom: 28px; }
    .tarjeta { background: rgba(255,255,255,.90); border: 1px solid rgba(122, 89, 180, .12); border-radius: 22px; padding: 26px; margin-bottom: 26px; box-shadow: 0 14px 30px rgba(62, 27, 90, .08); }
    .tarjeta h3 { margin: 0 0 16px; color: #4a148c; display: flex; align-items: center; gap: 10px; }
    .chip { background: linear-gradient(135deg, #7c4dff, #5e35b1); color: #fff; border-radius: 50px; padding: 4px 12px; font-size: 13px; box-shadow: 0 8px 18px rgba(124,77,255,.22); }
    .item { background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,244,255,0.96) 100%); border: 1px solid #efe3ff; border-radius: 18px; padding: 18px; margin-bottom: 12px; box-shadow: 0 10px 20px rgba(84, 53, 119, .04); }
    .item-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding-bottom: 10px; border-bottom: 1px solid #f2ebff; }
    .item-tipo { font-weight: 800; color: #3a1d62; font-size: 15px; }
    .item-body { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px 14px; font-size: 13px; color: #5f5b6d; margin-top: 10px; }
    .obs { font-size: 13px; color: #6b5d89; margin: 10px 0 0; line-height: 1.5; }
    .acciones { display: flex; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
    .btn { padding: 9px 16px; border: none; border-radius: 13px; font-weight: 700; cursor: pointer; transition: .25s; letter-spacing: .1px; }
    .btn.ok { background: linear-gradient(135deg, #2f7d32, #49a84f); color: #fff; box-shadow: 0 10px 18px rgba(47,125,50,.18); }
    .btn.ok:hover { background: linear-gradient(135deg, #1f6d2a, #2f7d32); transform: translateY(-1px); }
    .btn.no { background: #fff1f2; color: #b42318; border: 1px solid #f9c7ce; }
    .btn.no:hover { background: #ffe4e6; transform: translateY(-1px); }
    .badge { padding: 5px 10px; border-radius: 50px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .5px; }
    .badge-pendiente { background: #fff3e8; color: #c26a00; }
    .badge-aprobada { background: #eafaf0; color: #1f7a45; }
    .badge-enviada { background: #edf5ff; color: #185ec7; }
    .verde { color: #2e7d32; font-weight: 700; }
    .rojo { color: #c62828; font-weight: 700; }
    .der { margin-left: auto; text-align: right; }
    .vacio { color: #7a6f8d; font-style: italic; text-align: center; padding: 18px; }
    .pdf-link { border: 0; padding: 0; background: none; color: #1565c0; font: inherit; font-weight: 600; text-decoration: none; cursor: pointer; }
    .pdf-link:hover { text-decoration: underline; }

    /* ===== FILTRO ===== */
    .filtro-tarjeta { background: rgba(255,255,255,.74); border: 1px solid rgba(122, 89, 180, .12); backdrop-filter: blur(8px); border-radius: 22px; padding: 22px 20px; }
    .filtro-bar { display: grid; grid-template-columns: minmax(200px, 280px) minmax(180px, 1fr) minmax(180px, 1fr) auto; gap: 14px; align-items: end; }
    .filtro-bar.novedades-busqueda { grid-template-columns: minmax(0, 360px); max-width: 360px; }
    .filtro-campo { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
    .filtro-campo label { font-size: 11px; font-weight: 800; color: #6a1b9a; text-transform: uppercase; letter-spacing: .8px; }
    .filtro-campo input, .filtro-campo select { width: 100%; height: 42px; padding: 8px 12px; border: 1px solid #e9dffd; border-radius: 12px; font-size: 13px; outline: none; transition: .2s; background: rgba(255,255,255,.92); color: #2b1f42; box-sizing: border-box; }
    .filtro-campo input:focus, .filtro-campo select:focus { border-color: #7c4dff; box-shadow: 0 0 0 3px rgba(124,77,255,.15); background: #fff; }
    .filtro-buscar { position: relative; }
    .filtro-buscar input { padding-left: 36px; }
    .filtro-icono { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 14px; opacity: .7; }
    .btn.limpiar { background: #f3e8ff; color: #6a1b9a; padding: 8px 14px; height: 42px; border-radius: 12px; border: 1px solid rgba(122, 89, 180, .15); }
    .btn.limpiar:hover { background: linear-gradient(135deg, #e9d6ff, #dfc9ff); transform: translateY(-1px); }
    .filtro-resumen { margin: 12px 0 0; font-size: 12px; color: #7a6f8d; }
    .filtro-resumen strong { color: #4a148c; }
    @media (max-width: 1050px) {
      .filtro-bar { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .filtro-bar .filtro-buscar { grid-column: 1 / -1; max-width: 360px; }
    }
    @media (max-width: 600px) {
      .filtro-bar { grid-template-columns: minmax(0, 1fr); }
      .filtro-bar .filtro-buscar { grid-column: auto; width: 100%; max-width: 360px; }
    }

    /* ===== PESTAÑAS ===== */
    .pestanas { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
    .pestanas-btn { padding: 12px 22px; border: none; border-radius: 50px; font-weight: 800; font-size: 15px; cursor: pointer; background: rgba(255,255,255,.9); color: #4a148c; transition: .25s; box-shadow: 0 8px 20px rgba(58, 35, 92, .12); }
    .pestanas-btn:hover { transform: translateY(-2px); background: #fff; }
    .pestanas-btn.activa { background: linear-gradient(135deg, #7c4dff, #5e35b1); color: #fff; box-shadow: 0 10px 22px rgba(124,77,255,.3); }

    /* ===== MODAL ===== */
    .modal-overlay { position: fixed; inset: 0; background: rgba(30,0,60,.55); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
    .modal-caja { background: #fff; border-radius: 22px; padding: 26px; width: 100%; max-width: 560px; max-height: 80vh; overflow-y: auto; box-shadow: 0 12px 30px rgba(0,0,0,.4); }
    .modal-cab { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .modal-cab h3 { margin: 0; color: #4a148c; }
  `]
})
export class AdminAprobacionesComponent implements OnInit {
  vista: 'APROBACIONES' | 'NOVEDADES' = 'APROBACIONES';

  // Novedades (registrar)
  empleados: any[] = [];
  busquedaNovedades = '';
  empleadoSeleccionado: any | null = null;
  mostrarModalNovedades = false;
  novedadesEmpleado: any[] = [];

  novedades: NovedadPend[] = [];
  renuncias: RenunciaItem[] = [];
  liquidadas: RenunciaItem[] = [];
  empleadosMap = new Map<number, string>();

  // Filtros
  filtroTexto = '';
  filtroSeccion = 'TODAS';
  filtroTipo = 'TODOS';

  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit() {
    this.cargarEmpleados();
    this.cargarEmpleadosNovedades();
    this.cargarPendientes();
  }

  get empleadosFiltrados(): any[] {
    const term = this.busquedaNovedades.trim().toLowerCase();
    if (!term) return this.empleados;
    return this.empleados.filter((e: any) =>
      e.numeroDocumento.includes(term) ||
      e.nombre.toLowerCase().includes(term) ||
      e.apellido.toLowerCase().includes(term)
    );
  }

  cargarEmpleadosNovedades() {
    this.http.get<any>(`/api/empleados?page=0&size=50`).subscribe({
      next: (data) => {
        const raw = data.content ? data.content : (Array.isArray(data) ? data : []);
        this.empleados = raw.map((e: any) => ({
          id: e.id,
          numeroDocumento: e.numeroDocumento?.toString() || 'S/N',
          nombre: this.cap(e.nombre || ''),
          apellido: this.cap(e.apellido || ''),
          cargo: this.cap(e.cargo || '')
        }));
      },
      error: () => { }
    });
  }

  private cap(t: string): string {
    return t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : '';
  }

  abrirNovedad(emp: any) {
    this.router.navigate(['/nueva-novedad'], {
      queryParams: { cedula: emp.numeroDocumento, nombre: emp.nombre, apellido: emp.apellido, idEmpleado: emp.id }
    });
  }

  verNovedades(emp: any) {
    this.empleadoSeleccionado = emp;
    this.http.get<any[]>(`/api/novedades/empleado/${emp.id}`).subscribe({
      next: (data) => { this.novedadesEmpleado = data || []; this.mostrarModalNovedades = true; },
      error: () => { this.novedadesEmpleado = []; this.mostrarModalNovedades = true; }
    });
  }

  cerrarModalNovedades() {
    this.mostrarModalNovedades = false;
    this.novedadesEmpleado = [];
    this.empleadoSeleccionado = null;
  }

  cargarEmpleados(page = 0) {
    this.http.get<any>(`/api/empleados?page=${page}&size=100`).subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data : (data.content || []);
        list.forEach((e: any) => this.empleadosMap.set(e.id, `${e.nombre} ${e.apellido}`));
        if (!Array.isArray(data) && data.last === false && list.length > 0) {
          this.cargarEmpleados(page + 1);
        }
      },
      error: () => { }
    });
  }

  cargarPendientes() {
    this.http.get<any>(`${API}/admin/pendientes`).subscribe({
      next: (data) => {
        this.novedades = data.novedades || [];
        this.renuncias = data.renuncias || [];
        this.liquidadas = data.liquidadas || [];
      },
      error: () => alert('Error al cargar pendientes')
    });
  }

  nombreEmpleado(id: number): string {
    return this.empleadosMap.get(id) || `Nombre no disponible (ID: ${id})`;
  }

  responderNovedad(n: NovedadPend, estado: string) {
    if (!confirm(`¿${estado === 'APROBADA' ? 'Aprobar' : 'Rechazar'} esta novedad?`)) return;
    this.http.post(`${API}/novedades/${n.id}/responder`, { estado }).subscribe({
      next: () => this.cargarPendientes(),
      error: () => alert('Error al responder la novedad')
    });
  }

  aceptarRenuncia(r: RenunciaItem) {
    if (!confirm(`¿Aceptar la renuncia de ${r.nombreEmpleado}? Se calculará la liquidación.`)) return;
    this.http.post<any>(`${API}/renuncia/${r.id}/aceptar`, {}).subscribe({
      next: () => this.cargarPendientes(),
      error: () => alert('Error al aceptar la renuncia')
    });
  }

  rechazarRenuncia(r: RenunciaItem) {
    if (!confirm(`¿Rechazar la renuncia de ${r.nombreEmpleado}?`)) return;
    this.http.post(`${API}/renuncia/${r.id}/rechazar`, {}).subscribe({
      next: () => this.cargarPendientes(),
      error: () => alert('Error al rechazar la renuncia')
    });
  }

  pagarLiquidacion(r: RenunciaItem) {
    if (!confirm(`¿Marcar la liquidación de ${r.nombreEmpleado} como pagada?`)) return;
    this.http.post(`${API}/renuncia/${r.id}/pagar`, {}).subscribe({
      next: () => this.cargarPendientes(),
      error: () => alert('Error al marcar el pago')
    });
  }

  descargarPdf(id: string) {
    this.http.get(`${API}/renuncia/${id}/pdf`, { responseType: 'blob' }).subscribe({
      next: (pdf) => {
        const url = URL.createObjectURL(pdf);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `renuncia-${id}.pdf`;
        enlace.click();
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => alert('No se pudo descargar la carta de renuncia')
    });
  }

  pagoOk(r: RenunciaItem): boolean {
    return (r.estadoPago || '').toUpperCase() === 'PAGADO';
  }

  etiquetaTipo(tipo: string): string {
    const mapa: any = {
      BONO: 'Bono', BONIFICACION: 'Bonificación', COMISION: 'Comisión',
      HORAS_EXTRAS: 'Horas extras', AUXILIO_TRANSPORTE: 'Auxilio transporte',
      INCAPACIDAD: 'Incapacidad', PERMISO: 'Permiso', PRESTAMO: 'Préstamo',
      EMBARGO: 'Embargo', DEDUCCION: 'Deducción', OTRO: 'Otro'
    };
    return mapa[tipo] || tipo;
  }

  // ===== FILTRO =====
  get tiposDisponibles(): string[] {
    return [...new Set(this.novedades.map(n => n.tipoNovedad))];
  }

  private coincideTexto(nombre: string, obs?: string): boolean {
    const t = this.filtroTexto.trim().toLowerCase();
    if (!t) return true;
    return (nombre || '').toLowerCase().includes(t) || (obs || '').toLowerCase().includes(t);
  }

  get novedadesFiltradas(): NovedadPend[] {
    return this.novedades.filter(n =>
      (this.filtroTipo === 'TODOS' || n.tipoNovedad === this.filtroTipo) &&
      this.coincideTexto(this.nombreEmpleado(n.idEmpleado), n.observaciones)
    );
  }

  get renunciasFiltradas(): RenunciaItem[] {
    return this.renuncias.filter(r => this.coincideTexto(r.nombreEmpleado, r.motivo));
  }

  get liquidadasFiltradas(): RenunciaItem[] {
    return this.liquidadas.filter(r => this.coincideTexto(r.nombreEmpleado, r.motivo));
  }

  get totalFiltrado(): number {
    let total = 0;
    if (this.verSeccion('NOVEDADES')) total += this.novedadesFiltradas.length;
    if (this.verSeccion('RENUNCIAS')) total += this.renunciasFiltradas.length;
    return total;
  }

  get totalGeneral(): number {
    return this.novedades.length + this.renuncias.length;
  }

  verSeccion(s: string): boolean {
    return this.filtroSeccion === 'TODAS' || this.filtroSeccion === s;
  }

  limpiarFiltro() {
    this.filtroTexto = '';
    this.filtroSeccion = 'TODAS';
    this.filtroTipo = 'TODOS';
  }

  esDeduccion(tipo: string): boolean {
    return ['PRESTAMO', 'EMBARGO', 'DEDUCCION', 'INCAPACIDAD', 'PERMISO_NO_REMUNERADO'].includes(tipo);
  }

  valorN(n: NovedadPend): number {
    return Number(n.valor) || Number(n.monto) || 0;
  }
}
