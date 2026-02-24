// src/app/pages/consulta-empleado/consulta-empleado.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

interface Empleado {
    id: number;
    nombre: string;
    apellido: string;
    numeroDocumento: string;
    cargo: string;
    salarioBase: number;
}

interface Novedad {
    tipo: 'DEVENGO' | 'DEDUCCION';
    descripcion: string;
    valor: number;
}

@Component({
    selector: 'app-consulta-empleado',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './consulta-empleado.component.html',
    styleUrls: ['./consulta-empleado.component.scss']
})
export class ConsultaEmpleadoComponent implements OnInit {
    empleados: Empleado[] = [];
    empleado: Empleado | null = null;
    novedades: Novedad[] = [];
    busqueda = '';
    verNomina = false;

    totalDevengado = 0;
    totalDeducciones = 0;
    netoAPagar = 0;

    // DATOS DE PRUEBA (para que funcione aunque el backend esté caído)
    datosPrueba: Empleado[] = [
        { id: 1, nombre: 'ADRIAN ANDRES', apellido: 'PADILLA ROQUEME', numeroDocumento: '1063076355', cargo: 'Administrador', salarioBase: 4576458 },
        { id: 2, nombre: 'JUAN DAVID', apellido: 'GOMEZ', numeroDocumento: '123456789', cargo: 'Desarrollador', salarioBase: 3500000 },
        { id: 3, nombre: 'MARIA CAMILA', apellido: 'RODRIGUEZ', numeroDocumento: '987654321', cargo: 'Analista', salarioBase: 4200000 }
    ];

    constructor(private http: HttpClient, private router: Router) { }

    ngOnInit(): void {
        if (localStorage.getItem('role') !== 'empleado') {
            this.router.navigate(['/login']);
            return;
        }

        // PRIMERO intenta cargar del backend
        this.http.get<Empleado[]>('http://localhost:8080/api/empleados').subscribe({
            next: (data) => {
                this.empleados = data.length > 0 ? data : this.datosPrueba;
            },
            error: (err) => {
                console.log('Backend no responde, usando datos de prueba');
                this.empleados = this.datosPrueba; // ← SIEMPRE CARGA ALGO
            }
        });
    }

    buscar(): void {
        if (!this.busqueda.trim()) {
            this.empleado = null;
            this.novedades = [];
            return;
        }
        const term = this.busqueda.toLowerCase();
        this.empleado = this.empleados.find(e =>
            e.nombre.toLowerCase().includes(term) ||
            e.apellido.toLowerCase().includes(term) ||
            e.numeroDocumento.includes(term)
        ) || null;

        if (this.empleado) {
            this.cargarNovedades(this.empleado.id);
        }
    }

    cargarNovedades(empleadoId: number): void {
        // Aquí puedes conectar al backend real cuando funcione
        // Por ahora datos de prueba
        this.novedades = [
            { tipo: 'DEVENGO', descripcion: 'Horas extras nocturnas', valor: 350000 },
            { tipo: 'DEVENGO', descripcion: 'Bonificación por cumplimiento', valor: 200000 },
            { tipo: 'DEDUCCION', descripcion: 'Salud (4%)', valor: this.empleado!.salarioBase * 0.04 },
            { tipo: 'DEDUCCION', descripcion: 'Pensión (4%)', valor: this.empleado!.salarioBase * 0.04 },
            { tipo: 'DEDUCCION', descripcion: 'Retención en la fuente', valor: 150000 }
        ];
        this.calcularTotales();
    }

    calcularTotales(): void {
        this.totalDevengado = this.empleado!.salarioBase;
        this.totalDeducciones = 0;

        this.novedades.forEach(n => {
            if (n.tipo === 'DEVENGO') this.totalDevengado += n.valor;
            if (n.tipo === 'DEDUCCION') this.totalDeducciones += n.valor;
        });

        this.netoAPagar = this.totalDevengado - this.totalDeducciones;
    }

    getEmptyRowsCount(): number {
        const used = 1 + this.novedades.length;
        return Math.max(0, 12 - used);
    }

    imprimir(): void { window.print(); }
    salir(): void {
        localStorage.clear();
        this.router.navigate(['/login']);
    }
}