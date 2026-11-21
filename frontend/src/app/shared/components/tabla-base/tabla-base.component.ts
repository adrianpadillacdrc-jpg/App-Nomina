import { Component } from '@angular/core';

@Component({
  selector: 'app-tabla-base',
  standalone: true,
  template: '<ng-content></ng-content>',
  styles: [`
    :host {
      display: block;
      width: 100%;
      min-width: 0;
      max-width: 100%;
      overflow-x: auto;
      overflow-y: clip;
      border-radius: 12px;
      background: var(--tabla-fondo, #fff);
      scrollbar-width: thin;
    }

    :host ::ng-deep table {
      width: 100%;
      min-width: max-content;
      border-collapse: collapse;
      font-family: inherit;
      font-variant-numeric: tabular-nums;
      text-align: left;
    }

    :host ::ng-deep thead {
      position: sticky;
      top: 0;
      z-index: 2;
      background: var(--brand-lilac, #e4d6fa);
      color: var(--brand-purple-dark, #3b1f73);
    }

    :host ::ng-deep th,
    :host ::ng-deep td {
      padding: 12px 16px;
      border-bottom: 1px solid var(--table-border, #eee8f4);
      text-align: left;
      vertical-align: middle;
    }

    :host ::ng-deep th {
      color: var(--brand-purple-dark, #3b1f73);
      font-weight: 600;
    }

    :host ::ng-deep tbody tr:hover {
      background: var(--table-hover, #f7f2ff);
    }

    :host ::ng-deep .header-row,
    :host ::ng-deep .table-header,
    :host ::ng-deep .header {
      position: sticky;
      top: 0;
      z-index: 2;
      background: var(--brand-lilac, #e4d6fa);
      color: var(--brand-purple-dark, #3b1f73);
      text-align: left;
      font-weight: 600;
    }

    :host ::ng-deep .empleado-row,
    :host ::ng-deep .table-row,
    :host ::ng-deep .row {
      border-bottom: 1px solid var(--table-border, #eee8f4);
      padding: 12px 16px;
      font-variant-numeric: tabular-nums;
      text-align: left;
    }

    :host ::ng-deep .empleado-row:hover,
    :host ::ng-deep .table-row:hover,
    :host ::ng-deep .row:hover {
      background: var(--table-hover, #f7f2ff);
    }

    :host ::ng-deep .empty-state,
    :host ::ng-deep .sin-nomina,
    :host ::ng-deep .vacio {
      padding: 16px;
      color: var(--brand-purple-dark, #3b1f73);
      text-align: center;
    }

    :host ::ng-deep .tabla-empleados,
    :host ::ng-deep .table-card,
    :host ::ng-deep .tabla-nomina,
    :host ::ng-deep .table-container,
    :host ::ng-deep .history-table-wrapper {
      width: max-content;
      min-width: 100%;
      max-width: none;
      overflow: visible;
      background: var(--tabla-fondo, #fff);
    }

    :host ::ng-deep .monto,
    :host ::ng-deep .valor,
    :host ::ng-deep .total,
    :host ::ng-deep .cost-cell,
    :host ::ng-deep .sueldo-base,
    :host ::ng-deep .devengo-col,
    :host ::ng-deep .deduccion-col,
    :host ::ng-deep .total-col {
      font-variant-numeric: tabular-nums;
      text-align: right;
    }

    @media (max-width: 600px) {
      :host ::ng-deep th,
      :host ::ng-deep td {
        padding: 10px 12px;
      }
    }
  `]
})
export class TablaBaseComponent {}
