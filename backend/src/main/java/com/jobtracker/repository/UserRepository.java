package com.jobtracker.repository;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.jobtracker.model.User;

/**
 * Spring Data MongoDB repository for {@link User} documents.
 */
public interface UserRepository extends MongoRepository<User, String> {

    /**
     * Looks up a user by their unique email address.
     *
     * @param email the email to search for
     * @return the matching user, or empty if no user has that email
     */
    Optional<User> findByEmail(String email);
}
