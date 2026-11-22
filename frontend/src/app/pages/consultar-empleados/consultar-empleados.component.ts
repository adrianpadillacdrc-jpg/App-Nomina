// src/app/pages/consultar-empleados/consultar-empleados.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../guards/components/sidebar/sidebar.component';
import { EncabezadoPaginaComponent } from '../../shared/components/encabezado-pagina/encabezado-pagina.component';
import { TablaBaseComponent } from '../../shared/components/tabla-base/tabla-base.component';
import { ActualizarEmpleadoComponent } from './actualizar-empleado/actualizar-empleado.component';
import { EmpleadosService } from '../../services/empleados.service';

@Component({
  selector: 'app-consultar-empleados',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SidebarComponent,
    EncabezadoPaginaComponent,
    TablaBaseComponent,
    ActualizarEmpleadoComponent
  ],
  templateUrl: './consultar-empleados.component.html',
  styleUrls: ['./consultar-empleados.component.scss']
})
export class ConsultarEmpleadosComponent implements OnInit {

  empleados: any[] = [];
  empleadosFiltrados: any[] = [];
  busqueda = '';

  // ✅ Variables de Control para la Paginación
  paginaActual = 0;
  tamanoPagina = 10;
  totalElementos = 0;
  totalPaginas = 0;

  // Modal Nómina
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

  private searchTimeout: any;

  // ✅ Actualizado: Lee la propiedad '.content' que devuelve Spring Boot con búsqueda en BD
  cargarEmpleados() {
    this.empleadosService.getEmpleados(this.paginaActual, this.tamanoPagina, '', this.busqueda).subscribe({
      next: (response: any) => {
        // Extraemos la lista de la propiedad content de Spring Data Page
        const rawContent = response.content || [];
        
        this.empleados = rawContent.map((emp: any) => ({
          ...emp,
          id: emp.id,
          documento: emp.numeroDocumento || emp.documento || 'S/N',
          nombre: this.limpiarTexto(emp.nombre || 'Sin nombre'),
          apellido: this.limpiarTexto(emp.apellido || 'Sin apellido'),
          cargo: emp.cargo || 'Sin cargo',
          salarioBase: Number(emp.salarioBase) || 0,
          tasaArl: Number(emp.tasaArl) > 0 ? Number(emp.tasaArl) : 0.522,
          modalidadTrabajo: emp.modalidadTrabajo || 'PRESENCIAL',
          transporteSuministrado: emp.transporteSuministrado ?? false,
          foto: emp.foto || '/assets/user-default.png'
        }));
        
        this.empleadosFiltrados = [...this.empleados];

        // Guardamos la información de las páginas para los botones
        this.totalElementos = response.totalElements !== undefined ? response.totalElements : rawContent.length;
        this.totalPaginas = response.totalPages !== undefined ? response.totalPages : 1;
      },
      error: () => alert('Error al cargar empleados')
    });
  }

  // ✅ Métodos nuevos para controlar el flujo de páginas
  cambiarPagina(nuevaPagina: number) {
    if (nuevaPagina >= 0 && nuevaPagina < this.totalPaginas) {
      this.paginaActual = nuevaPagina;
      this.cargarEmpleados();
    }
  }

  cambiarTamanoPagina() {
    this.paginaActual = 0; // Reinicia a la página 1 cuando cambia la densidad
    this.cargarEmpleados();
  }

  cargarPeriodoActual() {
    this.empleadosService.getPeriodoActual().subscribe({
      next: (periodo) => this.periodoActual = periodo,
      error: () => this.periodoActual = null
    });
  }

