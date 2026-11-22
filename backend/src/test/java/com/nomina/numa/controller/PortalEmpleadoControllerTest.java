package com.nomina.numa.controller;

import com.nomina.numa.repository.jpa.EmpleadoRepository;
import com.nomina.numa.repository.jpa.NovedadRepository;
import com.nomina.numa.repository.jpa.PeriodoNominaRepository;
import com.nomina.numa.repository.jpa.RenunciaRepository;
import com.nomina.numa.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

class PortalEmpleadoControllerTest {
    private final EmpleadoRepository empleadoRepository = mock(EmpleadoRepository.class);
    private final NovedadRepository novedadRepository = mock(NovedadRepository.class);
    private final PeriodoNominaRepository periodoNominaRepository = mock(PeriodoNominaRepository.class);
    private final RenunciaRepository renunciaRepository = mock(RenunciaRepository.class);
    private final JwtUtil jwtUtil = mock(JwtUtil.class);
    private PortalEmpleadoController controller;

    @BeforeEach
    void setUp() {
        controller = new PortalEmpleadoController(
                empleadoRepository, novedadRepository, periodoNominaRepository, renunciaRepository, jwtUtil);
    }

    @Test
    void rejectsPortalDataRequestsWithoutAToken() {
        ResponseStatusException error = assertThrows(
                ResponseStatusException.class, () -> controller.resumen(7L, null));

        assertEquals(UNAUTHORIZED, error.getStatusCode());
        verifyNoInteractions(empleadoRepository);
    }

    @Test
    void preventsAnEmployeeFromReadingAnotherEmployeesData() {
        when(jwtUtil.extractRole("employee-token")).thenReturn("ROLE_PORTAL_EMPLOYEE");
        when(jwtUtil.isTokenExpired("employee-token")).thenReturn(false);
        when(jwtUtil.extractUsername("employee-token")).thenReturn("portal-employee:7");

        ResponseStatusException error = assertThrows(
                ResponseStatusException.class,
                () -> controller.resumen(8L, "Bearer employee-token"));

        assertEquals(FORBIDDEN, error.getStatusCode());
        verifyNoInteractions(empleadoRepository);
    }
}
