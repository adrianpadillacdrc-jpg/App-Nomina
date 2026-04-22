package com.nomina.numa.dto;

import lombok.Data;
import java.util.List;

@Data
public class PrediccionDTO {
    private List<Integer> años;
    private List<Double> costosAnualesMillones;
    private List<Double> costosAnualesBillones;
    private String mensaje;
    private String metodo;
}