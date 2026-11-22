import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActualizarEmpleadoComponent } from './actualizar-empleado.component';
import { EmpleadosService } from '../../../services/empleados.service';

describe('ActualizarEmpleado', () => {
  let component: ActualizarEmpleadoComponent;
  let fixture: ComponentFixture<ActualizarEmpleadoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActualizarEmpleadoComponent],
      providers: [
        {
          provide: EmpleadosService,
          useValue: {}
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActualizarEmpleadoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
