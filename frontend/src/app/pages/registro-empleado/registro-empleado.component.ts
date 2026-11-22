// src/app/pages/registro-empleado/registro-empleado.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { SidebarComponent } from '../../guards/components/sidebar/sidebar.component';
import { EncabezadoPaginaComponent } from '../../shared/components/encabezado-pagina/encabezado-pagina.component';
import { EmpleadosService } from '../../services/empleados.service';
import Swal from 'sweetalert2';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-registro-empleado',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, EncabezadoPaginaComponent],
  templateUrl: './registro-empleado.component.html',
  styleUrls: ['./registro-empleado.component.scss']
})
export class RegistroEmpleadoComponent implements OnInit {

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
    tasaArl: null as number | null,
    modalidadTrabajo: 'PRESENCIAL',
    transporteSuministrado: false,
    metodoPago: 'Cuenta bancaria',
    banco: '',
    tipoCuenta: 'Ahorros',
    numeroCuenta: '',
    ultimosCuatroTarjeta: '',
    estado: 'Activo',
    empresa: 'NUMA STORE',
    correoEmpresarial: '',
    idEmpresa: 1,
    idSucursal: 1
  };

  sucursales: any[] = [
    { id: 1, nombre: 'Sucursal San José (Sede 1)' },
    { id: 2, nombre: 'Sucursal Villa Grande (Sede 2)' }
  ];

  cargos = ['Administrador', 'Ventas', 'Cajero', 'Auxiliar de Bodega'];
  tiposContrato = ['Fijo', 'Indefinido', 'Por obra', 'Aprendizaje'];
  generos = ['Masculino', 'Femenino'];
  estados = ['Activo', 'Inactivo'];
  metodosPago = ['Cuenta bancaria', 'Tarjeta'];
  tiposCuenta = ['Ahorros', 'Corriente'];
  numeroTarjeta = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private empleadosService: EmpleadosService
  ) {}

  ngOnInit(): void {
    this.empleadosService.getSucursales().subscribe({
      next: (data) => {
        if (Array.isArray(data) && data.length > 0) {
          this.sucursales = data;
        }
      },
      error: () => {}
    });
  }

  //  REGISTRAR
  registrar() {
    this.loading = true;

    if (!this.empleado.numeroDocumento || !this.empleado.nombre || !this.empleado.apellido || !this.empleado.salarioBase
        || !this.empleado.tasaArl || this.empleado.salarioBase < 1750905) {
      Swal.fire('Error', 'Complete los campos obligatorios', 'error');
      this.loading = false;
      return;
    }

    if (this.empleado.metodoPago === 'Cuenta bancaria' && (!this.empleado.banco || !this.empleado.numeroCuenta)) {
      Swal.fire('Error', 'Complete banco y número de cuenta', 'error');
      this.loading = false;
      return;
    }
    if (this.empleado.metodoPago === 'Tarjeta' && this.numeroTarjeta.replace(/\D/g, '').length < 4) {
      Swal.fire('Error', 'Ingrese una tarjeta válida', 'error');
      this.loading = false;
      return;
    }

    this.empleado.ultimosCuatroTarjeta = this.empleado.metodoPago === 'Tarjeta'
      ? this.numeroTarjeta.replace(/\D/g, '').slice(-4)
      : '';

    this.http.post(`${environment.apiUrl}/api/empleados`, this.empleado).subscribe({
      next: () => {
        this.exito = true;
        this.loading = false;
        Swal.fire('¡Éxito!', 'Empleado registrado correctamente en la sucursal seleccionada', 'success');
        setTimeout(() => this.router.navigate(['/contratos-empleados']), 1500);
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
