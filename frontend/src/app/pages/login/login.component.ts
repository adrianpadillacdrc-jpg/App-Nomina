// src/app/pages/login/login.component.ts
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
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
          <button type="submit" [disabled]="!f.valid">Iniciar Sesión</button>
          <a href="#" class="link">¿Olvidó su contraseña?</a>
        </form>
      </div>
    </div>
  `,
  styles: [`
    /* === ELIMINA BORDES BLANCOS === */
    *, *::before, *::after { box-sizing: border-box; }
    html, body, :host {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      height: 100% !important;
      overflow: hidden !important;
    }

    /* === FONDO === */
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

    /* === TARJETA: GRANDE Y ESPACIOSA === */
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

    /* === TÍTULO EN UNA SOLA LÍNEA + MORADO === */
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

    /* === ESPACIO ENTRE CONTRASEÑA Y BOTÓN === */
    .field:last-of-type {
      margin-bottom: 26px; /* Ajusta este valor para más/menos espacio */
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

    button:hover {
      background: #8e24aa;
      transform: translateY(-2px);
    }

    button:disabled {
      background: #4a148c;
      cursor: not-allowed;
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

    /* === RESPONSIVE === */
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

  constructor(private router: Router) { }

  ingresar() {
    // ADMIN → funciona exactamente igual que antes
    if (this.usuario === 'admin' && this.password === 'numa2025') {
      localStorage.setItem('role', 'admin');
      localStorage.setItem('loggedIn', 'true');
      this.router.navigate(['/dashboard']);
      return;
    }

    // EMPLEADO → NUEVO USUARIO (sin pistas en pantalla)  
    if (this.usuario === 'empleado' && this.password === 'empleado2025') {
      localStorage.setItem('role', 'empleado');
      localStorage.setItem('loggedIn', 'true');
      this.router.navigate(['/consulta-empleado']);
      return;
    }

    alert('Credenciales incorrectas');
  }
}