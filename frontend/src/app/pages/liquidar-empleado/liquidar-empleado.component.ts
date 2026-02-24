// src/app/pages/liquidar-empleado/liquidar-empleado.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { EmpleadosService } from '../../services/empleados.service';
import { jsPDF } from 'jspdf';

@Component({
  selector: 'app-liquidar-empleado',
  standalone: true,
  imports: [CommonModule, SidebarComponent, FormsModule],
  templateUrl: './liquidar-empleado.component.html',
  styleUrls: ['./liquidar-empleado.component.scss']
})
export class LiquidarEmpleadoComponent implements OnInit {
  empleados: any[] = [];
  empleadosFiltrados: any[] = [];
  terminoBusqueda = '';

  constructor(private empleadosService: EmpleadosService) { }

  ngOnInit(): void {
    this.cargarEmpleados();
  }

  cargarEmpleados() {
    this.empleadosService.getEmpleados().subscribe({
      next: (data: any[]) => {
        this.empleados = data.filter(e => e.estado === 'ACTIVO');
        this.empleadosFiltrados = [...this.empleados];
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

  liquidarEmpleado(emp: any) {
    if (!confirm(`¿Liquidar contrato de ${emp.nombre} ${emp.apellido}?\nDocumento: ${emp.numeroDocumento}`)) return;

    const salarioBase = Number(emp.salarioBase) || 0;
    const fechaIngreso = new Date(emp.fechaIngreso || '2024-01-01');
    const fechaLiquidacion = new Date();
    const diasTrabajados = Math.floor((fechaLiquidacion.getTime() - fechaIngreso.getTime()) / (1000 * 60 * 60 * 24));

    // Cálculos reales según ley colombiana
    const cesantias = Math.round(salarioBase * (diasTrabajados / 360));
    const interesesCesantias = Math.round(cesantias * 0.12 * (diasTrabajados / 360));
    const primaServicios = Math.round(salarioBase * (diasTrabajados / 360));
    const vacacionesPendientes = Math.round((salarioBase / 30) * (diasTrabajados / 360) * 15);
    const auxilioTransportePendiente = Math.round(162000 * (diasTrabajados / 360));

    const totalDevengos = cesantias + interesesCesantias + primaServicios + vacacionesPendientes + auxilioTransportePendiente;

    // Generar PDF estilo Colombia REAL
    const doc = new jsPDF('p', 'mm', 'letter');
    let y = 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('LIQUIDACIÓN DEFINITIVA DE PRESTACIONES SOCIALES', 105, y, { align: 'center' });
    y += 10;
    doc.setFontSize(14);
    doc.text('NUMA S.A.S - NIT: 901.234.567-8', 105, y, { align: 'center' });
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
    doc.text(`DÍAS TOMADOS DE VACACIONES: 0`, 25, y);
    y += 8;
    doc.text(`DÍAS PENDIENTES: 15`, 25, y);
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
    doc.text(`AUXILIO TRANSPORTE PENDIENTE: $ ${auxilioTransportePendiente.toLocaleString('es-CO')}`, 25, y);
    y += 12;

    doc.setFillColor(230, 250, 230);
    doc.rect(20, y, 170, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(`TOTAL DEVENGOS: $ ${totalDevengos.toLocaleString('es-CO')}`, 25, y + 9);
    y += 25;

    doc.setFontSize(10);
    doc.text(`Liquidación generada el ${new Date().toLocaleString('es-CO')}`, 105, y, { align: 'center' });

    // Guardar
    doc.save(`liquidacion_${emp.numeroDocumento}_${new Date().getFullYear()}.pdf`);
    alert(`¡Liquidación generada correctamente!\nTotal a pagar: $ ${totalDevengos.toLocaleString('es-CO')}`);
  }
}