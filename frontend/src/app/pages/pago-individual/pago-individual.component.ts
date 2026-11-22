// src/app/pages/pago-individual/pago-individual.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { EmpleadosService } from '../../services/empleados.service';
import { SidebarComponent } from '../../guards/components/sidebar/sidebar.component';
import { EncabezadoPaginaComponent } from '../../shared/components/encabezado-pagina/encabezado-pagina.component';

@Component({
  selector: 'app-pago-individual',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, EncabezadoPaginaComponent],
  templateUrl: './pago-individual.component.html',
  styleUrl: './pago-individual.component.scss'
})
export class PagoIndividualComponent implements OnInit {

  empleado: any = null;
  cargando = false;
  pagoRealizado = false;
  error = '';
  pagoId: number | null = null;

  // Importe calculado automáticamente (solo lectura)
  importeCalculado = 0;

  // Formulario
  metodoPago: 'TRANSFERENCIA' | 'EFECTIVO' = 'TRANSFERENCIA';
  referencia = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private empleadosService: EmpleadosService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.queryParamMap.get('empleadoId');
    if (!idParam) {
      this.error = 'No se especificó el empleado.';
      return;
    }
    this.cargando = true;
    this.empleadosService.getEmpleadoPorId(idParam).subscribe({
      next: (emp) => {
        this.empleado = emp;
        this.importeCalculado = this.calcularImporte(emp);
        this.cargando = false;
      },
      error: () => {
        this.error = 'No se pudo cargar el empleado.';
        this.cargando = false;
      }
    });
  }

  /** salario base + auxilio de transporte si aplica (≤ 2 SMLMV 2026) */
  private calcularImporte(emp: any): number {
    const base = Number(emp.salarioBase ?? 0);
    const SMLMV_2026 = 1423500;
    const auxilio = base <= 2 * SMLMV_2026 ? 200000 : 0; // auxilio transporte 2026
    return base + auxilio;
  }

  confirmarPago(): void {
    if (!this.empleado) return;
    this.cargando = true;
    this.error = '';

    const payload = {
      empleadoId: this.empleado.id,
      monto: this.importeCalculado,
      metodoPago: this.metodoPago,
      referencia: this.referencia || ''
    };

    this.http.post<any>('/api/pagos-individuales', payload).subscribe({
      next: (resp: any) => {
        this.pagoRealizado = true;
        this.pagoId = resp?.id ?? resp?.pagoId ?? null;
        this.cargando = false;
        // Redirigir a Pago Nómina al finalizar
        setTimeout(() => this.router.navigate(['/pago-nomina']), 1500);
      },
      error: (err) => {
        this.error = err?.error?.error || 'Error al registrar el pago.';
        this.cargando = false;
      }
    });
  }

  descargarFactura(): void {
    if (!this.pagoId) return;
    // Abre el PDF en una nueva pestaña; el backend lo sirve como attachment
    window.open(`/api/factura-nomina/pdf/${this.pagoId}`, '_blank');
  }

  volver(): void {
    this.router.navigate(['/consultar-empleados']);
  }

  formatCOP(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor);
  }
}
