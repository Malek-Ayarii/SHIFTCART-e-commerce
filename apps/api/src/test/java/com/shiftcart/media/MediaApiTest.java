package com.shiftcart.media;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.shiftcart.IntegrationTest;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Arrays;
import java.util.Map;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

class MediaApiTest extends IntegrationTest {

    private String token;

    @BeforeEach
    void login() throws Exception {
        token = adminToken();
    }

    private static byte[] image(String format, int w, int h) throws Exception {
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        img.setRGB(1, 1, 0x336699);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, format, out);
        return out.toByteArray();
    }

    private ResultActions upload(byte[] data, String declaredType, String alt) throws Exception {
        var req = multipart("/api/admin/media")
                .file(new MockMultipartFile("file", "photo.bin", declaredType, data))
                .header(HttpHeaders.AUTHORIZATION, bearer(token));
        if (alt != null) {
            req.param("alt", alt);
        }
        return mvc.perform(req);
    }

    @Test
    void uploadPngAndJpegSniffsTypeAndDimensions() throws Exception {
        // Le type annoncé par le client est ignoré : seuls les octets comptent.
        JsonNode png = body(upload(image("png", 40, 30), "application/octet-stream", "  Le pack   sur un bureau ")
                .andExpect(status().isCreated()).andReturn());
        assertThat(png.get("contentType").asText()).isEqualTo("image/png");
        assertThat(png.get("width").asInt()).isEqualTo(40);
        assertThat(png.get("height").asInt()).isEqualTo(30);
        assertThat(png.get("alt").asText()).isEqualTo("Le pack sur un bureau");
        assertThat(png.get("url").asText()).isEqualTo("/api/media/" + png.get("id").asLong());

        upload(image("jpg", 16, 9), "image/png", null)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.contentType").value("image/jpeg"))
                .andExpect(jsonPath("$.width").value(16))
                .andExpect(jsonPath("$.alt").isEmpty());

        // WebP minimal (en-tête VP8X 3×2) : accepté, dimensions lues dans l'en-tête.
        byte[] webp = new byte[40];
        System.arraycopy("RIFF".getBytes(), 0, webp, 0, 4);
        System.arraycopy("WEBPVP8X".getBytes(), 0, webp, 8, 8);
        webp[24] = 2; // largeur - 1
        webp[27] = 1; // hauteur - 1
        upload(webp, "image/webp", null)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.contentType").value("image/webp"))
                .andExpect(jsonPath("$.width").value(3))
                .andExpect(jsonPath("$.height").value(2));
    }

    @Test
    void tooBigIs422() throws Exception {
        byte[] big = Arrays.copyOf(image("png", 4, 4), 8 * 1024 * 1024 + 1);
        upload(big, "image/png", null)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errors.file").value("Photo trop lourde (8 Mo max)."));
    }

    @Test
    void wrongMagicBytesIs422() throws Exception {
        upload("GIF89a-not-allowed".getBytes(), "image/png", null)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errors.file").value("Format accepté : JPEG, PNG ou WebP."));
        upload("<svg xmlns='http://www.w3.org/2000/svg'/>".getBytes(), "image/jpeg", null)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errors.file").value("Format accepté : JPEG, PNG ou WebP."));
        upload(new byte[0], "image/png", null)
                .andExpect(status().isUnprocessableEntity());
        mvc.perform(multipart("/api/admin/media").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errors.file").isNotEmpty());
    }

    @Test
    void publicGetHasImmutableCacheEtagAnd304() throws Exception {
        byte[] data = image("png", 8, 8);
        long id = body(upload(data, "image/png", null).andExpect(status().isCreated()).andReturn()).get("id").asLong();

        // Sans jeton : public.
        MvcResult r = mvc.perform(get("/api/media/{id}", id))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, "image/png"))
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "max-age=31536000, public, immutable"))
                .andExpect(header().exists(HttpHeaders.ETAG))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andReturn();
        assertThat(r.getResponse().getContentAsByteArray()).isEqualTo(data);
        assertThat(r.getResponse().getHeader(HttpHeaders.PRAGMA)).isNull();
        assertThat(r.getResponse().getHeaders(HttpHeaders.CACHE_CONTROL)).hasSize(1);
        String etag = r.getResponse().getHeader(HttpHeaders.ETAG);

        mvc.perform(get("/api/media/{id}", id).header(HttpHeaders.IF_NONE_MATCH, etag))
                .andExpect(status().isNotModified())
                .andExpect(header().string(HttpHeaders.ETAG, etag));

        mvc.perform(get("/api/media/{id}", 999_999))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("NOT_FOUND"));
    }

    @Test
    void seededPackPhotoIsServed() throws Exception {
        Long cover = jdbc.queryForObject("select cover_media_id from product where sku = 'PACK-BARISTA'", Long.class);
        assertThat(cover).isNotNull();
        MvcResult r = mvc.perform(get("/api/media/{id}", cover))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, "image/png"))
                .andReturn();
        assertThat(r.getResponse().getContentAsByteArray().length).isGreaterThan(100_000);
    }

    @Test
    void patchAlt() throws Exception {
        long id = body(upload(image("png", 2, 2), "image/png", null).andReturn()).get("id").asLong();
        mvc.perform(patch("/api/admin/media/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("alt", "Thermos LED en gros plan"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.alt").value("Thermos LED en gros plan"));
        mvc.perform(patch("/api/admin/media/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("alt", "x".repeat(251)))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errors.alt").isNotEmpty());
        mvc.perform(patch("/api/admin/media/{id}", 999_999).header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("alt", "x"))))
                .andExpect(status().isNotFound());
    }
}
