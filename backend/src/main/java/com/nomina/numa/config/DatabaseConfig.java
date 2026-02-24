package com.nomina.numa.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@Configuration
@EnableJpaRepositories(basePackages = "com.nomina.numa.repository.jpa")
@EnableMongoRepositories(basePackages = "com.nomina.numa.repository.mongo")
public class DatabaseConfig {
}