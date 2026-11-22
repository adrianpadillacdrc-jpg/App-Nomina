import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SidebarComponent } from '../../guards/components/sidebar/sidebar.component';
import { EncabezadoPaginaComponent } from '../../shared/components/encabezado-pagina/encabezado-pagina.component';
import { TablaBaseComponent } from '../../shared/components/tabla-base/tabla-base.component';
import { EmpleadosService } from '../../services/empleados.service';
import { DocumentoNominaModalComponent, TipoDocumentoNomina } from '../../shared/components/documento-nomina-modal/documento-nomina-modal.component';
import { jsPDF } from 'jspdf';

@Component({
  selector: 'app-liquidar-empleado',
  standalone: true,
  imports: [CommonModule, SidebarComponent, FormsModule, EncabezadoPaginaComponent, TablaBaseComponent, DocumentoNominaModalComponent],
  templateUrl: './liquidar-empleado.component.html',
  styleUrls: ['./liquidar-empleado.component.scss']
})
export class LiquidarEmpleadoComponent implements OnInit {
  empleados: any[] = [];
  empleadosFiltrados: any[] = [];
  terminoBusqueda = '';
  periodoActual: any = null;
  private empleadoPendiente: any = null;
  private empleadoAlertaId: any = null;

  // Modal visor de documentos oficiales A4
  mostrarModalDoc = false;
  empleadoModalDoc: any = null;
  pestanaModalDoc: TipoDocumentoNomina = 'comprobante';

  constructor(private empleadosService: EmpleadosService, private route: ActivatedRoute, private router: Router) { }

  ngOnInit(): void {
    this.cargarEmpleados();
    this.cargarPeriodoActual();
    // Si llega empleadoId por query params (desde las alertas), preseleccionar al empleado
    this.route.queryParams.subscribe(params => {
      const id = params['empleadoId'];
      if (id) {
        if (this.empleadosFiltrados.length > 0) {
          this.preseleccionarEmpleado(id);
        } else {
          this.empleadoPendiente = id; // se aplicará cuando termine de cargar
        }
      }
    });
  }

  /** Indica si la fila corresponde al empleado que llegó desde la alerta (para resaltarlo) */
  esEmpleadoAlerta(emp: any): boolean {
    return this.empleadoAlertaId != null &&
      (String(emp.id) === String(this.empleadoAlertaId) ||
       String(emp.numeroDocumento) === String(this.empleadoAlertaId));
  }

