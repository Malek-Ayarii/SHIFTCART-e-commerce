package com.shiftcart.order;

import com.shiftcart.common.config.AppProperties;
import com.shiftcart.common.security.Hashing;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import org.springframework.stereotype.Service;

/**
 * Jeton du lien de suivi : HMAC-SHA256(ref, TRACKING_TOKEN_SECRET) en base64url.
 * La base ne garde que son SHA-256 ({@code tracking_token_hash}) ; la vérification se fait en temps constant.
 */
@Service
public class TrackingTokenService {

    private final AppProperties props;

    public TrackingTokenService(AppProperties props) {
        this.props = props;
        String secret = props.tracking().secret();
        if (secret == null || secret.length() < 32) {
            throw new IllegalStateException("TRACKING_TOKEN_SECRET must be at least 32 characters");
        }
    }

    public String tokenFor(String ref) {
        return Hashing.hmacSha256Base64Url(props.tracking().secret(), ref);
    }

    public String hashOf(String token) {
        return Hashing.sha256Hex(token);
    }

    /** Vrai si le jeton correspond à la réf (et au hash stocké, s'il existe). */
    public boolean verify(CustomerOrder order, String token) {
        if (token == null || token.isBlank()) {
            return false;
        }
        boolean signatureOk = Hashing.constantTimeEquals(tokenFor(order.getRef()), token);
        String storedHash = order.getTrackingTokenHash();
        boolean hashOk = storedHash == null || Hashing.constantTimeEquals(storedHash, hashOf(token));
        return signatureOk & hashOk;
    }

    /** {@code SHOP_PUBLIC_URL/suivi/SC-2951?t=<jeton>}. */
    public String trackingUrl(String ref, String token) {
        String base = props.shopPublicUrl().replaceAll("/+$", "");
        return base + "/suivi/" + ref + "?t=" + URLEncoder.encode(token, StandardCharsets.UTF_8);
    }
}
