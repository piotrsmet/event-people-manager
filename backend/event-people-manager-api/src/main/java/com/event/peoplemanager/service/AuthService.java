package com.event.peoplemanager.service;

import com.event.peoplemanager.domain.entity.User;
import com.event.peoplemanager.domain.enums.UserRole;
import com.event.peoplemanager.dto.AuthResponse;
import com.event.peoplemanager.dto.LoginRequest;
import com.event.peoplemanager.dto.RegisterRequest;
import com.event.peoplemanager.repository.UserRepository;
import com.event.peoplemanager.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.findByUsername(request.username()).isPresent()) {
            throw new IllegalArgumentException("Nazwa użytkownika jest już zajęta.");
        }

        if (request.birthDate() == null || request.birthDate().isAfter(LocalDate.now().minusYears(10))) {
            throw new IllegalArgumentException("Podaj prawidłową datę urodzenia.");
        }

        UserRole role = request.role() != null ? request.role() : UserRole.VOLUNTEER;

        var user = User.builder()
                .username(request.username())
                .passwordHash(passwordEncoder.encode(request.password()))
                .firstName(request.firstName())
                .lastName(request.lastName())
                .birthDate(request.birthDate())
                .role(role)
                .build();

        userRepository.save(user);
        var jwtToken = jwtService.generateToken(user);
        return new AuthResponse(jwtToken);
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.username(),
                        request.password()
                )
        );
        var user = userRepository.findByUsername(request.username())
                .orElseThrow();
        var jwtToken = jwtService.generateToken(user);
        return new AuthResponse(jwtToken);
    }
}
