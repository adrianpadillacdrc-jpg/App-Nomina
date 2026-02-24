// src/app/pages/consultar-empleados/consultar-empleados.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { ActualizarEmpleadoComponent } from './actualizar-empleado/actualizar-empleado.component';
import { EmpleadosService } from '../../services/empleados.service';

@Component({
  selector: 'app-consultar-empleados',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SidebarComponent,
    ActualizarEmpleadoComponent
  ],
  templateUrl: './consultar-empleados.component.html',
  styleUrls: ['./consultar-empleados.component.scss']
})
export class ConsultarEmpleadosComponent implements OnInit {

  empleados: any[] = [];
  empleadosFiltrados: any[] = [];
  busqueda = '';

  // Modal Nómina (EL MISMO QUE EL EMPLEADO)
  mostrarModalNomina = false;
  empleadoSeleccionado: any = null;
  periodoActual: any = null;
  novedadesEmpleado: any[] = [];
  totalDevengos = 0;
  totalDeducciones = 0;
  netoPagar = 0;

  // Formulario Actualizar
  mostrarActualizar = false;
  empleadoEditando: any = null;

  constructor(private empleadosService: EmpleadosService) { }

  ngOnInit() {
    this.cargarEmpleados();
    this.cargarPeriodoActual();
  }

  cargarEmpleados() {
    this.empleadosService.getEmpleados().subscribe({
      next: (data: any[]) => {
        this.empleados = data.map(emp => ({
          id: emp.id,
          documento: emp.numeroDocumento || emp.documento || 'S/N',
          nombre: emp.nombre || 'Sin nombre',
          apellido: emp.apellido || 'Sin apellido',
          cargo: emp.cargo || 'Sin cargo',
          salarioBase: Number(emp.salarioBase) || 0,
          foto: emp.foto || '/assets/user-default.png'
        }));
        this.empleadosFiltrados = [...this.empleados];
      },
      error: () => alert('Error al cargar empleados')
    });
  }

  cargarPeriodoActual() {
    this.empleadosService.getPeriodoActual().subscribe({
      next: (periodo) => this.periodoActual = periodo,
      error: () => this.periodoActual = null
    });
  }

  filtrar() {
    const term = this.busqueda.toLowerCase();
    this.empleadosFiltrados = this.empleados.filter(e =>
      e.documento.includes(term) ||
      `${e.nombre} ${e.apellido}`.toLowerCase().includes(term) ||
      e.cargo.toLowerCase().includes(term)
    );
  }

  // FUNCIÓN CLAVE: ABRE EL COMPROBANTE ÉPICO
  verNominaCompleta(empleado: any) {
    this.empleadoSeleccionado = empleado;
    this.novedadesEmpleado = [];
    this.totalDevengos = empleado.salarioBase;
    this.totalDeducciones = 0;
    this.netoPagar = empleado.salarioBase;

    // Carga las novedades reales del backend
    this.empleadosService.getNovedadesPorEmpleado(empleado.id).subscribe({
      next: (novedades: any[]) => {
        this.novedadesEmpleado = novedades.map(n => ({
          tipo: this.esDevengo(n.tipoNovedad) ? 'DEVENGO' : 'DEDUCCION',
          descripcion: this.getConcepto(n.tipoNovedad),
          valor: Number(n.valor) || 0
        }));

        // Recalcula totales
        this.novedadesEmpleado.forEach(n => {
          if (n.tipo === 'DEVENGO') this.totalDevengos += n.valor;
          if (n.tipo === 'DEDUCCION') this.totalDeducciones += n.valor;
        });
        this.netoPagar = this.totalDevengos - this.totalDeducciones;
      },
      error: () => {
        // Si falla el backend, al menos muestra el salario base
        this.novedadesEmpleado = [];
      },
      complete: () => {
        this.mostrarModalNomina = true; // Abre el modal con el diseño brutal
      }
    });
  }

  // Helper: ¿es devengo?
  esDevengo(tipo: string): boolean {
    return ['HORAS_EXTRAS', 'BONIFICACION', 'COMISION', 'AUXILIO_TRANSPORTE'].includes(tipo);
  }

  // Helper: nombre bonito del concepto
  getConcepto(tipo: string): string {
    const mapa: any = {
      HORAS_EXTRAS: 'Horas extras',
      BONIFICACION: 'Bonificación',
      COMISION: 'Comisión',
      AUXILIO_TRANSPORTE: 'Auxilio de transporte',
      PRESTAMO: 'Préstamo',
      EMBARGO: 'Embargo',
      SALUD: 'Salud (4%)',
      PENSION: 'Pensión (4%)'
    };
    return mapa[tipo] || tipo;
  }

