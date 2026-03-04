// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { empleadoGuard } from './guards/empleado.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  // Rutas públicas
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },

  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent)
  },

  // Rutas solo ADMIN
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard, adminGuard]
  },

  {
    path: 'registro',
    loadComponent: () => import('./pages/registro-empleado/registro-empleado.component').then(m => m.RegistroEmpleadoComponent),
    canActivate: [authGuard, adminGuard]
  },

  {
    path: 'liquidar',
    loadComponent: () => import('./pages/liquidar-empleado/liquidar-empleado.component').then(m => m.LiquidarEmpleadoComponent),
    canActivate: [authGuard, adminGuard]
  },

  {
    path: 'consultar',
    loadComponent: () => import('./pages/consultar-empleados/consultar-empleados.component').then(m => m.ConsultarEmpleadosComponent),
    canActivate: [authGuard, adminGuard]
  },

  // Ruta solo EMPLEADO
  {
    path: 'consulta-empleado',
    loadComponent: () => import('./pages/consulta-empleado/consulta-empleado.component').then(m => m.ConsultaEmpleadoComponent),
    canActivate: [authGuard, empleadoGuard]
    
  },

  // Rutas para ambos roles (solo autenticación)
  {
    path: 'contratos',
    loadComponent: () => import('./pages/contratos-empleados/contratos-empleados.component').then(m => m.ContratosEmpleadosComponent),
    canActivate: [authGuard]
  },

  {
    path: 'novedades',
    loadComponent: () => import('./pages/novedades/novedades.component').then(m => m.NovedadesComponent),
    canActivate: [authGuard]
  },

  {
    path: 'pago-nomina',
    loadComponent: () => import('./pages/pago-nomina/pago-nomina.component').then(m => m.PagoNominaComponent),
    canActivate: [authGuard]
  },

  {
    path: 'periodos-nomina',
    loadComponent: () => import('./pages/periodos-nomina/periodos-nomina.component').then(m => m.PeriodosNominaComponent),
    canActivate: [authGuard]
  },

  // Ruta comodín
  { path: '**', redirectTo: '/login' }
];