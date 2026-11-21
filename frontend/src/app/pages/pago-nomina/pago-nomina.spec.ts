import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AlertasService } from '../../services/alertas.service';
import { ContratosService } from '../../services/contratos.service';
import { EmpleadosService } from '../../services/empleados.service';
import { PagoNominaComponent } from './pago-nomina.component';

describe('PagoNomina', () => {
  let component: PagoNominaComponent;
  let fixture: ComponentFixture<PagoNominaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PagoNominaComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        {
          provide: AlertasService,
          useValue: {
            getAlertas: () => of({ alertas: [] })
          }
        },
        {
          provide: ContratosService,
          useValue: {}
        },
        {
          provide: EmpleadosService,
          useValue: {
            getPeriodoActual: () => of({ id: 'periodo-actual', estado: 'ABIERTO' }),
            getLiquidacionNomina: () => of({ empleados: [] })
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PagoNominaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
