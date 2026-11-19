package com.nexoshift.common.error;

/** Forme d'erreur commune : {@code { "error": "<CODE>", "message": "…" }}. */
public record ErrorBody(String error, String message) {}
