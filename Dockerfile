# Etapa 1: Compilación
FROM maven:3.8-openjdk-17 AS build

WORKDIR /app

# Copiar archivos del backend
COPY backend/pom.xml .
COPY backend/src ./src

# Compilar la aplicación
RUN mvn clean package -DskipTests

# Etapa 2: Ejecución
FROM eclipse-temurin:17-jdk-alpine

WORKDIR /app

# Copiar el JAR desde la etapa de compilación
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENV SPRING_PROFILES_ACTIVE=docker

ENTRYPOINT ["java", "-jar", "app.jar"]