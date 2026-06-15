package com.event.peoplemanager.dto;

public record UpdateProfileRequest(
        String username,
        String password
) {}
