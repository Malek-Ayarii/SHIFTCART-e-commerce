package com.nexoshift.media;

/** Forme JSON {@code Media} (docs/CONTRACT.md › v2). {@code width}/{@code height} peuvent être nuls. */
public record MediaDto(Long id, String url, String contentType, Integer width, Integer height, String alt) {

    public static String urlOf(Long id) {
        return id == null ? null : "/api/media/" + id;
    }
}
