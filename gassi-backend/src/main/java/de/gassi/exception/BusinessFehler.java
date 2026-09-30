package de.gassi.exception;

import lombok.Getter;

@Getter
public class BusinessFehler extends RuntimeException {

    private final String code;

    public BusinessFehler(String code, String message) {
        super(message);
        this.code = code;
    }
}
