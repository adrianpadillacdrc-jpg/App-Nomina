// src/app/pages/pago-nomina/pago-nomina.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { EmpleadosService } from '../../services/empleados.service';
import { jsPDF } from 'jspdf';

interface NominaItem {
  id: number;
  nombre: string;
  apellido: string;
  sueldoBase: number;
  devengos: number;
  deducciones: number;
  totalPagar: number;
}

@Component({
  selector: 'app-pago-nomina',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: './pago-nomina.component.html',
  styleUrl: './pago-nomina.component.scss'
})
export class PagoNominaComponent implements OnInit {
  periodoActual: any = null;
  nominaData: NominaItem[] = [];
  cargando = false;
  pagoGenerado = false;

  constructor(private empleadosService: EmpleadosService) { }

  ngOnInit(): void {
    this.cargarPeriodoActual();
    this.cargarNomina();
  }

  cargarPeriodoActual() {
    this.empleadosService.getPeriodoActual().subscribe({
      next: (data) => {
        this.periodoActual = data;
        this.cargarNomina(); // Recargar nómina cada vez que cambie el período
      },
      error: (err) => {
        console.log('No hay período activo, usando uno por defecto');
        this.periodoActual = {
          id: "temp-001",
          descripcion: "1ra Quincena Noviembre 2025",
          estado: "ABIERTO"
        };
        this.cargarNomina();
      }
    });
  }

  cargarNomina() {
    this.cargando = true;
    this.nominaData = [];

    this.empleadosService.getEmpleados().subscribe({
      next: (empleados: any[]) => {
        const periodoId = this.periodoActual?.id;

        if (!periodoId || periodoId === 'temp-001') {
          // Si no hay período real, mostrar solo sueldo base
          this.nominaData = empleados.map(emp => ({
            id: emp.id,
            nombre: this.cap(emp.nombre || ''),
            apellido: this.cap(emp.apellido || ''),
            sueldoBase: Number(emp.salarioBase) || 0,
            devengos: 0,
            deducciones: 0,
            totalPagar: Number(emp.salarioBase) || 0
          }));
          this.cargando = false;
          return;
        }

        this.empleadosService.getNovedadesPorPeriodo(periodoId).subscribe({
          next: (novedades: any[]) => {
            this.nominaData = empleados.map(emp => {
              const salarioBase = Number(emp.salarioBase) || 0;
              const salarioDiario = salarioBase / 30;
              const salarioHora = salarioDiario / 8;

              const misNovedades = novedades.filter(n => n.idEmpleado === emp.id);

              let devengos = 0;
              let deducciones = 0;

              misNovedades.forEach(nov => {
                switch (nov.tipoNovedad) {
                  case 'HORAS_EXTRAS':
                    const horas = Number(nov.horas) || 0;
                    devengos += horas * salarioHora * 1.75; // +75% recargo
                    break;

                  case 'BONIFICACION':
                  case 'COMISION':
                    devengos += Number(nov.valor) || 0;
                    break;

                  case 'AUXILIO_TRANSPORTE':
                    if (salarioBase <= 2600000) {
                      devengos += 162000; // Valor 2025 Colombia
                    }
                    break;

                  case 'PRESTAMO':
                  case 'EMBARGO':
                    deducciones += Number(nov.valor) || 0;
                    break;

                  case 'INCAPACIDAD':
                    const diasIncap = this.calcularDias(nov.fechaInicio, nov.fechaFin);
                    deducciones += diasIncap * salarioDiario * 0.6667; // Empleado paga 66.67%
                    break;

                  case 'PERMISO_NO_REMUNERADO':
                    const diasPerm = this.calcularDias(nov.fechaInicio, nov.fechaFin);
                    deducciones += diasPerm * salarioDiario;
                    break;

                  case 'VACACIONES':
                    // No afecta nómina (ya se pagó antes)
                    break;
                }
              });

              const totalPagar = salarioBase + devengos - deducciones;

              return {
                id: emp.id,
                nombre: this.cap(emp.nombre || ''),
                apellido: this.cap(emp.apellido || ''),
                sueldoBase: Math.round(salarioBase),
                devengos: Math.round(devengos),
                deducciones: Math.round(deducciones),
                totalPagar: Math.round(totalPagar)
              };
            });

            this.cargando = false;
          },
          error: () => {
            alert('Error al cargar novedades');
            this.cargando = false;
          }
        });
      },
      error: () => {
        alert('Error al cargar empleados');
        this.cargando = false;
      }
    });
  }

  // MÉTODOS AUXILIARES
  cap(t: string): string {
    return t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : '';
  }

  calcularDias(inicio: string, fin: string): number {
    if (!inicio || !fin) return 0;
    const i = new Date(inicio);
    const f = new Date(fin);
    const diff = f.getTime() - i.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  }

  pagarNomina() {
    if (this.pagoGenerado) return;

    this.cargando = true;

    // 1. Cierra el período actual
    this.empleadosService.cerrarPeriodoActual().subscribe({
      next: () => {
        // 2. Crea el siguiente período
        this.crearSiguienteQuincena();
        this.pagoGenerado = true;
        this.cargando = false;
      },
      error: () => {
        alert('Error al cerrar el período');
        this.cargando = false;
      }
    });
  }

  imprimirComprobante() {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('COMPROBANTE DE PAGO - NÓMINA', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Período: ${this.periodoActual?.descripcion}`, 20, 40);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-CO')}`, 20, 50);

    let y = 70;
    this.nominaData.forEach(item => {
      doc.text(`${item.nombre} ${item.apellido} - Total: $${item.totalPagar.toLocaleString()}`, 20, y);
      y += 10;
    });

    doc.save(`nomina_${this.periodoActual?.descripcion}.pdf`);
  }

  crearSiguienteQuincena() {
    if (!this.periodoActual) return;

    const fechaFin = new Date(this.periodoActual.fechaFin);
    let nuevoInicio: Date;
    let nuevoFin: Date;
    let nuevaDescripcion: string;

    // SI LA QUINCENA ACTUAL TERMINA EL 15 → es 1ra quincena → siguiente es 2da
    if (fechaFin.getDate() === 15) {
      nuevoInicio = new Date(fechaFin.getFullYear(), fechaFin.getMonth(), 16);
      nuevoFin = new Date(fechaFin.getFullYear(), fechaFin.getMonth() + 1, 0); // último día del mes
      nuevaDescripcion = `2da Quincena ${this.obtenerNombreMes(nuevoInicio.getMonth())} ${nuevoInicio.getFullYear()}`;
    } else {
      // SI TERMINA EL ÚLTIMO DÍA DEL MES → es 2da quincena → siguiente es 1ra del mes siguiente
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