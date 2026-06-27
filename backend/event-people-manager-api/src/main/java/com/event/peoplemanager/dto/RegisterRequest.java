package com.event.peoplemanager.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record RegisterRequest(
        @NotBlank(message = "Nazwa użytkownika jest wymagana")
        String username,
        @NotBlank(message = "Hasło jest wymagane")
        String password,
        @NotBlank(message = "Imię jest wymagane")
        String firstName,
        @NotBlank(message = "Nazwisko jest wymagane")
        String lastName,
        @NotNull(message = "Data urodzenia jest wymagana")
        LocalDate birthDate,
        com.event.peoplemanager.domain.enums.UserRole role
) {}
