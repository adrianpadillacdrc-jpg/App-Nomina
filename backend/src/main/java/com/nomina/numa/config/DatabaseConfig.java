package com.nomina.numa.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

@Configuration
@EnableJpaRepositories(basePackages = "com.nomina.numa.repository.jpa")
public class DatabaseConfig {

    /**
     * RestTemplate con timeout de 60 s para llamadas al optimizer Python (solver MILP).
     */
    @Bean
    public RestTemplate restTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10_000); // 10 s
        factory.setReadTimeout(60_000);    // 60 s
        return new RestTemplate(factory);
    }
}
