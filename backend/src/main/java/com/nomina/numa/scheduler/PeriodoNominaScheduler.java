package com.nomina.numa.scheduler;

import com.nomina.numa.model.mongo.PeriodoNomina;
import com.nomina.numa.repository.mongo.PeriodoNominaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.Locale;

@Component
@RequiredArgsConstructor
public class PeriodoNominaScheduler {

    private final PeriodoNominaRepository repository;

    @EventListener(ApplicationReadyEvent.class)
    public void crearPeriodoAlIniciar() {
        asegurarPeriodoActual();
    }

    @Scheduled(cron = "0 0 1 * * *")
    public void crearPeriodoDiario() {
        asegurarPeriodoActual();
    }

    private void asegurarPeriodoActual() {
        LocalDate hoy = LocalDate.now();
        YearMonth mesActual = YearMonth.from(hoy);
        LocalDate inicio;
        LocalDate fin;
        String tipo;

        if (hoy.getDayOfMonth() <= 15) {
            inicio = mesActual.atDay(1);
            fin = mesActual.atDay(15);
            tipo = "1ra";
        } else {
            inicio = mesActual.atDay(16);
            fin = mesActual.atEndOfMonth();
            tipo = "2da";
        }

        crearSiFalta(mesActual, tipo, inicio, fin, hoy);
    }

    private void crearSiFalta(YearMonth mes, String tipo, LocalDate inicio, LocalDate fin, LocalDate hoy) {
        if (repository.existsByFechaInicioLessThanEqualAndFechaFinGreaterThanEqual(inicio, fin)) {
            return;
        }

        String nombreMes = mes.getMonth().getDisplayName(TextStyle.FULL, Locale.of("es", "CO"));
        repository.save(PeriodoNomina.builder()
                .description(tipo + " Quincena " + nombreMes + " " + mes.getYear())
                .fechaInicio(inicio)
                .fechaFin(fin)
                .estado("ABIERTO")
                .anio(mes.getYear())
                .tipo(tipo)
                .build());
    }

}