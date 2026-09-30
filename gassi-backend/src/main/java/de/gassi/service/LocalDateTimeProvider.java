package de.gassi.service;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class LocalDateTimeProvider {

    public LocalDateTime jetzt() {
        return LocalDateTime.now();
    }
}
