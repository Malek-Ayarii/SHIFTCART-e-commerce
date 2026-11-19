package com.nexoshift.media;

import com.nexoshift.common.error.ApiException;
import com.nexoshift.common.error.ValidationException;
import com.nexoshift.common.security.Hashing;
import java.time.Clock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Import des photos : contrôle du type réel (octets magiques), taille ≤ 8 Mo, dimensions, empreinte. */
@Service
public class MediaService {

    private static final Logger log = LoggerFactory.getLogger(MediaService.class);

    public static final long MAX_BYTES = 8L * 1024 * 1024;
    public static final int MAX_ALT = 250;
    public static final String MSG_TOO_BIG = "Photo trop lourde (8 Mo max).";
    public static final String MSG_FORMAT = "Format accepté : JPEG, PNG ou WebP.";

    private final MediaStore store;
    private final Clock clock;

    public MediaService(MediaStore store, Clock clock) {
        this.store = store;
        this.clock = clock;
    }

    @Transactional
    public MediaDto upload(byte[] data, String alt) {
        if (data != null && data.length > MAX_BYTES) {
            throw ValidationException.of("file", MSG_TOO_BIG);
        }
        String type = ImageSniffer.sniff(data);
        if (data == null || data.length == 0 || type == null) {
            throw ValidationException.of("file", MSG_FORMAT);
        }
        String cleanAlt = cleanAlt(alt);
        ImageSniffer.Dimensions dim = ImageSniffer.dimensions(data, type);
        long id = store.insert(data, type, dim.width(), dim.height(), cleanAlt, Hashing.sha256Hex(data),
                clock.instant());
        log.info("Media {} stored ({}, {} bytes)", id, type, data.length);
        return store.find(id).orElseThrow().toDto();
    }

    @Transactional
    public MediaDto updateAlt(long id, String alt) {
        String cleanAlt = cleanAlt(alt);
        if (store.updateAlt(id, cleanAlt) == 0) {
            throw ApiException.notFound("Photo introuvable.");
        }
        return store.find(id).orElseThrow().toDto();
    }

    static String cleanAlt(String alt) {
        if (alt == null || alt.isBlank()) {
            return null;
        }
        String t = alt.trim().replaceAll("\\s+", " ");
        if (t.length() > MAX_ALT) {
            throw ValidationException.of("alt", "Texte alternatif trop long (" + MAX_ALT + " caractères max).");
        }
        return t;
    }
}