  filtrar() {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.paginaActual = 0;
      this.cargarEmpleados();
    }, 250);
  }

  buscarDirecto() {
    clearTimeout(this.searchTimeout);
    this.paginaActual = 0;
    this.cargarEmpleados();
  }

  verNominaCompleta(empleado: any) {
    this.empleadoSeleccionado = empleado;
    this.novedadesEmpleado = [];
    this.totalDevengos = empleado.salarioBase;
    this.totalDeducciones = 0;
    this.netoPagar = empleado.salarioBase;

    this.empleadosService.getNovedadesPorEmpleado(empleado.id).subscribe({
      next: (novedades: any[]) => {
        this.novedadesEmpleado = novedades.filter(n => n.estado?.toUpperCase() === 'APROBADA').map(n => ({
          tipo: this.esDevengo(n.tipoNovedad) ? 'DEVENGO' : 'DEDUCCION',
          descripcion: this.getConcepto(n.tipoNovedad),
          valor: Number(n.valor ?? n.monto) || 0
        }));

        this.novedadesEmpleado.forEach(n => {
          if (n.tipo === 'DEVENGO') this.totalDevengos += n.valor;
          if (n.tipo === 'DEDUCCION') this.totalDeducciones += n.valor;
        });
        this.netoPagar = this.totalDevengos - this.totalDeducciones;
      },
      error: () => {
        this.novedadesEmpleado = [];
      },
      complete: () => {
        this.mostrarModalNomina = true;
      }
    });
  }

  esDevengo(tipo: string): boolean {
    return ['HORAS_EXTRAS', 'BONIFICACION', 'COMISION', 'AUXILIO_TRANSPORTE'].includes(tipo);
  }

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
          <h1>Resumen de salario y novedades aprobadas</h1>
          <h2>NUMA S.A.S</h2>
          <p>${this.periodoActual?.description || 'Sin período activo'}</p>
        </div>
        <div class="info-empleado">
          <div><strong>Empleado:</strong> ${this.empleadoSeleccionado?.nombre} ${this.empleadoSeleccionado?.apellido}</div>
          <div><strong>Cédula:</strong> ${this.empleadoSeleccionado?.documento}</div>
          <div><strong>Cargo:</strong> ${this.empleadoSeleccionado?.cargo}</div>
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

  limpiarTexto(texto: string): string {
    if (!texto) return '';
    return texto
      .replace(/Mart\?nez/gi, 'Martínez')
      .replace(/Hern\?ndez/gi, 'Hernández')
      .replace(/G\?mez/gi, 'Gómez')
      .replace(/P\?rez/gi, 'Pérez')
      .replace(/Rodr\?guez/gi, 'Rodríguez')
      .replace(/S\?nchez/gi, 'Sánchez')
      .replace(/D\?az/gi, 'Díaz')
      .replace(/Garc\?a/gi, 'García')
      .replace(/L\?pez/gi, 'López')
      .replace(/Ram\?rez/gi, 'Ramírez')
      .replace(/Gonz\?lez/gi, 'González')
      .replace(/Mu\?oz/gi, 'Muñoz')
      .replace(/Pe\?a/gi, 'Peña')
      .replace(/Ni\?o/gi, 'Niño')
      .replace(/Berm\?dez/gi, 'Bermúdez')
      .replace(/Jim\?nez/gi, 'Jiménez')
      .replace(/Guti\?rrez/gi, 'Gutiérrez')
      .replace(/V\?squez/gi, 'Vásquez')
      .replace(/Vel\?squez/gi, 'Velásquez')
      .replace(/Su\?rez/gi, 'Suárez')
      .replace(/M\?rquez/gi, 'Márquez')
      .replace(/C\?rdenas/gi, 'Cárdenas')
      .replace(/Casta\?eda/gi, 'Castañeda')
      .replace(/Ca\?averal/gi, 'Cañaveral')
      .replace(/Qui\?ones/gi, 'Quiñones')
      .replace(/Monta\?o/gi, 'Montaño')
      .replace(/Acu\?a/gi, 'Acuña')
      .replace(/Londo\?o/gi, 'Londoño')
      .replace(/Pati\?o/gi, 'Patiño')
      .replace(/Andr\?s/gi, 'Andrés')
      .replace(/Jos\?(\b|\s)/gi, 'José$1')
      .replace(/Mar\?a/gi, 'María')
      .replace(/Jes\?s/gi, 'Jesús')
      .replace(/Sebasti\?n/gi, 'Sebastián')
      .replace(/Juli\?n/gi, 'Julián')
      .replace(/Mart\?n/gi, 'Martín')
      .replace(/Hern\?n/gi, 'Hernán')
      .replace(/Ra\?l/gi, 'Raúl')
      .replace(/Iv\?n/gi, 'Iván')
      .replace(/Rub\?n/gi, 'Rubén')
      .replace(/C\?sar/gi, 'César')
      .replace(/\?/g, '');
  }
}
