package com.nomina.numa.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record ChatRequest(
        @NotBlank
        @Size(max = 1500)
        String message,
        @Size(max = 10)
        List<@Valid ChatMessage> history,
        @NotBlank
        @Size(max = 64)
        String conversationId) {

    public record ChatMessage(
            @NotBlank
            @Size(max = 1500)
            String role,
            @NotBlank
            @Size(max = 1500)
            String content) {
    }
}
