// src/app/pages/registro-empleado/registro-empleado.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-registro-empleado',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent], // ← AGREGA SidebarComponent
  templateUrl: './registro-empleado.component.html',
  styleUrls: ['./registro-empleado.component.scss']
})
export class RegistroEmpleadoComponent {

  // VARIABLES
  loading = false;
  exito = false;

  empleado = {
    tipoDocumento: 'C.C.',
    numeroDocumento: '',
    nombre: '',
    apellido: '',
    edad: null,
    genero: 'Masculino',
    direccion: '',
    correo: '',
    cargo: '',
    tipoContrato: 'Fijo',
    fechaInicioContrato: '',
    fechaFinContrato: null,
    salarioBase: null,
    estado: 'Activo',
    empresa: 'NUMA STORE',
    correoEmpresarial: '',
    idEmpresa: 1
  };

  cargos = ['Administrador', 'Ventas', 'Cajero', 'Auxiliar de Bodega'];
  tiposContrato = ['Fijo', 'Indefinido', 'Por obra', 'Aprendizaje'];
  generos = ['Masculino', 'Femenino'];
  estados = ['Activo', 'Inactivo'];

  constructor(private http: HttpClient, private router: Router) {}

  // MÉTODO REGISTRAR
  registrar() {
    this.loading = true;

    if (!this.empleado.numeroDocumento || !this.empleado.nombre || !this.empleado.apellido || !this.empleado.salarioBase) {
      Swal.fire('Error', 'Complete los campos obligatorios', 'error');
      this.loading = false;
      return;
    }

    this.http.post('http://localhost:8080/api/empleados', this.empleado).subscribe({
      next: () => {
        this.exito = true;
        this.loading = false;
        setTimeout(() => this.router.navigate(['/dashboard']), 2000);
      },
      error: (err) => {
        console.error(err);
        Swal.fire('Error', err.error?.error || 'Error al guardar', 'error');
        this.loading = false;
      }
    });
  }

  cancelar() {
    this.router.navigate(['/dashboard']);
  }
}