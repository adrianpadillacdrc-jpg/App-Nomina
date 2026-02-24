// src/app/pages/contratos-empleados/contratos-empleados.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { EmpleadosService } from '../../services/empleados.service';
import { ContratosService, Contrato } from '../../services/contratos.service';
import { jsPDF } from 'jspdf';

@Component({
    selector: 'app-contratos-empleados',
    standalone: true,
    imports: [CommonModule, FormsModule, SidebarComponent, HttpClientModule],
    templateUrl: './contratos-empleados.component.html',
    styleUrls: ['./contratos-empleados.component.scss']
})
export class ContratosEmpleadosComponent implements OnInit {
    empleados: any[] = [];
    empleadosFiltrados: any[] = [];
    busqueda = '';
    empleadoSeleccionado: any = null;
    contratoSeleccionado: Contrato | null = null;
    mostrarContrato = false;
    hoy = new Date();
    generandoPDF = false;

    // Datos para nuevo contrato
    nuevoContrato = {
        idTipoContrato: 'TERMINO_FIJO',
        fechaInicio: new Date().toISOString().split('T')[0],
        fechaFin: this.calcularFechaFin(new Date(), 365)
    };

    constructor(
        private empleadosService: EmpleadosService,
        private contratosService: ContratosService
    ) { }

    ngOnInit(): void {
        this.cargarEmpleados();
    }

    cargarEmpleados() {
        this.empleadosService.getEmpleados().subscribe({
            next: (empleados: any[]) => {
                const activos = empleados.filter(e => e.estado === 'ACTIVO');
                this.empleados = activos.map(emp => ({
                    ...emp,
                    nombreCompleto: `${emp.nombre} ${emp.apellido}`,
                    documento: emp.numeroDocumento || emp.documento,
                    id: emp.id || emp.idEmpleado || emp.documento
                }));
                this.empleadosFiltrados = [...this.empleados];
            },
            error: (error) => {
                console.error('Error al cargar empleados:', error);
            }
        });
    }

    filtrar() {
        const term = this.busqueda.toLowerCase();
        this.empleadosFiltrados = this.empleados.filter(e =>
            e.documento?.toString().includes(term) ||
            e.nombreCompleto?.toLowerCase().includes(term) ||
            e.cargo?.toLowerCase().includes(term)
        );
    }

    verContrato(emp: any) {
        this.empleadoSeleccionado = emp;
        console.log('🔍 Buscando contratos para empleado ID:', emp.id);

        this.contratosService.getContratosPorEmpleado(emp.id).subscribe({
            next: (contratosEmpleado: Contrato[]) => {
                console.log('✅ Contratos encontrados:', contratosEmpleado);
                const contratoVigente = contratosEmpleado.find(c => c.estado === 'VIGENTE');
                this.contratoSeleccionado = contratoVigente || null;
                this.mostrarContrato = true;
            },
            error: (error) => {
                console.error('❌ Error al buscar contratos:', error);
                console.log('📋 Detalles del error:', error.status, error.url);
                // Mostrar contrato vacío aunque falle
                this.contratoSeleccionado = null;
                this.mostrarContrato = true;
            }
        });
    }

    crearNuevoContrato() {
        if (!this.empleadoSeleccionado) return;

        const contrato: Contrato = {
            idEmpleado: this.empleadoSeleccionado.id,
            idTipoContrato: this.nuevoContrato.idTipoContrato,
            fechaInicio: this.nuevoContrato.fechaInicio,
            fechaFin: this.nuevoContrato.fechaFin,
            estado: 'VIGENTE'
        };

        console.log('🚀 Intentando crear contrato:', contrato);

        this.contratosService.crearContrato(contrato).subscribe({
            next: (nuevoContrato) => {
                console.log('✅ Contrato creado:', nuevoContrato);
                this.contratoSeleccionado = nuevoContrato;
                alert('Contrato creado exitosamente');
            },
            error: (error) => {
                console.error('❌ Error al crear contrato:', error);
                console.log('📋 URL llamada:', error.url);
                console.log('📋 Status:', error.status);
                alert('Error al crear contrato. Verifica la consola para más detalles.');
            }
        });
    }

