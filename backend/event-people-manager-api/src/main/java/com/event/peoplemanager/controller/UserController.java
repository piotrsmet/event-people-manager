package com.event.peoplemanager.controller;

import com.event.peoplemanager.domain.entity.User;
import com.event.peoplemanager.dto.response.ResponseMapper;
import com.event.peoplemanager.dto.response.UserResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final ResponseMapper responseMapper;

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser(
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(responseMapper.toUserResponse(currentUser));
    }
}
