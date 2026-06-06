package com.event.peoplemanager.dto;

public record LoginRequest(
        String username,
        String password
) {}
