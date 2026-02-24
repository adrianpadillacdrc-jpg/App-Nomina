// src/app/app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },

  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },

  {
    path: 'registro',
    loadComponent: () => import('./pages/registro-empleado/registro-empleado.component').then(m => m.RegistroEmpleadoComponent)
  },

  {
    path: 'liquidar',
    loadComponent: () => import('./pages/liquidar-empleado/liquidar-empleado.component').then(m => m.LiquidarEmpleadoComponent)
  },

  {
    path: 'consultar',
    loadComponent: () => import('./pages/consultar-empleados/consultar-empleados.component').then(m => m.ConsultarEmpleadosComponent)
  },

  {
    path: 'contratos',
    loadComponent: () => import('./pages/contratos-empleados/contratos-empleados.component').then(m => m.ContratosEmpleadosComponent)
  },

  {
    path: 'novedades',
    loadComponent: () => import('./pages/novedades/novedades.component').then(m => m.NovedadesComponent)
  },

  {
    path: 'pago-nomina',
    loadComponent: () => import('./pages/pago-nomina/pago-nomina.component').then(m => m.PagoNominaComponent)
  },

  {
    path: 'periodos-nomina',
    loadComponent: () => import('./pages/periodos-nomina/periodos-nomina.component').then(m => m.PeriodosNominaComponent)
  },

  // Ruta del empleado (portal personal)
  {
    path: 'consulta-empleado',
    loadComponent: () => import('./pages/consulta-empleado/consulta-empleado.component').then(m => m.ConsultaEmpleadoComponent)
  },

  // Ruta comodín siempre al final
  { path: '**', redirectTo: '/login' }
];