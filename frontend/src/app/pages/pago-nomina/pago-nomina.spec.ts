import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PagoNomina } from './pago-nomina';

describe('PagoNomina', () => {
  let component: PagoNomina;
  let fixture: ComponentFixture<PagoNomina>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PagoNomina]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PagoNomina);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
