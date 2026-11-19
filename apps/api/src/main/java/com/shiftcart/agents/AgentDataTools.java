package com.shiftcart.agents;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shiftcart.catalog.AdminProductService;
import com.shiftcart.catalog.CatalogDtos.PackItem;
import com.shiftcart.catalog.CatalogDtos.ProductAdmin;
import com.shiftcart.catalog.CatalogDtos.ProductPublic;
import com.shiftcart.common.error.ApiException;
import com.shiftcart.common.time.MonthRange;
import com.shiftcart.stats.StatsService;
import com.shiftcart.stock.StockDtos.StockResponse;
import com.shiftcart.stock.StockService;
import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

/**
 * Exécute les outils de lecture des agents en réutilisant les services existants. Résultats en JSON compact,
 * sans médias ni donnée personnelle. Une erreur renvoie un message lisible (le modèle peut corriger le mois).
 */
@Component
public class AgentDataTools {

    private final StatsService stats;
    private final StockService stock;
    private final AdminProductService products;
    private final ObjectMapper mapper;
    private final Clock clock;

    public AgentDataTools(StatsService stats, StockService stock, AdminProductService products, ObjectMapper mapper,
            Clock clock) {
        this.stats = stats;
        this.stock = stock;
        this.products = products;
        this.mapper = mapper;
        this.clock = clock;
    }

    /** Résultat d'un outil : texte JSON (ou message d'erreur) et drapeau d'erreur. */
    public record Result(String content, boolean error) {}

    public Result run(DataTool tool, Map<String, Object> input) {
        try {
            String month = input == null ? null : asString(input.get("month"));
            MonthRange range = MonthRange.parseOrCurrent(month, clock);
            Object data = switch (tool) {
                case KPIS -> stats.kpis(range, null);
                case FINANCE -> stats.finance(range, null);
                case DAILY -> stats.daily(range, null);
                case GOVERNORATES -> stats.governorates(range, null);
                case PACKS -> stats.products(range);
                case STOCK -> stockView(stock.get());
                case CATALOG -> products.list().stream().map(AgentDataTools::catalogView).toList();
            };
            Map<String, Object> wrapped = new LinkedHashMap<>();
            if (tool.monthParam()) {
                wrapped.put("month", range.label());
            }
            wrapped.put("data", data);
            return new Result(mapper.writeValueAsString(wrapped), false);
        } catch (ApiException e) {
            return new Result(e.getMessage(), true);
        } catch (JsonProcessingException | RuntimeException e) {
            return new Result("Données indisponibles pour le moment (" + e.getClass().getSimpleName() + ").", true);
        }
    }

    private static String asString(Object o) {
        return o == null ? null : o.toString();
    }

    private static Map<String, Object> catalogView(ProductAdmin p) {
        ProductPublic pp = p.product();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("name", pp.name());
        m.put("slug", pp.slug());
        m.put("priceTnd", pp.priceTnd());
        m.put("status", p.active() ? "actif" : "brouillon");
        m.put("featured", pp.featured());
        m.put("badge", pp.badge());
        m.put("tagline", pp.tagline());
        m.put("audience", pp.audience());
        m.put("description", pp.description());
        List<PackItem> items = pp.items() == null ? List.of() : pp.items();
        m.put("contents", items.stream()
                .map(i -> (i.quantity() > 1 ? i.quantity() + " × " : "") + i.name() + (i.gift() ? " (offert)" : ""))
                .toList());
        m.put("completePacksInStock", p.completePacks());
        m.put("ordersThisMonth", p.ordersThisMonth());
        return m;
    }

    private static Map<String, Object> stockView(StockResponse s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("carrierFeeTnd", s.carrierFeeTnd());
        m.put("lowStockAlert", s.alert());
        m.put("items", s.items().stream().map(i -> {
            Map<String, Object> it = new LinkedHashMap<>();
            it.put("name", i.name());
            it.put("quantity", i.quantity());
            it.put("threshold", i.threshold());
            it.put("status", i.status());
            it.put("unitCostTnd", i.unitCostTnd());
            return it;
        }).toList());
        m.put("packs", s.packs().stream().map(p -> {
            Map<String, Object> pk = new LinkedHashMap<>();
            pk.put("name", p.name());
            pk.put("active", p.active());
            pk.put("completePacks", p.completePacks());
            pk.put("assemblablePacks", p.assemblablePacks());
            pk.put("priceTnd", p.priceTnd());
            pk.put("cogsTnd", p.cogsTnd());
            pk.put("carrierFeeTnd", p.carrierFeeTnd());
            pk.put("marginTnd", p.marginTnd());
            pk.put("marginPct", p.marginPct());
            pk.put("alert", p.alert());
            return pk;
        }).toList());
        return m;
    }
}
