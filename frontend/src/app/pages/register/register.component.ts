// src/app/pages/register/register.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  nombre = '';
  correo = '';
  contrasena = '';
  confirmarContrasena = '';
  rol = 'EMPLEADO';
  error = '';
  success = '';
  loading = false;

  constructor(private http: HttpClient, private router: Router) { }

  registrar() {
    this.error = '';
    this.success = '';
    this.loading = true;

    // Validaciones frontend básicas
    if (!this.nombre.trim()) {
      this.error = 'El nombre de usuario es obligatorio';
      this.loading = false;
      return;
    }
    if (!this.correo.trim()) {
      this.error = 'El correo es obligatorio';
      this.loading = false;
      return;
    }
    if (this.contrasena.length < 6) {
      this.error = 'La contraseña debe tener al menos 6 caracteres';
      this.loading = false;
      return;
    }
    if (this.contrasena !== this.confirmarContrasena) {
      this.error = 'Las contraseñas no coinciden';
      this.loading = false;
      return;
    }
    if (!['ADMIN', 'EMPLEADO'].includes(this.rol.toUpperCase())) {
      this.error = 'Rol inválido. Solo ADMIN o EMPLEADO';
      this.loading = false;
      return;
    }

    const payload = {
      nombre: this.nombre.trim(),
      correo: this.correo.trim(),
      contrasena: this.contrasena,
      rol: this.rol.toUpperCase()
    };

    this.http.post('http://localhost:8080/api/auth/register', payload, { responseType: 'text' }).subscribe({
      next: (res: string) => {
        this.loading = false;
        this.success = res || 'Usuario registrado correctamente. Inicia sesión.';
        setTimeout(() => this.router.navigate(['/login']), 2500);
      },
      error: (err) => {
        this.loading = false;
        // El backend devuelve texto plano en errores → lo mostramos directamente
        this.error = err.error?.text || err.error || 'Error al registrar. Intenta de nuevo.';
        console.error('Error registro:', err);
      }
    });
  }
}