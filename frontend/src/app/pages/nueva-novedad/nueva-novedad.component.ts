import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-nueva-novedad',
  standalone: true,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule
  ],
  template: `
    <div class="content">
      <h1>Nueva Novedad</h1>

      <mat-card>
        <mat-card-content>
          <form (ngSubmit)="guardar()" #novedadForm="ngForm">

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Cédula del empleado</mat-label>
              <input matInput [(ngModel)]="novedad.cedula" name="cedula" required>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Tipo de novedad</mat-label>
              <mat-select [(ngModel)]="novedad.tipo" name="tipo" required>
                <mat-option value="Incapacidad">Incapacidad</mat-option>
                <mat-option value="Vacaciones">Vacaciones</mat-option>
                <mat-option value="Permiso">Permiso</mat-option>
                <mat-option value="Licencia">Licencia</mat-option>
                <mat-option value="Otro">Otro</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Fecha de inicio</mat-label>
              <input matInput type="date" [(ngModel)]="novedad.fechaInicio" name="fechaInicio" required>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Fecha de fin (opcional)</mat-label>
              <input matInput type="date" [(ngModel)]="novedad.fechaFin" name="fechaFin">
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Observaciones</mat-label>
              <textarea matInput [(ngModel)]="novedad.observaciones" name="observaciones" rows="3"></textarea>
            </mat-form-field>

            <div class="actions">
              <button mat-button routerLink="/novedades">Cancelar</button>
              <button mat-raised-button color="primary" type="submit" [disabled]="!novedadForm.valid">
                Guardar Novedad
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .content { padding: 24px; max-width: 600px; margin: 0 auto; }
    .full-width { width: 100%; margin-bottom: 8px; }
    .actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px; }
  `]
})
export class NuevaNovedadComponent {
  novedad = {
    cedula: '',
    tipo: '',
    fechaInicio: '',
    fechaFin: '',
    observaciones: ''
  };

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  guardar() {
    this.http.post('http://localhost:8080/api/novedades', this.novedad)
      .subscribe({
        next: (res: any) => {
          alert('¡Novedad guardada en MongoDB!');
          this.router.navigate(['/novedades']);
        },
        error: (err: any) => {
          alert('Error: ' + err.message);
        }
      });
  }
}