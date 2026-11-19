package com.nexoshift.catalog;

import com.nexoshift.common.security.Hashing;
import com.nexoshift.media.ImageSniffer;
import com.nexoshift.media.MediaStore;
import com.nexoshift.order.Product;
import com.nexoshift.order.ProductRepository;
import java.io.IOException;
import java.io.InputStream;
import java.time.Clock;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Amorceur idempotent des photos de packs : importe {@code classpath:seed/packs/<slug>.png} comme photo
 * principale d'un pack qui n'en a pas. Chaque pack n'est amorcé qu'une fois ({@code product.photo_seeded}) :
 * si l'admin retire ensuite la photo, elle n'est pas réimportée au redémarrage.
 */
@Component
public class PackPhotoSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(PackPhotoSeeder.class);

    /**
     * Textes alternatifs (description de chaque photo fournie). La photo du Pack Setup est une image générée par
     * IA (docs/SPEC-V2.md) : à remplacer par une vraie photo du pack avant la mise en ligne.
     */
    static final Map<String, String> ALT = Map.of(
            "pack-barista", "Le Pack Barista sur un bureau : cafetière italienne Moka noire, thermos intelligent "
                    + "affichant la température et sachet de café de spécialité",
            "pack-espace-autonome", "Le Pack Espace Autonome sur un bureau en open space : bouilloire pliable bleue, "
                    + "multiprise cube avec ports USB et organisateur de bureau",
            "pack-setup-productivite", "Le Pack Setup & Productivité sur un bureau lumineux : ordinateur portable "
                    + "surélevé par un support pliable en aluminium, lampe LED clipsée en haut de l'écran et "
                    + "lunettes anti-lumière bleue à fine monture noire",
            "pack-meal-prep", "Le Pack Meal Prep sur un bureau : lunchbox chauffante, gourde isotherme en inox "
                    + "et set de couverts dans son étui");

    private final ProductRepository products;
    private final MediaStore media;
    private final Clock clock;

    public PackPhotoSeeder(ProductRepository products, MediaStore media, Clock clock) {
        this.products = products;
        this.media = media;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seed();
    }

    /** @return nombre de photos importées. */
    @Transactional
    public int seed() {
        int imported = 0;
        for (Product p : products.findAllByOrderBySortOrderAscIdAsc()) {
            if (p.getCoverMediaId() != null || p.isPhotoSeeded()) {
                continue;
            }
            ClassPathResource res = new ClassPathResource("seed/packs/" + p.getSlug() + ".png");
            if (!res.exists()) {
                continue;
            }
            byte[] data;
            try (InputStream in = res.getInputStream()) {
                data = in.readAllBytes();
            } catch (IOException e) {
                log.warn("Seed photo for {} could not be read", p.getSlug(), e);
                continue;
            }
            String type = ImageSniffer.sniff(data);
            if (type == null) {
                log.warn("Seed photo for {} is not a JPEG/PNG/WebP image", p.getSlug());
                continue;
            }
            String sha = Hashing.sha256Hex(data);
            long id = media.findIdBySha256(sha).orElseGet(() -> {
                ImageSniffer.Dimensions dim = ImageSniffer.dimensions(data, type);
                return media.insert(data, type, dim.width(), dim.height(),
                        ALT.getOrDefault(p.getSlug(), "Photo du " + p.shortName()), sha, clock.instant());
            });
            p.setCoverMediaId(id);
            p.setPhotoSeeded(true);
            p.touch(clock.instant());
            imported++;
            log.info("Seeded cover photo {} for product {}", id, p.getSlug());
        }
        products.flush();
        return imported;
    }
}
