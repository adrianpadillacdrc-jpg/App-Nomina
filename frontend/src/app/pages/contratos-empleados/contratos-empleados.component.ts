// src/app/pages/contratos-empleados/contratos-empleados.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { SidebarComponent } from '../../guards/components/sidebar/sidebar.component';
import { EncabezadoPaginaComponent } from '../../shared/components/encabezado-pagina/encabezado-pagina.component';
import { TablaBaseComponent } from '../../shared/components/tabla-base/tabla-base.component';
import { EmpleadosService } from '../../services/empleados.service';
import { ContratosService, Contrato } from '../../services/contratos.service';
import { DocumentoNominaModalComponent } from '../../shared/components/documento-nomina-modal/documento-nomina-modal.component';
import { jsPDF } from 'jspdf';

interface Empresa {
    nitEmpresa: string;
    nombreEmpresa: string;
    representanteLegal: string;
    direccion: string;
    telefono: string;
    activo: boolean;
}

@Component({
    selector: 'app-contratos-empleados',
    standalone: true,
    imports: [CommonModule, FormsModule, SidebarComponent, HttpClientModule, EncabezadoPaginaComponent, TablaBaseComponent, DocumentoNominaModalComponent],
    templateUrl: './contratos-empleados.component.html',
    styleUrls: ['./contratos-empleados.component.scss']
})
export class ContratosEmpleadosComponent implements OnInit {
    empleados: any[] = [];
    empleadosFiltrados: any[] = [];
    busqueda = '';
    empleadoSeleccionado: any = null;
    contratoSeleccionado: Contrato | null = null;
    empresa: Empresa | null = null;
    empresaError: string | null = null;
    sucursales: any[] = [];
    sucursalFiltro: number | '' = '';
    mostrarContrato = false;
    hoy = new Date();
    generandoPDF = false;

    // Paginación
    paginaActual = 0;
    tamanoPagina = 50;
    totalElementos = 0;
    totalPaginas = 1;

    // Datos para nuevo contrato
    nuevoContrato = {
        idTipoContrato: 'TERMINO_FIJO',
        fechaInicio: new Date().toISOString().split('T')[0],
        fechaFin: this.calcularFechaFin(new Date(), 365)
    };

    constructor(
        private empleadosService: EmpleadosService,
        private contratosService: ContratosService,
        private route: ActivatedRoute
    ) { }

    ngOnInit(): void {
        this.cargarEmpresa();
        this.cargarSucursales();
        this.cargarEmpleados();

        // Si llega desde una alerta (empleadoId + verContrato=1), abrir el contrato automáticamente
        this.route.queryParams.subscribe(params => {
            const id = params['empleadoId'];
            if (id && params['verContrato']) {
                this.empleadoPendiente = id;
                if (this.empleados.length > 0) this.abrirContratoPendiente();
            }
        });
    }

    private empleadoPendiente: any = null;

    private cargarEmpresa(): void {
        this.empleadosService.getEmpresas().subscribe({
            next: (empresas) => {
                this.empresa = empresas.find(empresa => empresa.activo
                    && empresa.nombreEmpresa?.trim()
                    && empresa.nitEmpresa?.trim()
                    && empresa.representanteLegal?.trim())
                    ?? empresas[0]
                    ?? {
                    nombreEmpresa: 'NUMA STORE',
                    nitEmpresa: '901234567-1',
                    representanteLegal: 'Adrian Padilla',
                    direccion: 'Calle 22 Kr 83',
                    telefono: '3001234567',
                    activo: true
                };
                this.empresaError = null;
            },
            error: () => {
                // Fallback seguro con los datos oficiales de NUMA STORE
                this.empresa = {
                    nombreEmpresa: 'NUMA STORE',
                    nitEmpresa: '901234567-1',
                    representanteLegal: 'Adrian Padilla',
                    direccion: 'Calle 22 Kr 83',
                    telefono: '3001234567',
                    activo: true
                };
                this.empresaError = null;
            }
        });
    }

    private cargarSucursales(): void {
        this.empleadosService.getSucursales().subscribe({
            next: (data) => {
                this.sucursales = Array.isArray(data) && data.length > 0 ? data : [
                    { id: 1, nombre: 'Sucursal San José', direccion: 'San José', activo: true },
                    { id: 2, nombre: 'Sucursal Villa Grande', direccion: 'Villa Grande', activo: true }
                ];
            },
            error: () => {
                this.sucursales = [
                    { id: 1, nombre: 'Sucursal San José', direccion: 'San José', activo: true },
                    { id: 2, nombre: 'Sucursal Villa Grande', direccion: 'Villa Grande', activo: true }
                ];
            }
        });
    }

    obtenerNombreSucursal(idSucursal?: number | string): string {
        if (!idSucursal) return 'Sucursal San José';
        const numId = Number(idSucursal);
        const s = this.sucursales.find(suc => Number(suc.id) === numId);
        if (s) return s.nombre;
        return numId === 1 ? 'Sucursal San José' : numId === 2 ? 'Sucursal Villa Grande' : `Sucursal #${numId}`;
    }

