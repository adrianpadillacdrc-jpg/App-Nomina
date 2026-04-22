package com.nomina.numa.dto;

public class LoginResponse {
    private String token;
    private String nombre;
    private String correo;
    private String rol;
    
    public LoginResponse() {}
    
    public LoginResponse(String token, String nombre, String correo, String rol) {
        this.token = token;
        this.nombre = nombre;
        this.correo = correo;
        this.rol = rol;
    }
    
    // Getters y setters
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    
    public String getCorreo() { return correo; }
    public void setCorreo(String correo) { this.correo = correo; }
    
    public String getRol() { return rol; }
    public void setRol(String rol) { this.rol = rol; }
}