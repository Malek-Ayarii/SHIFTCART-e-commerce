package com.shiftcart.media;

import com.shiftcart.common.error.ApiException;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.multipart.MultipartFile;

/**
 * Photos. Public : {@code GET /api/media/{id}} (immuable : cache d'un an + ETag, 304 si inchangé).
 * Admin : envoi multipart et texte alternatif.
 */
@RestController
public class MediaController {

    static final String CACHE_CONTROL = CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable()
            .getHeaderValue();

    private final MediaStore store;
    private final MediaService service;

    public MediaController(MediaStore store, MediaService service) {
        this.store = store;
        this.service = service;
    }

    @GetMapping("/api/media/{id}")
    public ResponseEntity<byte[]> get(@PathVariable long id, WebRequest request, HttpServletResponse response) {
        MediaStore.MediaContent media = store.content(id)
                .orElseThrow(() -> ApiException.notFound("Photo introuvable."));
        String etag = "\"" + media.sha256() + "\"";
        response.setHeader(HttpHeaders.CACHE_CONTROL, CACHE_CONTROL);
        if (request.checkNotModified(etag)) {
            return null;
        }
        // Cache-Control déjà posé sur la réponse (aussi pour le 304) : ne pas le dupliquer ici.
        return ResponseEntity.ok()
                .eTag(etag)
                .contentType(MediaType.parseMediaType(media.contentType()))
                .contentLength(media.data().length)
                .body(media.data());
    }

    @PostMapping(value = "/api/admin/media", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<MediaDto> upload(@RequestPart(name = "file", required = false) MultipartFile file,
            @RequestParam(name = "alt", required = false) String alt) throws java.io.IOException {
        byte[] data = file == null ? null : file.getBytes();
        return ResponseEntity.status(HttpStatus.CREATED).body(service.upload(data, alt));
    }

    @PatchMapping("/api/admin/media/{id}")
    public MediaDto patch(@PathVariable long id, @RequestBody Map<String, String> body) {
        return service.updateAlt(id, body == null ? null : body.get("alt"));
    }
}