    imprimirContrato() {
        const contenido = document.querySelector('.contrato-content');
        if (!contenido) return;

        const ventanaImpresion = window.open('', '_blank');
        if (!ventanaImpresion) {
            alert('Por favor permite ventanas emergentes para imprimir');
            return;
        }

        ventanaImpresion.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Contrato - ${this.empleadoSeleccionado?.nombre} ${this.empleadoSeleccionado?.apellido}</title>
                <style>
                    body { 
                        font-family: 'Georgia', serif; 
                        margin: 0; 
                        padding: 20px; 
                        line-height: 1.8;
                        color: #000;
                        background: white;
                    }
                    .header-contrato { 
                        display: flex; 
                        align-items: center; 
                        gap: 20px; 
                        margin-bottom: 20px; 
                        border-bottom: 2px solid #000; 
                        padding-bottom: 15px; 
                    }
                    .logo-empresa { 
                        width: 80px; 
                        height: auto; 
                    }
                    .info-empresa h1 { 
                        font-size: 20px; 
                        color: #6a1b9a; 
                        margin: 0; 
                    }
                    .info-empresa h2 { 
                        font-size: 14px; 
                        color: #333; 
                        margin: 5px 0; 
                    }
                    .titulo-contrato { 
                        text-align: center; 
                        font-size: 18px; 
                        font-weight: bold; 
                        margin: 30px 0 20px; 
                        color: #4a148c; 
                        text-transform: uppercase; 
                    }
                    .tabla-datos { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin: 20px 0; 
                        font-size: 12px; 
                    }
                    .tabla-datos td { 
                        padding: 6px 8px; 
                        border: 1px solid #333; 
                    }
                    .tabla-datos td:first-child { 
                        background: #f0f0f0 !important; 
                        font-weight: bold; 
                        width: 35%; 
                    }
                    .clausulas { 
                        text-align: justify; 
                        font-size: 12px; 
                        margin: 20px 0; 
                    }
                    .clausulas p { 
                        margin: 12px 0; 
                    }
                    .footer-contrato { 
                        margin-top: 40px; 
                        text-align: center; 
                    }
                    .firmas { 
                        display: flex; 
                        justify-content: space-around; 
                        margin-top: 60px; 
                        font-weight: bold; 
                        font-size: 12px;
                    }
                    .linea-firma { 
                        width: 150px; 
                        height: 1px; 
                        background: #000; 
                        margin: 10px auto; 
                    }
                    @media print {
                        body { margin: 10px; padding: 15px; }
                        .header-contrato { page-break-after: avoid; }
                        .firmas { page-break-before: avoid; }
                    }
                </style>
            </head>
            <body>
                ${contenido.innerHTML}
            </body>
            </html>
        `);

        ventanaImpresion.document.close();

        setTimeout(() => {
            ventanaImpresion.print();
        }, 500);
    }

    descargarContrato() {
        if (this.generandoPDF || !this.empleadoSeleccionado) return;

        this.generandoPDF = true;

        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            let y = 20;

            // Encabezado
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.text('NUMA S.A.S', 20, y);
            doc.setFontSize(10);
            doc.text('Soluciones Integrales de Nómina', 20, y + 6);
            doc.text('NIT: 901.234.567-8 - Cartagena, Colombia', 20, y + 12);

            y += 25;

            // Título
            doc.setFontSize(14);
            doc.text('CONTRATO INDIVIDUAL DE TRABAJO A TÉRMINO FIJO', 105, y, { align: 'center' });
            y += 15;

            // Datos del contrato
            doc.setFontSize(9);
            const datos = [
                `NOMBRE DEL EMPLEADOR: NUMA S.A.S`,
                `REPRESENTANTE LEGAL: ING. ADRIAN ANDRES PADILLA ROQUEME`,
                `NOMBRE DEL EMPLEADO(A): ${this.empleadoSeleccionado?.nombre?.toUpperCase()} ${this.empleadoSeleccionado?.apellido?.toUpperCase()}`,
                `IDENTIFICADO(A) CON: C.C. ${this.empleadoSeleccionado?.documento}`,
                `LUGAR DE RESIDENCIA: CARTAGENA`,
                `TELÉFONO: ${this.empleadoSeleccionado?.telefono || 'No registrado'}`,
                `CARGO: ${this.empleadoSeleccionado?.cargo?.toUpperCase()}`,
                `SALARIO MENSUAL: $ ${this.formatearSalario(this.empleadoSeleccionado?.salarioBase || 0)}`,
                `FECHA DE INICIO: ${this.formatearFecha(this.contratoSeleccionado?.fechaInicio || this.nuevoContrato.fechaInicio)}`,
                `FECHA DE FIN: ${this.formatearFecha(this.contratoSeleccionado?.fechaFin || this.nuevoContrato.fechaFin)}`,
                `ESTADO: ${this.contratoSeleccionado?.estado || 'NUEVO'}`
            ];

            datos.forEach(linea => {
                if (y > 270) {
                    doc.addPage();
                    y = 20;
                }
                doc.text(linea, 20, y);
                y += 6;
            });

            y += 10;

            // Cláusulas
            const clausulas = [
                'Conste por el presente documento que entre NUMA S.A.S, representada legalmente por',
                'el ING. ADRIAN PADILLA ROQUEME, y el(la) trabajador(a) arriba identificado(a), se',
                'celebra un CONTRATO INDIVIDUAL DE TRABAJO A TÉRMINO FIJO conforme a las siguientes',
                'cláusulas:',
                '',
                'PRIMERA - OBJETO: El trabajador se obliga a prestar sus servicios personales bajo',
                'dependencia y subordinación al empleador, desempeñando el cargo de ' + (this.empleadoSeleccionado?.cargo?.toUpperCase() || '') + '.',
                '',
                'SEGUNDA - DURACIÓN: El presente contrato tendrá una duración de UN (1) AÑO contado',
                'a partir de la fecha de ingreso, pudiendo ser renovado por mutuo acuerdo.',
                '',
                'TERCERA - JORNADA: La jornada laboral será de 48 horas semanales, distribuidas según',
                'las necesidades de la empresa, cumpliendo con la normatividad laboral vigente.',
                '',
                'CUARTA - REMUNERACIÓN: El trabajador devengará un salario mensual de',
                '$ ' + this.formatearSalario(this.empleadoSeleccionado?.salarioBase || 0) + ' pesos colombianos, pagadero quincenalmente.',
                '',
                'QUINTA - LUGAR DE TRABAJO: Las labores se desarrollarán en las instalaciones de',
                'NUMA S.A.S ubicadas en la ciudad de Cartagena o en el lugar que la empresa determine.'
            ];

            doc.setFontSize(10);
            clausulas.forEach(linea => {
                if (y > 270) {
                    doc.addPage();
                    y = 20;
                }
                doc.text(linea, 20, y);
                y += 5;
            });

            // Firmas
            if (y > 200) {
                doc.addPage();
                y = 50;
            } else {
                y = Math.max(y, 150);
            }

            doc.setFontSize(10);
            doc.text('Fecha de generación: ' + new Date().toLocaleDateString('es-CO'), 105, y, { align: 'center' });
            y += 20;

            doc.setFontSize(9);
            // Firma empleado
            doc.text('_________________________', 25, y);
            doc.text('Firma del Empleado(a)', 25, y + 5);
            doc.text(`${this.empleadoSeleccionado?.nombre} ${this.empleadoSeleccionado?.apellido}`, 25, y + 10);
            doc.text(`C.C. ${this.empleadoSeleccionado?.documento}`, 25, y + 15);

            // Firma empleador
            doc.text('_________________________', 125, y);
            doc.text('Representante Legal', 125, y + 5);
            doc.text('ING. ADRIAN ANDRES PADILLA ROQUEME', 125, y + 10);
            doc.text('NUMA S.A.S', 125, y + 15);

            // Guardar PDF
            const nombreArchivo = `contrato_${this.empleadoSeleccionado?.documento}.pdf`;
            doc.save(nombreArchivo);

        } catch (error) {
            console.error('Error al generar PDF:', error);
            alert('Error al generar el PDF. Intenta nuevamente.');
        } finally {
            this.generandoPDF = false;
        }
    }

    cerrarContrato() {
        this.mostrarContrato = false;
        this.empleadoSeleccionado = null;
        this.contratoSeleccionado = null;
    }

    cambiarEstadoContrato(nuevoEstado: string) {
        if (!this.contratoSeleccionado?.id) {
            alert('No hay contrato seleccionado para cambiar estado');
            return;
        }

        this.contratosService.cambiarEstadoContrato(this.contratoSeleccionado.id, nuevoEstado).subscribe({
            next: (contratoActualizado) => {
                this.contratoSeleccionado = contratoActualizado;
                alert(`Contrato ${nuevoEstado.toLowerCase()} exitosamente`);
            },
            error: (error) => {
                console.error('Error al cambiar estado:', error);
                alert('Error al cambiar el estado del contrato');
            }
        });
    }

    // Métodos auxiliares
    private calcularFechaFin(fechaInicio: Date, dias: number): string {
        const fechaFin = new Date(fechaInicio);
        fechaFin.setDate(fechaFin.getDate() + dias);
        return fechaFin.toISOString().split('T')[0];
    }

    private formatearSalario(salario: number): string {
        return new Intl.NumberFormat('es-CO').format(salario);
    }

    private formatearFecha(fecha: string | Date): string {
        if (!fecha) return 'No definida';
        try {
            const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
            return fechaObj.toLocaleDateString('es-CO', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch {
            return 'No definida';
        }
    }
}