    obtenerDireccionSucursal(idSucursal?: number | string): string {
        if (!idSucursal) return 'San José';
        const numId = Number(idSucursal);
        const s = this.sucursales.find(suc => Number(suc.id) === numId);
        if (s) return s.direccion;
        return numId === 1 ? 'San José' : numId === 2 ? 'Villa Grande' : (this.empresa?.direccion || 'Dirección no registrada');
    }

    /** Abre el modal "Ver contrato" del empleado que llegó desde la alerta */
    private abrirContratoPendiente(): void {
        const emp = this.empleados.find(e =>
            String(e.id) === String(this.empleadoPendiente) ||
            String(e.documento) === String(this.empleadoPendiente));
        if (emp) {
            this.verContrato(emp);
            this.busqueda = emp.nombreCompleto;
            this.filtrar();
        }
        this.empleadoPendiente = null;
    }

    private searchTimeout: any;

    cargarEmpleados() {
        this.empleadosService.getEmpleados(this.paginaActual, this.tamanoPagina, this.sucursalFiltro, this.busqueda).subscribe({
            next: (data: any) => {
                const rawContent = data.content ? data.content : (Array.isArray(data) ? data : []);
                this.totalElementos = data.totalElements !== undefined ? data.totalElements : rawContent.length;
                this.totalPaginas = data.totalPages !== undefined ? data.totalPages : Math.ceil(this.totalElementos / this.tamanoPagina) || 1;

                this.empleados = rawContent.map((emp: any) => ({
                    ...emp,
                    nombreCompleto: `${emp.nombre} ${emp.apellido}`,
                    documento: emp.numeroDocumento || emp.documento,
                    id: emp.id || emp.idEmpleado || emp.documento,
                    idSucursal: emp.idSucursal || 1
                }));
                this.empleadosFiltrados = [...this.empleados];
                if (this.empleadoPendiente != null) this.abrirContratoPendiente();
            },
            error: (error) => {
                console.error('Error al cargar empleados:', error);
            }
        });
    }

    cambiarPagina(nuevaPagina: number) {
        if (nuevaPagina >= 0 && nuevaPagina < this.totalPaginas) {
            this.paginaActual = nuevaPagina;
            this.cargarEmpleados();
        }
    }

