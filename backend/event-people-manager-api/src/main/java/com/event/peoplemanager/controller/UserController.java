package com.event.peoplemanager.controller;

import com.event.peoplemanager.domain.entity.User;
import com.event.peoplemanager.dto.response.ResponseMapper;
import com.event.peoplemanager.dto.response.UserResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.event.peoplemanager.dto.UpdateProfileRequest;
import com.event.peoplemanager.service.UserService;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final ResponseMapper responseMapper;

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser(
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(responseMapper.toUserResponse(currentUser));
    }

    @PutMapping("/me")
    public ResponseEntity<UserResponse> updateProfile(
            @AuthenticationPrincipal User currentUser,
            @RequestBody UpdateProfileRequest request
    ) {
        var updatedUser = userService.updateProfile(currentUser.getId(), request);
        return ResponseEntity.ok(responseMapper.toUserResponse(updatedUser));
    }
}
