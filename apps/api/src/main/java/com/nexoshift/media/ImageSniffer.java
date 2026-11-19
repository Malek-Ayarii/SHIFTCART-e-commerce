package com.nexoshift.media;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;

/** Type réel d'une image d'après ses octets magiques (jamais d'après le nom ni l'en-tête du client) + dimensions. */
public final class ImageSniffer {

    public static final String JPEG = "image/jpeg";
    public static final String PNG = "image/png";
    public static final String WEBP = "image/webp";

    private ImageSniffer() {}

    public record Dimensions(Integer width, Integer height) {
        static final Dimensions UNKNOWN = new Dimensions(null, null);
    }

    /** {@code image/jpeg}, {@code image/png}, {@code image/webp}, ou {@code null} si autre chose. */
    public static String sniff(byte[] b) {
        if (b == null) {
            return null;
        }
        if (b.length >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) {
            return JPEG;
        }
        if (b.length >= 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G'
                && b[4] == 0x0D && b[5] == 0x0A && b[6] == 0x1A && b[7] == 0x0A) {
            return PNG;
        }
        if (b.length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') {
            return WEBP;
        }
        return null;
    }

    /** Dimensions lues dans l'en-tête (ImageIO pour JPEG/PNG, analyse VP8/VP8L/VP8X pour WebP). */
    public static Dimensions dimensions(byte[] b, String contentType) {
        if (WEBP.equals(contentType)) {
            return webp(b);
        }
        try (ImageInputStream in = ImageIO.createImageInputStream(new ByteArrayInputStream(b))) {
            if (in == null) {
                return Dimensions.UNKNOWN;
            }
            Iterator<ImageReader> readers = ImageIO.getImageReaders(in);
            if (!readers.hasNext()) {
                return Dimensions.UNKNOWN;
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(in, true, true);
                return new Dimensions(reader.getWidth(0), reader.getHeight(0));
            } finally {
                reader.dispose();
            }
        } catch (IOException | RuntimeException e) {
            return Dimensions.UNKNOWN;
        }
    }

    private static Dimensions webp(byte[] b) {
        if (b.length < 30) {
            return Dimensions.UNKNOWN;
        }
        String chunk = new String(b, 12, 4, StandardCharsets.US_ASCII);
        return switch (chunk) {
            case "VP8X" -> new Dimensions(1 + u24(b, 24), 1 + u24(b, 27));
            case "VP8L" -> {
                int bits = (b[21] & 0xFF) | (b[22] & 0xFF) << 8 | (b[23] & 0xFF) << 16 | (b[24] & 0xFF) << 24;
                yield new Dimensions(1 + (bits & 0x3FFF), 1 + ((bits >> 14) & 0x3FFF));
            }
            case "VP8 " -> new Dimensions(((b[26] & 0xFF) | (b[27] & 0xFF) << 8) & 0x3FFF,
                    ((b[28] & 0xFF) | (b[29] & 0xFF) << 8) & 0x3FFF);
            default -> Dimensions.UNKNOWN;
        };
    }

    private static int u24(byte[] b, int off) {
        return (b[off] & 0xFF) | (b[off + 1] & 0xFF) << 8 | (b[off + 2] & 0xFF) << 16;
    }
}
