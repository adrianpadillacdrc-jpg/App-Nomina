package com.nomina.numa.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nomina.numa.dto.ChatRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Guarda el historial de conversaciones del chatbot en Redis.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ChatHistoryStore {
    private static final String KEY_PREFIX = "chat:history:";
    private static final Duration TTL = Duration.ofHours(24);
    private static final int MAX_ENTRIES = 50;

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public void guardar(String conversationId, String role, String actorId, String pregunta, String respuesta) {
        String key = KEY_PREFIX + conversationId;
        try {
            var entry = objectMapper.createObjectNode()
                    .put("role", role)
                    .put("actorId", actorId)
                    .put("message", pregunta)
                    .put("answer", respuesta)
                    .put("createdAt", Instant.now().toString());

            redisTemplate.opsForList().rightPush(key, objectMapper.writeValueAsString(entry));
            redisTemplate.opsForList().trim(key, -MAX_ENTRIES, -1);
            redisTemplate.expire(key, TTL);
        } catch (Exception exception) {
            log.warn("No se pudo guardar la conversación en Redis: {}", exception.getClass().getSimpleName());
        }
    }

    /**
     * Devuelve el historial guardado en Redis para una conversación, filtrando solo
     * las entradas del mismo actor (evita que un actor lea el historial de otro
     * adivinando el conversationId). Si no hay entradas, devuelve lista vacía.
     */
    public List<ChatRequest.ChatMessage> obtenerHistorial(String conversationId, String actorId) {
        String key = KEY_PREFIX + conversationId;
        try {
            List<String> entradas = redisTemplate.opsForList().range(key, 0, -1);
            List<ChatRequest.ChatMessage> historial = new ArrayList<>();
            if (entradas == null) return historial;
            for (String entrada : entradas) {
                var nodo = objectMapper.readTree(entrada);
                if (actorId != null && !actorId.equals(nodo.path("actorId").asText(null))) {
                    continue;
                }
                String pregunta = nodo.path("message").asText(null);
                String respuesta = nodo.path("answer").asText(null);
                if (pregunta != null && !pregunta.isBlank()) {
                    historial.add(new ChatRequest.ChatMessage("user", pregunta));
                }
                if (respuesta != null && !respuesta.isBlank()) {
                    historial.add(new ChatRequest.ChatMessage("model", respuesta));
                }
            }
            return historial;
        } catch (Exception exception) {
            log.warn("No se pudo leer el historial desde Redis: {}", exception.getClass().getSimpleName());
            return List.of();
        }
    }
}
