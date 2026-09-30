package de.gassi;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@EnableAsync
@SpringBootApplication
public class GassiApplication {

    public static void main(String[] args) {
        SpringApplication.run(GassiApplication.class, args);
    }
}
