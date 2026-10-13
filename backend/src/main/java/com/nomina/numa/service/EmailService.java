package com.nomina.numa.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    @Value("${spring.mail.username:}")
    private String sender;

    public boolean enviarConfirmacionRegistro(String destinatario, String nombre) {
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.warn("No se envió el correo de confirmación: JavaMailSender no está disponible.");
            return false;
        }
        if (sender == null || sender.isBlank()) {
            log.warn("No se envió el correo de confirmación: configura MAIL_USERNAME y MAIL_HOST.");
            return false;
        }

        try {
            SimpleMailMessage mensaje = new SimpleMailMessage();
            mensaje.setFrom(sender);
            mensaje.setTo(destinatario);
            mensaje.setSubject("Registro exitoso - NUMA Nómina");
            mensaje.setText("Hola " + nombre + ",\n\n"
                    + "Tu usuario fue registrado correctamente en NUMA Nómina.\n"
                    + "Ya puedes iniciar sesión con este correo.\n\n"
                    + "Este mensaje fue generado automáticamente.");
            mailSender.send(mensaje);
            return true;
        } catch (RuntimeException error) {
            log.error("Falló el envío del correo de confirmación SMTP.", error);
            return false;
        }
    }
}