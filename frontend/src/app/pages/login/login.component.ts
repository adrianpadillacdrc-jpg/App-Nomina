// src/app/pages/login/login.component.ts
import { Component, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  template: `
    <div class="login-wrapper">
      <div class="login-card">
        <h1>NUMA NOMINA</h1>
        <form (ngSubmit)="ingresar()" #f="ngForm">
          <div class="field">
            <label>USUARIO</label>
            <input [(ngModel)]="usuario" name="usuario" placeholder="Ingrese su usuario" required />
          </div>
          <div class="field">
            <label>CONTRASEÑA</label>
            <input [(ngModel)]="password" name="password" type="password" placeholder="Ingrese su contraseña" required />
          </div>
          <button type="submit" [disabled]="!f.valid || loading">
            {{ loading ? 'Cargando...' : 'Iniciar Sesión' }}
          </button>
          <p *ngIf="error" class="error">{{ error }}</p>
          <a href="#" class="link">¿Olvidó su contraseña?</a>
        </form>
      </div>
    </div>
  `,
  styles: [`
    /* Tu CSS completo intacto */
    *, *::before, *::after { box-sizing: border-box; }
    html, body, :host {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      height: 100% !important;
      overflow: hidden !important;
    }

    .login-wrapper {
      min-height: 100vh;
      min-height: 100dvh;
      width: 100vw;
      background: url('/assets/numa.jpg') center/cover no-repeat;
      background-attachment: fixed;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
      font-family: 'Segoe UI', sans-serif;
    }

    .login-card {
      background: rgba(255, 255, 255, 0.14);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border-radius: 40px;
      width: 400px;
      height: 460px;
      padding: 56px 44px;
      text-align: center;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.18);
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 20px;
    }

    h1 {
      color: #26222aff;
      font-size: 2.2rem;
      font-weight: 800;
      margin: 0;
      line-height: 1.1;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }

    .field {
      margin: 0;
      text-align: left;
    }

    .field:last-of-type {
      margin-bottom: 26px;
    }

    label {
      color: #f0f0f0;
      font-size: 0.92rem;
      font-weight: 600;
      margin-bottom: 8px;
      display: block;
    }

    input {
      width: 100%;
      padding: 16px 18px;
      background: rgba(255, 255, 255, 0.96);
      border: none;
      border-radius: 14px;
      color: #333;
      font-size: 1rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
      outline: none;
    }

    input::placeholder {
      color: #aaa;
    }

    input:focus {
      background: white;
      box-shadow: 0 0 0 3px rgba(106, 27, 154, 0.3);
    }

    button {
      width: 100%;
      padding: 16px;
      background: #6a1b9a;
      color: white;
      border: none;
      border-radius: 50px;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 5px 16px rgba(106, 27, 154, 0.5);
    }

    button:hover:not(:disabled) {
      background: #8e24aa;
      transform: translateY(-2px);
    }

    button:disabled {
      background: #4a148c;
      cursor: not-allowed;
      opacity: 0.7;
    }

    .error {
      color: #ff6b6b;
      font-size: 0.95rem;
      margin-top: 8px;
    }

    .link {
      color: #d1c4e9;
      font-size: 0.95rem;
      text-decoration: none;
      font-weight: 500;
    }

    .link:hover {
      color: white;
      text-decoration: underline;
    }

    @media (max-width: 480px) {
      .login-card {
        width: 340px;
        height: 420px;
        padding: 48px 36px;
        gap: 18px;
      }
      h1 { font-size: 2.3rem; }
      .field:last-of-type { margin-bottom: 22px; }
    }
  `]
})
export class LoginComponent {
  usuario = '';
  password = '';
  error = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) { }
  ingresar() {
    this.error = '';
    this.loading = true;
    this.cdr.detectChanges();

    this.authService.login(this.usuario.trim(), this.password.trim()).subscribe({
      next: () => {
        this.loading = false;
        console.log('Login exitoso');

        const role = this.authService.getUserRole();
        console.log('Rol detectado:', role);

        let targetRoute = '/dashboard';
        if (role?.toUpperCase() === 'EMPLEADO') {
          targetRoute = '/consulta-empleado';
        }

        console.log('Forzando navegación a:', targetRoute);

        // 1. Navegación normal
        this.router.navigateByUrl(targetRoute, { replaceUrl: true });

        // 2. Forzado extra con delay y reload si falla
        setTimeout(() => {
          if (this.router.url !== targetRoute) {
            console.warn('Router no cambió - forzando reload completo');
            window.location.href = targetRoute;
          } else {
            console.log('Router cambió correctamente - forzando múltiples detecciones');
            this.cdr.detectChanges();
            setTimeout(() => this.cdr.detectChanges(), 0);
            setTimeout(() => this.cdr.detectChanges(), 200);
          }
        }, 100);
      },
      error: (err) => {
        this.loading = false;
        this.cdr.detectChanges();
        console.error('Error login:', err);
        this.error = err.status === 401 ? 'Credenciales inválidas' : 'Error de conexión';
      }
    });
  }
}