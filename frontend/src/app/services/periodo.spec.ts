import { TestBed } from '@angular/core/testing';

import { Periodo } from './periodo';

describe('Periodo', () => {
  let service: Periodo;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Periodo);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
