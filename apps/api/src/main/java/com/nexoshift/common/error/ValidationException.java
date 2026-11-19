package com.nexoshift.common.error;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/** Erreurs de validation par champ → {@code 422 { "errors": { champ: message } }}. */
public class ValidationException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    private final transient Map<String, String> errors;

    public ValidationException(Map<String, String> errors) {
        super("Validation failed: " + errors.keySet());
        this.errors = Collections.unmodifiableMap(new LinkedHashMap<>(errors));
    }

    public static ValidationException of(String field, String message) {
        return new ValidationException(Map.of(field, message));
    }

    public Map<String, String> getErrors() {
        return errors;
    }
}
