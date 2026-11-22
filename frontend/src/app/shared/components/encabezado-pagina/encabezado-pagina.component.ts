import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-encabezado-pagina',
  standalone: true,
  template: `
    <header class="encabezado-pagina" [class.encabezado-claro]="tema === 'claro'">
      <h1>{{ titulo }}</h1>
      <div class="acciones-encabezado">
        <ng-content select="[accionesPagina]"></ng-content>
      </div>
    </header>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .encabezado-pagina {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      width: 100%;
      min-height: 36px;
      margin: 0 0 24px;
    }

    h1 {
      margin: 0;
      color: var(--titulo-pagina-color, #fff);
      font-family: var(--fuente-base, 'Inter', 'Segoe UI', Arial, sans-serif);
      font-size: var(--titulo-pagina, 24px);
      font-weight: 600;
      line-height: 1.25;
      text-align: left;
      text-shadow: 0 2px 8px rgba(20, 9, 31, 0.6);
    }

    .encabezado-claro h1 {
      color: #fff;
    }

    .acciones-encabezado {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      margin-left: auto;
    }

    @media (max-width: 600px) {
      .encabezado-pagina {
        align-items: flex-start;
        flex-wrap: wrap;
      }
    }
  `]
})
export class EncabezadoPaginaComponent {
  @Input({ required: true }) titulo = '';
  @Input() tema: 'claro' | 'oscuro' = 'oscuro';
}