    setSucursalFiltro(id: number | '') {
        this.sucursalFiltro = id;
        this.paginaActual = 0;
        this.cargarEmpleados();
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

    verContrato(emp: any) {
        if (!this.empresa) {
            this.cargarEmpresa();
        }
        this.empleadoSeleccionado = emp;
        console.log('Buscando contratos para empleado ID:', emp.id);

        this.contratosService.getContratosPorEmpleado(emp.id).subscribe({
            next: (contratosEmpleado: any) => {
                console.log(' Contratos encontrados:', contratosEmpleado);
                const listaContratos = Array.isArray(contratosEmpleado) ? contratosEmpleado : (contratosEmpleado ? [contratosEmpleado] : []);
                const esVigente = (estado?: string) =>
                    ['VIGENTE', 'ACTIVO'].includes((estado || '').trim().toUpperCase());
                const ordenados = [...listaContratos].sort((a, b) =>
                    (b.fechaInicio || '').localeCompare(a.fechaInicio || ''));
                const contratoVigente = ordenados.find(c => esVigente(c.estado));

                // 1. Si hay contrato vigente en tabla de contrataciones, usarlo
                if (contratoVigente && contratoVigente.fechaInicio) {
                    this.contratoSeleccionado = contratoVigente;
                } else if (ordenados.length > 0 && ordenados[0].fechaInicio) {
                    this.contratoSeleccionado = ordenados[0];
                } else {
                    // 2. Si no hay contrato en la tabla o no tiene fechas, tomar las fechas oficiales del registro del empleado
                    this.contratoSeleccionado = {
                        idEmpleado: emp.id,
                        idTipoContrato: 'TERMINO_FIJO',
                        fechaInicio: emp.fechaInicioContrato || emp.fechaCreacion,
                        fechaFin: emp.fechaFinContrato,
                        estado: emp.estado || 'ACTIVO'
                    };
                }

                // Asegurar fechas del empleado si al contrato le faltaban
                if (this.contratoSeleccionado) {
                    if (!this.contratoSeleccionado.fechaInicio && emp.fechaInicioContrato) {
                        this.contratoSeleccionado.fechaInicio = emp.fechaInicioContrato;
                    }
                    if (!this.contratoSeleccionado.fechaFin && emp.fechaFinContrato) {
                        this.contratoSeleccionado.fechaFin = emp.fechaFinContrato;
                    }
                    if (!this.contratoSeleccionado.estado) {
                        this.contratoSeleccionado.estado = emp.estado || 'ACTIVO';
                    }
                }

                this.mostrarContrato = true;
            },
            error: (error) => {
                console.warn(' No se encontró contrato en tabla de contrataciones, usando datos del empleado:', error);
                this.contratoSeleccionado = {
                    idEmpleado: emp.id,
                    idTipoContrato: 'TERMINO_FIJO',
                    fechaInicio: emp.fechaInicioContrato || emp.fechaCreacion,
                    fechaFin: emp.fechaFinContrato,
                    estado: emp.estado || 'ACTIVO'
                };
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
            doc.text(this.empresa?.nombreEmpresa || '', 20, y);
            doc.setFontSize(10);
            doc.text(`NIT: ${this.empresa?.nitEmpresa || ''}`, 20, y + 6);
            doc.text(this.empresa?.direccion || '', 20, y + 12);

            y += 25;

            // Título
            doc.setFontSize(14);
            doc.text('CONTRATO INDIVIDUAL DE TRABAJO A TÉRMINO FIJO', 105, y, { align: 'center' });
            y += 15;

            // Datos del contrato
            doc.setFontSize(9);
            const datos = [
                `NOMBRE DEL EMPLEADOR: ${this.empresa?.nombreEmpresa || ''}`,
                `NIT: ${this.empresa?.nitEmpresa || ''}`,
                `REPRESENTANTE LEGAL: ${this.empresa?.representanteLegal || ''}`,
                `NOMBRE DEL EMPLEADO(A): ${this.empleadoSeleccionado?.nombre?.toUpperCase()} ${this.empleadoSeleccionado?.apellido?.toUpperCase()}`,
                `IDENTIFICADO(A) CON: C.C. ${this.empleadoSeleccionado?.documento}`,
                `DIRECCIÓN DEL EMPLEADO(A): ${this.empleadoSeleccionado?.direccion || 'No registrada'}`,
                `TELÉFONO: ${this.empleadoSeleccionado?.telefono || 'No registrado'}`,
                `CARGO: ${this.empleadoSeleccionado?.cargo?.toUpperCase()}`,
                `SUCURSAL ASIGNADA: ${this.obtenerNombreSucursal(this.empleadoSeleccionado?.idSucursal)?.toUpperCase()}`,
                `DIRECCIÓN SUCURSAL: ${this.obtenerDireccionSucursal(this.empleadoSeleccionado?.idSucursal)}`,
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
                `Conste por el presente documento que entre ${this.empresa?.nombreEmpresa || ''}, representada legalmente por`,
                `${this.empresa?.representanteLegal || ''}, y el(la) trabajador(a) arriba identificado(a), se`,
                'celebra un CONTRATO INDIVIDUAL DE TRABAJO A TÉRMINO FIJO conforme a las siguientes',
                'cláusulas:',
                '',
                'PRIMERA - OBJETO: El trabajador se obliga a prestar sus servicios personales bajo',
                'dependencia y subordinación al empleador, desempeñando el cargo de ' + (this.empleadoSeleccionado?.cargo?.toUpperCase() || '') + '.',
                '',
                `SEGUNDA - DURACIÓN: Desde ${this.formatearFecha(this.contratoSeleccionado?.fechaInicio || this.nuevoContrato.fechaInicio)}`,
                `hasta ${this.formatearFecha(this.contratoSeleccionado?.fechaFin || this.nuevoContrato.fechaFin)}, según el contrato registrado.`,
                '',
                'TERCERA - JORNADA: La jornada laboral será la registrada y no excederá el máximo',
                'legal vigente, distribuida según',
                'las necesidades de la empresa, cumpliendo con la normatividad laboral vigente.',
                '',
                'CUARTA - REMUNERACIÓN: El trabajador devengará un salario mensual de',
                '$ ' + this.formatearSalario(this.empleadoSeleccionado?.salarioBase || 0) + ' pesos colombianos, pagadero quincenalmente.',
                '',
                `QUINTA - LUGAR DE TRABAJO: En las instalaciones de NUMA STORE, sede ${this.obtenerNombreSucursal(this.empleadoSeleccionado?.idSucursal)}, ubicada en ${this.obtenerDireccionSucursal(this.empleadoSeleccionado?.idSucursal)}.`
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
            doc.text(this.empresa?.representanteLegal || '', 125, y + 10);
            doc.text(this.empresa?.nombreEmpresa || '', 125, y + 15);

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

    /** Estado normalizado del contrato seleccionado (VIGENTE / TERMINADO / NUEVO) */
    get estadoContrato(): string {
        const e = (this.contratoSeleccionado?.estado || '').trim().toUpperCase();
        if (['VIGENTE', 'ACTIVO'].includes(e)) return 'VIGENTE';
        if (['TERMINADO', 'INACTIVO', 'FINALIZADO'].includes(e)) return 'TERMINADO';
        return e;
    }

    cerrarContrato() {
        this.mostrarContrato = false;
        this.empleadoSeleccionado = null;
        this.contratoSeleccionado = null;
    }

    onContratoRenovado(nuevoContrato: any): void {
        this.contratoSeleccionado = nuevoContrato;
        this.cargarEmpleados();
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