package com.event.peoplemanager.config;

import com.event.peoplemanager.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.List;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Prefiks dla komunikatów wysyłanych z serwera do klienta
        config.enableSimpleBroker("/topic");
        // Prefiks dla komunikatów wysyłanych od klienta do serwera (np. przez @MessageMapping)
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Czyste WebSockets (dla aplikacji mobilnej) - na osobnym path, by uniknąć konfliktów z SockJS
        registry.addEndpoint("/ws-raw")
                .setAllowedOriginPatterns("*");
        // SockJS fallback (dla aplikacji webowej)
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
                    try {
                        List<String> authorization = accessor.getNativeHeader("Authorization");
                        if (authorization != null && !authorization.isEmpty()) {
                            String bearerToken = authorization.get(0);
                            if (bearerToken.startsWith("Bearer ")) {
                                String jwt = bearerToken.substring(7);
                                String username = jwtService.extractUsername(jwt);
                                if (username != null && accessor.getUser() == null) {
                                    UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                                    if (jwtService.isTokenValid(jwt, userDetails)) {
                                        UsernamePasswordAuthenticationToken authentication = 
                                            new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                                        accessor.setUser(authentication);
                                        System.out.println("WebSocket STOMP: User " + username + " successfully authenticated.");
                                    } else {
                                        System.err.println("WebSocket STOMP: Token is invalid for user: " + username);
                                    }
                                }
                            } else {
                                System.err.println("WebSocket STOMP: Authorization header does not start with Bearer: " + bearerToken);
                            }
                        } else {
                            System.err.println("WebSocket STOMP: CONNECT frame missing Authorization header.");
                        }
                    } catch (Exception e) {
                        System.err.println("WebSocket STOMP auth error: " + e.getMessage());
                        e.printStackTrace();
                    }
                }
                return message;
            }
        });
    }
}
