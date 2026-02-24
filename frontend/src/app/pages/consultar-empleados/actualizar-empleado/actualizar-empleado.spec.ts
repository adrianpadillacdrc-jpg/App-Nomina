import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActualizarEmpleado } from './actualizar-empleado';

describe('ActualizarEmpleado', () => {
  let component: ActualizarEmpleado;
  let fixture: ComponentFixture<ActualizarEmpleado>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActualizarEmpleado]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActualizarEmpleado);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
