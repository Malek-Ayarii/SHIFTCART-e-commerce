package com.nexoshift.common.error;

import jakarta.validation.ConstraintViolationException;
import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestCookieException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/** Traduit toutes les erreurs dans les formes de docs/CONTRACT.md. Ne logue jamais de données client. */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    public record ValidationErrors(Map<String, String> errors) {}

    @ExceptionHandler(ApiException.class)
    ResponseEntity<ErrorBody> api(ApiException ex) {
        return ResponseEntity.status(ex.getStatus()).body(new ErrorBody(ex.getCode(), ex.getMessage()));
    }

    @ExceptionHandler(ValidationException.class)
    ResponseEntity<ValidationErrors> validation(ValidationException ex) {
        return ResponseEntity.unprocessableEntity().body(new ValidationErrors(ex.getErrors()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ValidationErrors> beanValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new LinkedHashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            errors.putIfAbsent(fe.getField(), fe.getDefaultMessage());
        }
        return ResponseEntity.unprocessableEntity().body(new ValidationErrors(errors));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    ResponseEntity<ValidationErrors> constraint(ConstraintViolationException ex) {
        Map<String, String> errors = new LinkedHashMap<>();
        ex.getConstraintViolations().forEach(v -> {
            String path = v.getPropertyPath().toString();
            String field = path.contains(".") ? path.substring(path.lastIndexOf('.') + 1) : path;
            errors.putIfAbsent(field, v.getMessage());
        });
        return ResponseEntity.unprocessableEntity().body(new ValidationErrors(errors));
    }

    /** Envoi plus gros que la limite multipart (~10 Mo) : même message que la limite métier de 8 Mo. */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<ValidationErrors> uploadTooBig(MaxUploadSizeExceededException ex) {
        return ResponseEntity.unprocessableEntity()
                .body(new ValidationErrors(Map.of("file", "Photo trop lourde (8 Mo max).")));
    }

    @ExceptionHandler({MultipartException.class, MissingServletRequestPartException.class})
    ResponseEntity<ValidationErrors> badUpload(Exception ex) {
        return ResponseEntity.unprocessableEntity()
                .body(new ValidationErrors(Map.of("file", "Format accepté : JPEG, PNG ou WebP.")));
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    ResponseEntity<ErrorBody> methodValidation(HandlerMethodValidationException ex) {
        return badRequest("Paramètres invalides.");
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class,
            MissingServletRequestParameterException.class, MissingRequestCookieException.class})
    ResponseEntity<ErrorBody> badRequest(Exception ex) {
        return badRequest("Requête invalide.");
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    ResponseEntity<ErrorBody> mediaType(HttpMediaTypeNotSupportedException ex) {
        return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
                .body(new ErrorBody("UNSUPPORTED_MEDIA_TYPE", "Type de contenu non pris en charge."));
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ErrorBody> method(HttpRequestMethodNotSupportedException ex) {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
                .body(new ErrorBody("METHOD_NOT_ALLOWED", "Méthode non autorisée."));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<ErrorBody> notFound(NoResourceFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorBody("NOT_FOUND", "Ressource introuvable."));
    }

    @ExceptionHandler(AuthenticationException.class)
    ResponseEntity<ErrorBody> unauthenticated(AuthenticationException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ErrorBody("UNAUTHORIZED", "Connecte-toi pour continuer."));
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ErrorBody> denied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ErrorBody("FORBIDDEN", "Accès refusé."));
    }

    /**
     * Erreurs SQL : le message du pilote Postgres peut recopier la ligne fautive (« Failing row contains… »,
     * « Key (phone_e164)=… »), donc des données client. On ne logue que le type et le SQLSTATE.
     */
    @ExceptionHandler(DataAccessException.class)
    ResponseEntity<ErrorBody> dataAccess(DataAccessException ex) {
        Throwable root = ex.getMostSpecificCause();
        String sqlState = root instanceof SQLException sql ? sql.getSQLState() : null;
        log.error("Database error: {} (root {}, SQLSTATE {})", ex.getClass().getName(), root.getClass().getName(),
                sqlState);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorBody("INTERNAL_ERROR", "Une erreur est survenue. Réessaie dans un instant."));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ErrorBody> unexpected(Exception ex) {
        // Pas de corps de requête ni de paramètres dans le log : uniquement le type et la pile.
        log.error("Unexpected error: {}", ex.getClass().getName(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorBody("INTERNAL_ERROR", "Une erreur est survenue. Réessaie dans un instant."));
    }

    private static ResponseEntity<ErrorBody> badRequest(String message) {
        return ResponseEntity.badRequest().body(new ErrorBody("BAD_REQUEST", message));
    }
}
