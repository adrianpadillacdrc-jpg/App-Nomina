// src/app/pages/pago-nomina/pago-nomina.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../guards/components/sidebar/sidebar.component';
import { EncabezadoPaginaComponent } from '../../shared/components/encabezado-pagina/encabezado-pagina.component';
import { TablaBaseComponent } from '../../shared/components/tabla-base/tabla-base.component';
import { EmpleadosService } from '../../services/empleados.service';
import { jsPDF } from 'jspdf';

interface ConceptoDetalle {
  tipo: string;
  concepto: string;
  valor: number;
}

interface NominaItem {
  id: number;
  nombre: string;
  apellido: string;
  sueldoBase: number;
  devengos: number;
  deducciones: number;
  totalPagar: number;
  aportesEmpleador: number;
  provisionesPrestacionales: number;
  costoTotalEmpleador: number;
  detalleAportesEmpleador: ConceptoDetalle[];
  detalleDevengos: ConceptoDetalle[];
  detalleDeducciones: ConceptoDetalle[];
  expandido?: boolean;
}

@Component({
  selector: 'app-pago-nomina',
  standalone: true,
  imports: [CommonModule, SidebarComponent, EncabezadoPaginaComponent, TablaBaseComponent],
  templateUrl: './pago-nomina.component.html',
  styleUrl: './pago-nomina.component.scss'
})
export class PagoNominaComponent implements OnInit {
  periodoActual: any = null;
  nominaData: NominaItem[] = [];
  cargando = false;
  pagoGenerado = false;
  expandidoGlobal = false;
  paginaActual = 0;
  readonly empleadosPorPagina = 50;
  errorCarga = '';
  soloEmpleadosConNovedades = false;

  // Totales generales del período
  get totalDevengos(): number { return this.nominaData.reduce((a, i) => a + i.devengos, 0); }
  get totalDeducciones(): number { return this.nominaData.reduce((a, i) => a + i.deducciones, 0); }
  get totalNomina(): number { return this.nominaData.reduce((a, i) => a + i.totalPagar, 0); }
  get totalAportesEmpleador(): number {
    return this.nominaData.reduce((total, item) => total + item.aportesEmpleador, 0);
  }
  get totalProvisionesPrestacionales(): number {
    return this.nominaData.reduce((total, item) => total + item.provisionesPrestacionales, 0);
  }
  get costoTotalEmpleador(): number {
    return this.nominaData.reduce((total, item) => total + item.costoTotalEmpleador, 0);
  }
  get totalDevengadoBruto(): number {
    return this.nominaData.reduce((total, item) => total + item.sueldoBase + item.devengos, 0);
  }
  get nominaVisible(): NominaItem[] {
    return this.soloEmpleadosConNovedades
      ? this.nominaData.filter(item => item.detalleDevengos.length > 0 || item.detalleDeducciones.length > 0)
      : this.nominaData;
  }
  get empleadosPagina(): NominaItem[] {
    const inicio = this.paginaActual * this.empleadosPorPagina;
    return this.nominaVisible.slice(inicio, inicio + this.empleadosPorPagina);
  }
  get totalPaginas(): number {
    return Math.ceil(this.nominaVisible.length / this.empleadosPorPagina);
  }
  get inicioPagina(): number {
    return this.nominaVisible.length ? this.paginaActual * this.empleadosPorPagina + 1 : 0;
  }
  get finPagina(): number {
    return Math.min((this.paginaActual + 1) * this.empleadosPorPagina, this.nominaVisible.length);
  }
  get empleadosConNovedades(): number {
    return this.nominaData.filter(item =>
      item.detalleDevengos.length > 0 || item.detalleDeducciones.length > 0).length;
  }
  constructor(private empleadosService: EmpleadosService) { }

  ngOnInit(): void {
    this.cargarPeriodoActual();
  }

  cargarPeriodoActual() {
    this.empleadosService.getPeriodoActual().subscribe({
      next: (data) => {
        this.periodoActual = data;
        this.cargarNomina();
      },
      error: (err) => {
        this.periodoActual = null;
        this.errorCarga = err.error?.error || 'No se pudo cargar el período de nómina.';
      }
    });
  }

  cargarNomina() {
    this.cargando = true;
    this.errorCarga = '';
    this.nominaData = [];
    const periodoId = this.periodoActual?.id;
    if (!periodoId) {
      this.cargando = false;
      this.errorCarga = 'No hay un período válido para liquidar.';
      return;
    }

    this.empleadosService.getLiquidacionNomina(periodoId).subscribe({
      next: (liquidacion: any) => {
        this.nominaData = (liquidacion.empleados || []).map((empleado: any) => ({
          id: empleado.id,
          nombre: this.cap(empleado.nombre || ''),
          apellido: this.cap(empleado.apellido || ''),
          sueldoBase: empleado.sueldoBase,
          devengos: empleado.devengos,
          deducciones: empleado.deducciones,
          totalPagar: empleado.totalPagar,
          aportesEmpleador: empleado.aportesEmpleador || 0,
          provisionesPrestacionales: empleado.provisionesPrestacionales || 0,
          costoTotalEmpleador: empleado.costoTotalEmpleador || 0,
          detalleAportesEmpleador: empleado.detalleAportesEmpleador || [],
          detalleDevengos: empleado.detalleDevengos || [],
          detalleDeducciones: empleado.detalleDeducciones || []
        }));
        this.paginaActual = 0;
        this.soloEmpleadosConNovedades = false;
        this.cargando = false;
      },
      error: (err) => {
        this.errorCarga = err.error?.message || err.error?.error || 'Error al calcular la nómina.';
        this.cargando = false;
      }
    });
  }