  /** Auto-busca y resalta al empleado indicado (cuando se llega desde una alerta) */
  private preseleccionarEmpleado(id: any): void {
    // Buscar por id o por documento (la alerta puede traer cualquiera de los dos)
    const encontrado = this.empleados.find(e =>
      String(e.id) === String(id) || String(e.numeroDocumento) === String(id));

    if (encontrado) {
      this.empleadoAlertaId = id;
      this.terminoBusqueda = `${encontrado.nombre} ${encontrado.apellido}`;
      this.filtrarEmpleados();
      setTimeout(() => {
        document.querySelector('.tabla-fila.resaltada')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 400);
    }
  }

  cargarEmpleados() {
    // ✅ Pedimos un tamaño mayor (ej. 50) para tener empleados en pantalla
    this.empleadosService.getEmpleados(0, 50).subscribe({
      next: (data: any) => {
        // ✅ CORRECCIÓN CLAVE: Extraer el arreglo desde la propiedad .content
        const rawContent = data.content ? data.content : (Array.isArray(data) ? data : []);

        // Filtramos solo los activos (soportando ambas mayúsculas y minúsculas)
        this.empleados = rawContent.filter((e: any) => e.estado === 'ACTIVO' || e.estado === 'Activo');
        this.empleadosFiltrados = [...this.empleados];
        if (this.empleadoPendiente) {
          this.preseleccionarEmpleado(this.empleadoPendiente);
          this.empleadoPendiente = null;
        }
      },
      error: () => alert('Error al cargar empleados')
    });
  }

  filtrarEmpleados() {
    const term = this.terminoBusqueda.toLowerCase().trim();
    if (!term) {
      this.empleadosFiltrados = [...this.empleados];
      return;
    }
    this.empleadosFiltrados = this.empleados.filter(emp =>
      emp.nombre?.toLowerCase().includes(term) ||
      emp.apellido?.toLowerCase().includes(term) ||
      emp.numeroDocumento?.includes(term) ||
      emp.cargo?.toLowerCase().includes(term) ||
      emp.area?.toLowerCase().includes(term)
    );
  }

  cargarPeriodoActual(): void {
    this.empleadosService.getPeriodoActual().subscribe({
      next: (data) => this.periodoActual = data,
      error: () => this.periodoActual = null
    });
  }

  pagoIndividual(emp: any): void {
    const salarioBase = Number(emp.salarioBase);
    if (!Number.isFinite(salarioBase) || salarioBase <= 0) {
      alert(`No se puede calcular el pago: ${emp.nombre} ${emp.apellido} no tiene un salario base registrado.`);
      return;
    }
    // Navegar a la página de pago individual con el empleado preseleccionado
    this.router.navigate(['/pago-individual'], {
      queryParams: { empleadoId: emp.id }
    });
  }

  cerrarModalDoc(): void {
    this.mostrarModalDoc = false;
    this.empleadoModalDoc = null;
  }

  liquidarEmpleado(emp: any) {
    if (!confirm(`¿Liquidar contrato de ${emp.nombre} ${emp.apellido}?\nDocumento: ${emp.numeroDocumento}`)) return;

    const salarioBase = Number(emp.salarioBase);
    if (!Number.isFinite(salarioBase) || salarioBase <= 0 || !emp.fechaInicioContrato) {
      alert('No se puede liquidar: el empleado debe tener salario y fecha real de ingreso registrados.');
      return;
    }
    const fechaIngreso = new Date(`${emp.fechaInicioContrato}T00:00:00`);
    const fechaLiquidacion = new Date();
    const diasTrabajados = Math.floor((fechaLiquidacion.getTime() - fechaIngreso.getTime()) / (1000 * 60 * 60 * 24));
    if (!Number.isFinite(fechaIngreso.getTime()) || diasTrabajados <= 0) {
      alert('La fecha real de ingreso del empleado no es válida.');
      return;
    }

    const diasVacacionesCausados = diasTrabajados * 15 / 360;
    const diasVacacionesInput = prompt(
      'Indica los días de vacaciones disfrutados que constan en el registro del empleado:'
    );
    if (diasVacacionesInput === null || diasVacacionesInput.trim() === '') return;
    const diasVacacionesDisfrutados = Number(diasVacacionesInput);
    if (!Number.isFinite(diasVacacionesDisfrutados)
        || diasVacacionesDisfrutados < 0
        || diasVacacionesDisfrutados > diasVacacionesCausados) {
      alert('Ingresa un número válido de días de vacaciones disfrutados según el registro.');
      return;
    }

    const salarioMinimo2026 = 1_750_905;
    const auxilioTransporte2026 = 249_095;
    const modalidadPresencial = String(emp.modalidadTrabajo || '').toUpperCase() === 'PRESENCIAL';
    const auxilioAplica = salarioBase <= salarioMinimo2026 * 2
      && modalidadPresencial
      && emp.transporteSuministrado !== true;
    const basePrestaciones = salarioBase + (auxilioAplica ? auxilioTransporte2026 : 0);

    const cesantias = Math.round(basePrestaciones * (diasTrabajados / 360));
    const interesesCesantias = Math.round(cesantias * 0.12 * (diasTrabajados / 360));
    const primaServicios = Math.round(basePrestaciones * (diasTrabajados / 360));
    const diasVacacionesPendientes = diasVacacionesCausados - diasVacacionesDisfrutados;
    const vacacionesPendientes = Math.round((salarioBase / 30) * diasVacacionesPendientes);

    const totalDevengos = cesantias + interesesCesantias + primaServicios + vacacionesPendientes;

    // Generar PDF estilo Colombia REAL
    const doc = new jsPDF('p', 'mm', 'letter');
    let y = 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('LIQUIDACIÓN DEFINITIVA DE PRESTACIONES SOCIALES', 105, y, { align: 'center' });
    y += 10;
    doc.setFontSize(14);
    doc.text('Resumen de liquidación laboral', 105, y, { align: 'center' });
    y += 15;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`EMPLEADO: ${emp.nombre.toUpperCase()} ${emp.apellido.toUpperCase()}`, 20, y);
    y += 8;
    doc.text(`C.C: ${emp.numeroDocumento}`, 20, y);
    y += 8;
    doc.text(`CARGO: ${emp.cargo || 'No definido'}`, 20, y);
    y += 12;

    // Tabla principal
    doc.setFillColor(220, 220, 220);
    doc.rect(20, y, 170, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('PERIODO DE LIQUIDACIÓN', 25, y + 6);
    y += 12;

    doc.setFont('helvetica', 'normal');
    doc.text(`FECHA DE TERMINACIÓN DE CONTRATO: ${fechaLiquidacion.toLocaleDateString('es-CO')}`, 25, y);
    y += 8;
    doc.text(`FECHA INICIO: ${fechaIngreso.toLocaleDateString('es-CO')}`, 25, y);
    y += 8;
    doc.text(`DÍAS TOTAL LABORADOS: ${diasTrabajados}`, 25, y);
    y += 15;

    // PRIMA
    doc.setFillColor(220, 220, 220);
    doc.rect(20, y, 170, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('PRIMA DE SERVICIOS', 25, y + 6);
    y += 12;
    doc.setFont('helvetica', 'normal');
    doc.text(`FECHA LIQUIDACIÓN PRIMA: ${fechaLiquidacion.toLocaleDateString('es-CO')}`, 25, y);
    y += 8;
    doc.text(`VALOR PRIMA: $ ${primaServicios.toLocaleString('es-CO')}`, 25, y);
    y += 15;

    // VACACIONES
    doc.setFillColor(220, 220, 220);
    doc.rect(20, y, 170, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('VACACIONES', 25, y + 6);
    y += 12;
    doc.setFont('helvetica', 'normal');
    doc.text(`DÍAS CAUSADOS: ${diasVacacionesCausados.toFixed(2)}`, 25, y);
    y += 8;
    doc.text(`DÍAS DISFRUTADOS REGISTRADOS: ${diasVacacionesDisfrutados}`, 25, y);
    y += 8;
    doc.text(`DÍAS PENDIENTES: ${diasVacacionesPendientes.toFixed(2)}`, 25, y);
    y += 8;
    doc.text(`VALOR VACACIONES PENDIENTES: $ ${vacacionesPendientes.toLocaleString('es-CO')}`, 25, y);
    y += 15;

    // RESUMEN FINAL
    doc.setFillColor(200, 230, 200);
    doc.rect(20, y, 170, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('RESUMEN LIQUIDACIÓN PAGOS', 25, y + 7);
    y += 15;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`CESANTÍAS: $ ${cesantias.toLocaleString('es-CO')}`, 25, y);
    y += 8;
    doc.text(`INTERESES CESANTÍAS: $ ${interesesCesantias.toLocaleString('es-CO')}`, 25, y);
    y += 8;
    doc.text(`PRIMA DE SERVICIOS: $ ${primaServicios.toLocaleString('es-CO')}`, 25, y);
    y += 8;
    doc.text(`VACACIONES PENDIENTES: $ ${vacacionesPendientes.toLocaleString('es-CO')}`, 25, y);
    y += 8;
    doc.text(`AUXILIO DE TRANSPORTE INCLUIDO EN BASE: ${auxilioAplica ? 'Sí' : 'No'}`, 25, y);
    y += 12;

    doc.setFillColor(230, 250, 230);
    doc.rect(20, y, 170, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(`TOTAL DEVENGOS: $ ${totalDevengos.toLocaleString('es-CO')}`, 25, y + 9);
    y += 25;

    doc.setFontSize(10);
    doc.text(`Liquidación generada el ${new Date().toLocaleString('es-CO')}`, 105, y, { align: 'center' });

    this.empleadosService.actualizarEmpleado({
      id: emp.id,
      nombre: emp.nombre,
      apellido: emp.apellido,
      cargo: emp.cargo,
      salarioBase,
      estado: 'INACTIVO',
      fechaFinContrato: fechaLiquidacion.toISOString().split('T')[0]
    }).subscribe({
      next: () => {
        doc.save(`liquidacion_${emp.numeroDocumento}_${new Date().getFullYear()}.pdf`);
        alert(`¡Liquidación generada y empleado retirado correctamente!\nTotal a pagar: $ ${totalDevengos.toLocaleString('es-CO')}`);
        this.cargarEmpleados();
      },
      error: () => alert('La liquidación se calculó, pero no se pudo actualizar el estado del empleado.')
    });
  }
}