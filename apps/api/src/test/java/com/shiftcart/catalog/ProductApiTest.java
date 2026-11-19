package com.shiftcart.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.shiftcart.IntegrationTest;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

class ProductApiTest extends IntegrationTest {

    private static final AtomicInteger SEQ = new AtomicInteger();

    @Autowired
    private PackPhotoSeeder seeder;

    private String token;

    @BeforeEach
    void login() throws Exception {
        token = adminToken();
    }

    // ---------------------------------------------------------------- public

    @Test
    void publicListHasActivePacksInOrderWithSeededPhotos() throws Exception {
        MvcResult r = mvc.perform(get("/api/products"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode list = body(r);
        List<String> slugs = new java.util.ArrayList<>();
        list.forEach(p -> slugs.add(p.get("slug").asText()));
        assertThat(slugs).containsSubsequence("pack-barista", "pack-setup-productivite", "pack-espace-autonome", "pack-meal-prep");

        JsonNode barista = list.get(0);
        assertThat(barista.get("sku").asText()).isEqualTo("PACK-BARISTA");
        assertThat(barista.get("name").asText()).isEqualTo("Le Pack Barista");
        assertThat(barista.get("badge").asText()).isEqualTo("Best-seller");
        assertThat(barista.get("tagline").asText())
                .isEqualTo("Ton café de pro partout avec toi. Rentabilisé en 20 jours.");
        assertThat(barista.get("audience").asText())
                .isEqualTo("Étudiants, jeunes actifs, employés de bureau (amateurs de café).");
        assertThat(barista.get("priceTnd").decimalValue()).isEqualByComparingTo("89");
        assertThat(r.getResponse().getContentAsString()).contains("\"priceTnd\":89,");
        assertThat(barista.get("featured").asBoolean()).isTrue();
        assertThat(barista.has("active")).isFalse();
        JsonNode cover = barista.get("cover");
        assertThat(cover.get("url").asText()).isEqualTo("/api/media/" + cover.get("id").asLong());
        assertThat(cover.get("contentType").asText()).isEqualTo("image/png");
        assertThat(cover.get("width").asInt()).isEqualTo(1024);
        assertThat(cover.get("height").asInt()).isEqualTo(572);
        assertThat(cover.get("alt").asText()).startsWith("Le Pack Barista");
        assertThat(barista.get("gallery")).isEmpty();
        assertThat(barista.get("availability").asText()).isIn("IN_STOCK", "MADE_TO_ORDER");

        JsonNode items = barista.get("items");
        assertThat(items).hasSize(3);
        assertThat(items.get(0).get("name").asText()).isEqualTo("Cafetière italienne (Moka)");
        assertThat(items.get(0).get("hotspot").get("x").decimalValue()).isEqualByComparingTo("72");
        assertThat(items.get(0).get("hotspot").get("y").decimalValue()).isEqualByComparingTo("76");
        assertThat(items.get(0).get("id").asLong()).isEqualTo(items.get(0).get("stockItemId").asLong());
        assertThat(items.get(1).get("name").asText()).isEqualTo("Thermos intelligent");
        assertThat(items.get(2).get("name").asText()).isEqualTo("Café local de spécialité 250 g");
        assertThat(items.get(2).get("gift").asBoolean()).isTrue();
        assertThat(items.get(2).get("hotspot").get("x").decimalValue()).isEqualByComparingTo("63");
        assertThat(items.get(0).get("photo").isNull()).isTrue();

        JsonNode savings = barista.get("savings");
        assertThat(savings.get("question").asText()).isEqualTo("Combien tu dépenses en café par jour ?");
        assertThat(savings.get("min").decimalValue()).isEqualByComparingTo("4");
        assertThat(savings.get("max").decimalValue()).isEqualByComparingTo("10");
        assertThat(savings.get("step").decimalValue()).isEqualByComparingTo("0.5");
        assertThat(savings.get("homeCostPerDay").decimalValue()).isEqualByComparingTo("0.5");
        assertThat(savings.get("daysPerMonth").asInt()).isEqualTo(30);
    }

    @Test
    void publicBySlugAndInactiveOrUnknownIs404() throws Exception {
        mvc.perform(get("/api/products/{slug}", "pack-setup-productivite"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sku").value("PACK-SETUP"))
                .andExpect(jsonPath("$.name").value("Le Pack Setup & Productivité"))
                .andExpect(jsonPath("$.priceTnd").value(79))
                .andExpect(jsonPath("$.cover.url").isNotEmpty())
                .andExpect(jsonPath("$.savings").isEmpty())
                .andExpect(jsonPath("$.items.length()").value(3))
                .andExpect(jsonPath("$.items[0].name").value("Support d'ordinateur pliable"))
                .andExpect(jsonPath("$.items[0].hotspot").isEmpty());
        mvc.perform(get("/api/products/{slug}", "pack-espace-autonome"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[1].name").value("Multiprise « Cube » design"))
                .andExpect(jsonPath("$.items[1].hotspot.x").value(42))
                .andExpect(jsonPath("$.items[1].hotspot.y").value(74))
                .andExpect(jsonPath("$.cover.alt").value(org.hamcrest.Matchers.startsWith("Le Pack Espace Autonome")));
        mvc.perform(get("/api/products/{slug}", "pack-meal-prep"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.priceTnd").value(99));
        // Un pack désactivé (brouillon) n'est plus public.
        jdbc.update("update product set active = false where sku = 'PACK-MEALPREP'");
        try {
            mvc.perform(get("/api/products/{slug}", "pack-meal-prep"))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.error").value("NOT_FOUND"));
        } finally {
            jdbc.update("update product set active = true where sku = 'PACK-MEALPREP'");
        }
        mvc.perform(get("/api/products/{slug}", "nope"))
                .andExpect(status().isNotFound());
    }

    @Test
    void mealPrepIsActiveAtMvpPriceWithItsCalculatorAndHotspots() throws Exception {
        long id = jdbc.queryForObject("select id from product where sku = 'PACK-MEALPREP'", Long.class);
        mvc.perform(get("/api/admin/products/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(true))
                .andExpect(jsonPath("$.priceTnd").value(99))
                .andExpect(jsonPath("$.slug").value("pack-meal-prep"))
                .andExpect(jsonPath("$.savings.question").value("Combien tu dépenses à midi ?"))
                .andExpect(jsonPath("$.savings.min").value(6))
                .andExpect(jsonPath("$.savings.max").value(20))
                .andExpect(jsonPath("$.savings.step").value(1))
                .andExpect(jsonPath("$.savings.defaultValue").value(10))
                .andExpect(jsonPath("$.savings.homeCostPerDay").value(3))
                .andExpect(jsonPath("$.savings.daysPerMonth").value(22))
                .andExpect(jsonPath("$.items[0].name").value("Lunchbox chauffante électrique"))
                .andExpect(jsonPath("$.items[0].hotspot.x").value(48))
                .andExpect(jsonPath("$.items[2].hotspot.y").value(84))
                .andExpect(jsonPath("$.cover.contentType").value("image/png"));
    }

    @Test
    void publicCatalogNeedsNoTokenButAdminDoes() throws Exception {
        mvc.perform(get("/api/admin/products")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/admin/media")).andExpect(status().isUnauthorized());
    }

    // ---------------------------------------------------------------- admin CRUD

    private Map<String, Object> input(String name) {
        Map<String, Object> m = new HashMap<>();
        m.put("name", name);
        m.put("tagline", "Une promesse claire pour tester.");
        m.put("audience", "Testeurs");
        m.put("priceTnd", 59);
        m.put("active", true);
        return m;
    }

    private ResultActions createProduct(Map<String, Object> body) throws Exception {
        return mvc.perform(post("/api/admin/products").header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON).content(json(body)));
    }

    private JsonNode created(String name) throws Exception {
        return body(createProduct(input(name)).andExpect(status().isCreated()).andReturn());
    }

    @Test
    void createGeneratesSlugAndSkuAndUpdates() throws Exception {
        int n = SEQ.incrementAndGet();
        JsonNode p = created("Le Pack Été Ça Marche " + n);
        long id = p.get("id").asLong();
        assertThat(p.get("slug").asText()).isEqualTo("le-pack-ete-ca-marche-" + n);
        assertThat(p.get("sku").asText()).isEqualTo("PACK-LE-PACK-ETE-CA-MARCHE-" + n);
        assertThat(p.get("active").asBoolean()).isTrue();
        assertThat(p.get("priceTnd").decimalValue()).isEqualByComparingTo("59");
        assertThat(p.get("completePacks").asInt()).isZero();
        assertThat(p.get("assemblablePacks").asInt()).isZero();
        assertThat(p.get("ordersThisMonth").asLong()).isZero();
        assertThat(p.get("availability").asText()).isEqualTo("MADE_TO_ORDER");
        assertThat(p.get("createdAt").asText()).isNotBlank();

        // Visible publiquement.
        mvc.perform(get("/api/products/{slug}", p.get("slug").asText())).andExpect(status().isOk());

        Map<String, Object> upd = input("Pack renommé " + n);
        upd.put("priceTnd", 64.5);
        upd.put("badge", "Nouveau");
        upd.put("savings", Map.of("title", "Calcule tes économies", "question", "Combien tu dépenses ?",
                "min", 1, "max", 5, "step", 0.5, "defaultValue", 2, "homeCostPerDay", 0, "daysPerMonth", 30));
        mvc.perform(put("/api/admin/products/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(json(upd)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Pack renommé " + n))
                // un renommage sans slug explicite garde le lien public
                .andExpect(jsonPath("$.slug").value("le-pack-ete-ca-marche-" + n))
                .andExpect(jsonPath("$.priceTnd").value(64.5))
                .andExpect(jsonPath("$.badge").value("Nouveau"))
                .andExpect(jsonPath("$.savings.step").value(0.5));

        // Bad savings + bad hotspot-less inputs
        Map<String, Object> bad = input("Pack " + n);
        bad.put("savings", Map.of("title", "x", "question", "y", "min", 5, "max", 1, "step", 0,
                "defaultValue", 9, "homeCostPerDay", -1, "daysPerMonth", 40));
        mvc.perform(put("/api/admin/products/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(json(bad)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errors['savings.min']").isNotEmpty())
                .andExpect(jsonPath("$.errors['savings.step']").isNotEmpty())
                .andExpect(jsonPath("$.errors['savings.daysPerMonth']").isNotEmpty());
    }

    @Test
    void validationSlugUniquenessAndActivationWithoutPrice() throws Exception {
        Map<String, Object> dup = input("Nimporte quoi");
        dup.put("slug", "pack-barista");
        createProduct(dup)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errors.slug").value("Ce lien est déjà utilisé par un autre pack."));

        Map<String, Object> free = input("Pack gratuit " + SEQ.incrementAndGet());
        free.put("priceTnd", 0);
        createProduct(free)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errors.priceTnd").value("Fixe un prix avant d'activer ce pack."));

        // Brouillon à 0 : accepté.
        free.put("active", false);
        createProduct(free).andExpect(status().isCreated()).andExpect(jsonPath("$.active").value(false));

        Map<String, Object> invalid = new HashMap<>();
        invalid.put("name", "ab");
        invalid.put("tagline", "abc");
        invalid.put("priceTnd", 12.3456);
        invalid.put("active", false);
        createProduct(invalid)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errors.name").isNotEmpty())
                .andExpect(jsonPath("$.errors.tagline").isNotEmpty())
                .andExpect(jsonPath("$.errors.priceTnd").isNotEmpty());

        Map<String, Object> dupSku = input("Pack sku " + SEQ.incrementAndGet());
        dupSku.put("sku", "pack-barista");
        createProduct(dupSku)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errors.sku").isNotEmpty());
    }

    @Test
    void deleteRefusedWhenOrdersExistAllowedOtherwise() throws Exception {
        long baristaId = jdbc.queryForObject("select id from product where sku = 'PACK-BARISTA'", Long.class);
        createOrder(freshPhone());
        mvc.perform(delete("/api/admin/products/{id}", baristaId).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("PRODUCT_HAS_ORDERS"))
                .andExpect(jsonPath("$.message").value("Ce pack a déjà des commandes : désactive-le plutôt."));

        long id = created("Pack à supprimer " + SEQ.incrementAndGet()).get("id").asLong();
        mvc.perform(delete("/api/admin/products/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/admin/products/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isNotFound());
    }

    @Test
    void onlyOneFeaturedAndReorder() throws Exception {
        long baristaId = jdbc.queryForObject("select id from product where sku = 'PACK-BARISTA'", Long.class);
        long id = created("Pack phare temporaire " + SEQ.incrementAndGet()).get("id").asLong();
        try {
            Map<String, Object> feat = input("Pack phare temporaire bis");
            feat.put("featured", true);
            mvc.perform(put("/api/admin/products/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer(token))
                            .contentType(MediaType.APPLICATION_JSON).content(json(feat)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.featured").value(true));
            assertThat(jdbc.queryForObject("select count(*) from product where featured", Integer.class)).isEqualTo(1);
            assertThat(jdbc.queryForObject("select featured from product where id = ?", Boolean.class, baristaId))
                    .isFalse();
        } finally {
            jdbc.update("update product set featured = false where id = ?", id);
            jdbc.update("update product set featured = true where id = ?", baristaId);
        }

        List<Long> ids = jdbc.queryForList("select id from product order by sort_order, id", Long.class);
        List<Long> reversed = new java.util.ArrayList<>(ids);
        java.util.Collections.reverse(reversed);
        try {
            mvc.perform(put("/api/admin/products/order").header(HttpHeaders.AUTHORIZATION, bearer(token))
                            .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("ids", reversed))))
                    .andExpect(status().isNoContent());
            JsonNode list = body(mvc.perform(get("/api/admin/products").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                    .andExpect(status().isOk()).andReturn());
            assertThat(list.get(0).get("id").asLong()).isEqualTo(reversed.get(0));
            assertThat(list.get(0).get("sortOrder").asInt()).isZero();
        } finally {
            mvc.perform(put("/api/admin/products/order").header(HttpHeaders.AUTHORIZATION, bearer(token))
                    .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("ids", ids))));
        }
        mvc.perform(put("/api/admin/products/order").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("ids", List.of(999_999)))))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void coverGalleryItemsAndHotspots() throws Exception {
        long id = created("Pack composé " + SEQ.incrementAndGet()).get("id").asLong();
        long media1 = jdbc.queryForObject("select min(id) from media", Long.class);
        long media2 = jdbc.queryForObject("select max(id) from media", Long.class);
        long moka = jdbc.queryForObject("select id from stock_item where name = 'Cafetière italienne (Moka)'", Long.class);
        long gourde = jdbc.queryForObject("select id from stock_item where name = 'Grande gourde isotherme'", Long.class);

        mvc.perform(put("/api/admin/products/{id}/cover", id).header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("mediaId", media1))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cover.id").value(media1));
        mvc.perform(put("/api/admin/products/{id}/cover", id).header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"mediaId\": null}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cover").isEmpty());
        mvc.perform(put("/api/admin/products/{id}/cover", id).header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("mediaId", 999_999))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errors.mediaId").value("Photo introuvable."));

        mvc.perform(put("/api/admin/products/{id}/gallery", id).header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("mediaIds", List.of(media2, media1)))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.gallery.length()").value(media1 == media2 ? 1 : 2))
                .andExpect(jsonPath("$.gallery[0].id").value(media2));

        Map<String, Object> it1 = new HashMap<>();
        it1.put("stockItemId", gourde);
        it1.put("quantity", 2);
        it1.put("gift", false);
        it1.put("hotspot", Map.of("x", 12.5, "y", 80));
        Map<String, Object> it2 = new HashMap<>();
        it2.put("stockItemId", moka);
        it2.put("quantity", 1);
        it2.put("gift", true);
        it2.put("hotspot", null);
        mvc.perform(put("/api/admin/products/{id}/items", id).header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("items", List.of(it1, it2)))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.items[0].stockItemId").value(gourde))
                .andExpect(jsonPath("$.items[0].quantity").value(2))
                .andExpect(jsonPath("$.items[0].hotspot.x").value(12.5))
                .andExpect(jsonPath("$.items[0].hotspot.y").value(80))
                .andExpect(jsonPath("$.items[0].description").value("1 L en acier inoxydable."))
                .andExpect(jsonPath("$.items[1].gift").value(true))
                .andExpect(jsonPath("$.items[1].hotspot").isEmpty());

        // Usage visible dans le stock.
        JsonNode stock = body(mvc.perform(get("/api/admin/stock").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andReturn());
        boolean found = false;
        for (JsonNode item : stock.get("items")) {
            if (item.get("id").asLong() == gourde) {
                for (JsonNode u : item.get("usedIn")) {
                    found |= u.get("productId").asLong() == id && u.get("perPack").asInt() == 2;
                }
            }
        }
        assertThat(found).isTrue();

        Map<String, Object> badSpot = new HashMap<>(it1);
        badSpot.put("hotspot", Map.of("x", 101, "y", 50));
        Map<String, Object> badItem = Map.of("stockItemId", 999_999);
        mvc.perform(put("/api/admin/products/{id}/items", id).header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("items", List.of(badSpot, badItem, it1)))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errors['items[0].hotspot']").isNotEmpty())
                .andExpect(jsonPath("$.errors['items[1].stockItemId']").value("Pièce introuvable."))
                .andExpect(jsonPath("$.errors['items[2].stockItemId']").value("Cette pièce est déjà dans le pack."));
    }

    // ---------------------------------------------------------------- seeder

    @Test
    void photoSeederIsIdempotentAndRespectsRemovedCovers() {
        Long before = jdbc.queryForObject("select count(*) from media", Long.class);
        assertThat(seeder.seed()).isZero();
        assertThat(jdbc.queryForObject("select count(*) from media", Long.class)).isEqualTo(before);
        // 4 photos fournies → les 4 packs sont amorcés avec une photo principale.
        assertThat(jdbc.queryForObject(
                "select count(*) from product where photo_seeded and cover_media_id is not null and sku in "
                        + "('PACK-BARISTA','PACK-SETUP','PACK-ESPACE','PACK-MEALPREP')",
                Integer.class)).isEqualTo(4);
        // Photo retirée par l'admin : pas réimportée.
        Long cover = jdbc.queryForObject("select cover_media_id from product where sku = 'PACK-MEALPREP'", Long.class);
        jdbc.update("update product set cover_media_id = null where sku = 'PACK-MEALPREP'");
        try {
            assertThat(seeder.seed()).isZero();
            assertThat(jdbc.queryForObject("select cover_media_id from product where sku = 'PACK-MEALPREP'",
                    Long.class)).isNull();
        } finally {
            jdbc.update("update product set cover_media_id = ? where sku = 'PACK-MEALPREP'", cover);
        }
    }
}