  toggleDetalle(item: NominaItem) {
    item.expandido = !item.expandido;
  }

  toggleTodo() {
    this.expandidoGlobal = !this.expandidoGlobal;
    this.nominaData.forEach(i => i.expandido = this.expandidoGlobal);
  }

  cap(t: string): string {
    return t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : '';
  }

  cambiarPagina(delta: number) {
    const siguiente = this.paginaActual + delta;
    if (siguiente >= 0 && siguiente < this.totalPaginas) {
      this.paginaActual = siguiente;
    }
  }

  alternarEmpleadosConNovedades() {
    this.soloEmpleadosConNovedades = !this.soloEmpleadosConNovedades;
    this.paginaActual = 0;
  }

  pagarNomina() {
    if (this.pagoGenerado) return;

    this.cargando = true;

    this.empleadosService.pagarNomina({
      periodoId: this.periodoActual.id
    }).subscribe({
      next: () => {
        this.pagoGenerado = true;
        this.cargando = false;
      },
      error: (err) => {
        alert(err.error?.error || 'Error al guardar el pago');
        this.cargando = false;
      }
    });
  }

  imprimirComprobante() {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('COMPROBANTE DE PAGO - NÓMINA', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Período: ${this.periodoActual?.description || this.periodoActual?.descripcion || ''}`, 20, 40);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-CO')}`, 20, 50);

    let y = 70;
    this.nominaData.forEach(item => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${item.nombre} ${item.apellido} - Total: $${item.totalPagar.toLocaleString()}`, 20, y);
      doc.setFont('helvetica', 'normal');
      y += 8;
      if (item.detalleDevengos.length) {
        doc.text(`  Devengos: ${item.detalleDevengos.map(d => `${d.concepto} $${d.valor.toLocaleString()}`).join(', ')}`, 24, y, { maxWidth: 170 });
        y += 7;
      }
      if (item.detalleDeducciones.length) {
        doc.text(`  Deducciones: ${item.detalleDeducciones.map(d => `${d.concepto} $${d.valor.toLocaleString()}`).join(', ')}`, 24, y, { maxWidth: 170 });
        y += 7;
      }
      y += 5;
      if (y > 270) { doc.addPage(); y = 30; }
    });

    doc.save(`nomina_${this.periodoActual?.description || this.periodoActual?.descripcion || 'periodo'}.pdf`);
  }

  crearSiguienteQuincena() {
    if (!this.periodoActual) return;

    // ✅ CORRECCIÓN: Si por alguna razón extraña llega sin fechaFin, tomamos la fecha de hoy para que no explote
    const stringFecha = this.periodoActual.fechaFin || new Date().toISOString().split('T')[0];
    
    // Le sumamos 12 horas para que la zona horaria (UTC/GMT) no nos quite un día por accidente
    const fechaFin = new Date(stringFecha + 'T12:00:00'); 
    
    let nuevoInicio: Date;
    let nuevoFin: Date;
    let nuevaDescripcion: string;

    if (fechaFin.getDate() <= 15) {
      nuevoInicio = new Date(fechaFin.getFullYear(), fechaFin.getMonth(), 16);
      nuevoFin = new Date(fechaFin.getFullYear(), fechaFin.getMonth() + 1, 0); 
      nuevaDescripcion = `2da Quincena ${this.obtenerNombreMes(nuevoInicio.getMonth())} ${nuevoInicio.getFullYear()}`;
    } else {
      nuevoInicio = new Date(fechaFin.getFullYear(), fechaFin.getMonth() + 1, 1);
      nuevoFin = new Date(fechaFin.getFullYear(), fechaFin.getMonth() + 1, 15);
      nuevaDescripcion = `1ra Quincena ${this.obtenerNombreMes(nuevoInicio.getMonth())} ${nuevoInicio.getFullYear()}`;
    }

    const nuevoPeriodo = {
      descripcion: nuevaDescripcion,
      fechaInicio: nuevoInicio.toISOString().split('T')[0],
      fechaFin: nuevoFin.toISOString().split('T')[0],
      estado: 'ABIERTO',
      anio: nuevoInicio.getFullYear(),
      tipo: 'QUINCENAL'
    };

    this.empleadosService.crearPeriodo(nuevoPeriodo).subscribe({
      next: (res) => {
        alert(`¡Nómina pagada y cerrada!\n\nSe creó automáticamente:\n${nuevaDescripcion}`);
        this.cargarPeriodoActual();
        this.pagoGenerado = false;
      },
      error: (err) => {
        console.error(err);
        alert('Error al crear siguiente quincena');
      }
    });
  }

  obtenerNombreMes(mesIndex: number): string {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return meses[mesIndex];
  }

  trackById(index: number, item: NominaItem): number {
    return item.id;
  }
}