  cerrarModalNomina() {
    this.mostrarModalNomina = false;
    this.empleadoSeleccionado = null;
    this.novedadesEmpleado = [];
  }

  abrirActualizar(empleado: any) {
    this.empleadoEditando = empleado;
    this.mostrarActualizar = true;
  }

  // IMPRIMIR EL COMPROBANTE ÉPICO (el mismo que el empleado)
  imprimirNomina() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor permite ventanas emergentes');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Comprobante - ${this.empleadoSeleccionado?.nombre} ${this.empleadoSeleccionado?.apellido}</title>
        <style>
          body { font-family: 'Courier New', monospace; margin: 40px; background: white; color: black; }
          .header-comprobante { text-align: center; border-bottom: 3px double black; padding-bottom: 20px; margin-bottom: 30px; }
          .header-comprobante h1 { font-size: 24px; margin: 0; color: #6a1b9a; }
          .header-comprobante h2 { font-size: 20px; margin: 10px 0; }
          .info-empleado { font-size: 16px; line-height: 2; margin: 30px 0; }
          table { width: 100%; border-collapse: collapse; margin: 30px 0; border: 2px solid black; }
          th { padding: 12px; text-align: center; color: white; }
          .devengo { background: #2e7d32; }
          .deduccion { background: #c62828; }
          td { border: 1px solid black; padding: 10px; }
          .valor { text-align: right; font-weight: bold; }
          .totales { background: #e8f5e8; font-size: 18px; font-weight: bold; }
          .caja-liquido { display: inline-block; border: 5px double black; padding: 20px 60px; background: #f9f9f9; margin: 40px 0; }
          .monto-grande { font-size: 36px; color: #2e7d32; font-weight: bold; }
          .firma { text-align: center; margin-top: 80px; font-size: 18px; }
        </style>
      </head>
      <body>
        <div class="header-comprobante">
          <h1>COMPROBANTE DE PAGO DE NÓMINA</h1>
          <h2>NUMA S.A.S</h2>
          <p>NIT: 901.234.567-8 | Periodo: Noviembre 2025</p>
        </div>
        <div class="info-empleado">
          <div><strong>Empleado:</strong> ${this.empleadoSeleccionado?.nombre} ${this.empleadoSeleccionado?.apellido}</div>
          <div><strong>Cédula:</strong> ${this.empleadoSeleccionado?.documento}</div>
          <div><strong>Cargo:</strong> ${this.empleadoSeleccionado?.cargo}</div>
          <div><strong>Días trabajados:</strong> 30</div>
        </div>
        <table>
          <tr>
            <th class="devengo" colspan="3">DEVENGOS</th>
            <th class="deduccion" colspan="2">DEDUCCIONES</th>
          </tr>
          <tr>
            <th>Cód.</th><th>Concepto</th><th>Valor</th><th>Concepto</th><th>Valor</th>
          </tr>
          <tr>
            <td>001</td>
            <td>Salario Base</td>
            <td class="valor">$ ${this.empleadoSeleccionado?.salarioBase?.toLocaleString('es-CO')}</td>
            <td></td><td></td>
          </tr>
          ${this.novedadesEmpleado.map((n, i) => n.tipo === 'DEVENGO' ? `
          <tr>
            <td>00${i + 2}</td>
            <td>${n.descripcion}</td>
            <td class="valor">$ ${n.valor.toLocaleString('es-CO')}</td>
            <td></td><td></td>
          </tr>` : '').join('')}
          ${this.novedadesEmpleado.map(n => n.tipo === 'DEDUCCION' ? `
          <tr>
            <td></td><td></td><td></td>
            <td>${n.descripcion}</td>
            <td class="valor">$ ${n.valor.toLocaleString('es-CO')}</td>
          </tr>` : '').join('')}
          <tr class="totales">
            <td colspan="2"><strong>TOTAL DEVENGADO</strong></td>
            <td class="valor"><strong>$ ${this.totalDevengos.toLocaleString('es-CO')}</strong></td>
            <td><strong>TOTAL DEDUCIDO</strong></td>
            <td class="valor"><strong>$ ${this.totalDeducciones.toLocaleString('es-CO')}</strong></td>
          </tr>
        </table>
        <div style="text-align:center;margin:40px 0">
          <div class="caja-liquido">
            <strong>LÍQUIDO A PERCIBIR</strong><br>
            <span class="monto-grande">$ ${this.netoPagar.toLocaleString('es-CO')}</span>
          </div>
        </div>
        <div class="firma">
          <p>_________________________</p>
          <p>Firma del Empleado</p>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 800);
  }

  trackByEmpleadoId(index: number, emp: any): any {
    return emp.id || index;
  }
}