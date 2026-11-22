// src/app/pages/login/login.component.ts
import { Component, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  template: `
    <div class="login-wrapper">
      <div class="login-card">
        <h1>NUMA NÓMINA</h1>
        <form (ngSubmit)="ingresar()" #f="ngForm">
          <div class="field">
            <label for="login-usuario">USUARIO</label>
            <input id="login-usuario" [(ngModel)]="usuario" name="usuario" placeholder="Ingrese su usuario" required autocomplete="username" />
          </div>
          <div class="field">
            <label for="login-password">CONTRASEÑA</label>
            <input id="login-password" [(ngModel)]="password" name="password" type="password" placeholder="Ingrese su contraseña" required autocomplete="current-password" />
          </div>
          <button type="submit" [disabled]="!f.valid || loading">
            {{ loading ? 'Cargando...' : 'Iniciar Sesión' }}
          </button>
          <p *ngIf="error" class="error">{{ error }}</p>

          <p class="register-link">
            ¿No tienes cuenta? 
            <a routerLink="/register" class="link">Regístrate aquí</a>
          </p>

          <a href="#" class="link">¿Olvidó su contraseña?</a>
        </form>
      </div>
    </div>
  `,
  styles: [`
    *, *::before, *::after { box-sizing: border-box; }
    :host {
      display: block;
      width: 100%;
      min-height: 100vh;
      min-height: 100dvh;
    }

    .login-wrapper {
      min-height: 100vh;
      min-height: 100dvh;
      width: 100%;
      background: url('/assets/numa.jpg') center/cover no-repeat;
      background-attachment: fixed;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: clamp(16px, 4vw, 32px);
      font-family: 'Segoe UI', sans-serif;
    }

    .login-card {
      background: rgba(255, 255, 255, 0.16);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border-radius: clamp(20px, 4vw, 36px);
      width: 100%;
      max-width: 420px;
      height: auto;
      padding: clamp(28px, 6vw, 48px);
      text-align: center;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.22);
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 18px;
    }

    h1 {
      color: #26222aff;
      font-size: clamp(1.6rem, 5vw, 2.2rem);
      font-weight: 800;
      margin: 0 0 6px;
      line-height: 1.2;
      letter-spacing: 0.5px;
      text-align: center;
    }

    .field {
      margin: 0 0 16px;
      text-align: left;
    }

    .field:last-of-type {
      margin-bottom: 22px;
    }

    label {
      color: #f0f0f0;
      font-size: 0.9rem;
      font-weight: 600;
      margin-bottom: 8px;
      display: block;
    }

    input {
      width: 100%;
      min-height: 48px;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.96);
      border: none;
      border-radius: 12px;
      color: #333;
      font-size: 16px; /* Evita zoom automático en iOS Safari */
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
      outline: none;
      transition: box-shadow 0.2s ease, background 0.2s ease;
    }

    input::placeholder {
      color: #888;
    }

    input:focus {
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(106, 27, 154, 0.35);
    }

    button {
      width: 100%;
      min-height: 48px;
      padding: 12px 20px;
      background: #6a1b9a;
      color: white;
      border: none;
      border-radius: 50px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.25s ease;
      box-shadow: 0 5px 16px rgba(106, 27, 154, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
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
      font-size: 0.92rem;
      margin-top: 10px;
    }

    .link {
      color: #d1c4e9;
      font-size: 0.92rem;
      text-decoration: none;
      font-weight: 500;
      display: inline-block;
      margin-top: 6px;
    }

    .link:hover {
      color: white;
      text-decoration: underline;
    }

    .register-link {
      margin-top: 14px;
      color: #d1c4e9;
      font-size: 0.92rem;
    }

    .register-link a {
      color: #ffffff;
      font-weight: 700;
      text-decoration: underline;
      cursor: pointer;
    }

    .register-link a:hover {
      color: #e4d6fa;
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
        console.log('Login exitoso - token guardado');

        const role = this.authService.getUserRole();
        console.log('Rol detectado:', role);

        let targetRoute = '/dashboard';

        const upperRole = role?.toUpperCase() || '';
        if (upperRole.includes('EMPLEADO')) {
          targetRoute = '/consulta-empleado';
        }

        console.log('Redirigiendo a:', targetRoute);

        this.ngZone.run(() => {
          setTimeout(() => {
            this.router.navigateByUrl(targetRoute, { replaceUrl: true }).then(success => {
              console.log('Navegación exitosa:', success ? 'SÍ' : 'NO');
              this.cdr.detectChanges();
            });
          }, 300);
        });
      },
      error: (err) => {
        this.loading = false;
        this.cdr.detectChanges();
        console.error('Error en login:', err);
        this.error = err.status === 401 ? 'Usuario o contraseña incorrectos' : 'Error al conectar';
      }
    });
  }
}