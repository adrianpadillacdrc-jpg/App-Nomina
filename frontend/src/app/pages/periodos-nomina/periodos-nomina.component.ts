// src/app/pages/periodos-nomina/periodos-nomina.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { EmpleadosService } from '../../services/empleados.service';

interface Periodo {
    id: string;
    descripcion: string;
    fechaInicio: string;
    fechaFin: string;
    estado: string;
    anio?: number;
    tipo?: string;
}

interface NominaItem {
    id?: number;
    nombre: string;
    apellido: string;
    sueldoBase: number;
    devengos: number;
    deducciones: number;
    totalPagar: number;
}

@Component({
    selector: 'app-periodos-nomina',
    standalone: true,
    imports: [CommonModule, SidebarComponent],
    templateUrl: './periodos-nomina.component.html',
    styleUrls: ['./periodos-nomina.component.scss']
})
export class PeriodosNominaComponent implements OnInit {

    periodos: Periodo[] = [];
    periodoSeleccionado: Periodo | null = null;
    nominaHistorica: NominaItem[] = [];
    mostrarModalNomina = false;
    cargando = false;

    constructor(private empleadosService: EmpleadosService) { }

    ngOnInit(): void {
        this.cargarPeriodos();
    }

    cargarPeriodos(): void {
        this.cargando = true;
        this.empleadosService.getPeriodos().subscribe({
            next: (data: Periodo[]) => {
                this.periodos = data.sort((a, b) =>
                    new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime()
                );
                this.cargando = false;
            },
            error: (err) => {
                console.error('Error al cargar períodos:', err);
                this.periodos = [];
                this.cargando = false;
                alert('No se pudieron cargar los períodos.\n\nVerifica que el backend esté corriendo en http://localhost:8080');
            }
        });
    }

    verNominaPeriodo(periodo: Periodo): void {
        this.periodoSeleccionado = periodo;
        this.cargando = true;

        // CAMBIO CLAVE: usar el método correcto del service
        this.empleadosService.getNovedadesPorPeriodo(periodo.id).subscribe({
            next: (novedades: any[]) => {
                // Aquí reutilizamos la misma lógica que en pago-nomina para calcular la nómina
                this.calcularNominaDesdeNovedades(novedades);
                this.mostrarModalNomina = true;
                this.cargando = false;
            },
            error: (err) => {
                console.error('Error al cargar nómina del período:', err);
                this.nominaHistorica = [];
                this.mostrarModalNomina = true;
                this.cargando = false;
                alert('Este período aún no tiene nómina generada o no hay empleados registrados.');
            }
        });
    }

    // Método que convierte novedades en nómina (igual que en pago-nomina)
    private calcularNominaDesdeNovedades(novedades: any[]): void {
        this.empleadosService.getEmpleados().subscribe({
            next: (empleados: any[]) => {
                const nominaCalculada: NominaItem[] = empleados.map(emp => {
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
                                devengos += horas * salarioHora * 1.75;
                                break;
                            case 'BONIFICACION':
                            case 'COMISION':
                                devengos += Number(nov.valor) || 0;
                                break;
                            case 'AUXILIO_TRANSPORTE':
                                if (salarioBase <= 2600000) devengos += 162000;
                                break;
                            case 'PRESTAMO':
                            case 'EMBARGO':
                                deducciones += Number(nov.valor) || 0;
                                break;
                            case 'INCAPACIDAD':
                            case 'PERMISO_NO_REMUNERADO':
                                const dias = this.calcularDias(nov.fechaInicio, nov.fechaFin);
                                deducciones += dias * salarioDiario;
                                break;
                        }
                    });

                    return {
                        nombre: emp.nombre,
                        apellido: emp.apellido,
                        sueldoBase: Math.round(salarioBase),
                        devengos: Math.round(devengos),
                        deducciones: Math.round(deducciones),
                        totalPagar: Math.round(salarioBase + devengos - deducciones)
                    };
                });

                this.nominaHistorica = nominaCalculada;
            }
        });
    }

    private calcularDias(inicio: string, fin: string): number {
        if (!inicio || !fin) return 0;
        const i = new Date(inicio);
        const f = new Date(fin);
        const diff = f.getTime() - i.getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
    }

    cerrarModal(): void {
        this.mostrarModalNomina = false;
        this.periodoSeleccionado = null;
        this.nominaHistorica = [];
    }
}