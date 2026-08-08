package com.jobtracker;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point for the Job Application Tracker backend.
 *
 * <p>Bootstraps the Spring Boot application context, which wires up the REST
 * API (controller layer), business logic (service layer), and MongoDB
 * persistence (repository layer) that together back the Kanban-style job
 * application tracker described in the project spec. Auth, CRUD endpoints,
 * and business logic are added in later tasks; this class only starts the
 * application context.</p>
 */
@SpringBootApplication
public class JobTrackerApplication {

    public static void main(String[] args) {
        SpringApplication.run(JobTrackerApplication.class, args);
    }

}
