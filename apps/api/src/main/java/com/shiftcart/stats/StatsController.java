package com.shiftcart.stats;

import com.shiftcart.common.time.MonthRange;
import java.time.Clock;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** {@code month=YYYY-MM}, défaut = mois courant (Africa/Tunis). */
@RestController
@RequestMapping("/api/admin/stats")
public class StatsController {

    private final StatsService stats;
    private final AnalyticsService analytics;
    private final Clock clock;

    public StatsController(StatsService stats, AnalyticsService analytics, Clock clock) {
        this.stats = stats;
        this.analytics = analytics;
        this.clock = clock;
    }

    /**
     * Analytique sur une période libre : {@code from}/{@code to} (AAAA-MM-JJ, inclus, heure de Tunis ; défaut =
     * 30 derniers jours), {@code granularity} = hour | day | week | month (défaut selon la durée), {@code productId},
     * {@code compareFrom}/{@code compareTo} = fenêtre de comparaison des KPI (défaut : la période précédente).
     */
    @GetMapping("/analytics")
    public StatsDtos.Analytics analytics(@RequestParam(name = "from", required = false) String from,
            @RequestParam(name = "to", required = false) String to,
            @RequestParam(name = "granularity", required = false) String granularity,
            @RequestParam(name = "productId", required = false) Long productId,
            @RequestParam(name = "compareFrom", required = false) String compareFrom,
            @RequestParam(name = "compareTo", required = false) String compareTo) {
        AnalyticsRange range = AnalyticsRange.parse(from, to, granularity, clock);
        return analytics.analytics(range, range.comparison(compareFrom, compareTo), productId);
    }

    @GetMapping("/kpis")
    public StatsDtos.Kpis kpis(@RequestParam(name = "month", required = false) String month,
            @RequestParam(name = "productId", required = false) Long productId) {
        return stats.kpis(MonthRange.parseOrCurrent(month, clock), productId);
    }

    @GetMapping("/finance")
    public StatsDtos.Finance finance(@RequestParam(name = "month", required = false) String month,
            @RequestParam(name = "productId", required = false) Long productId) {
        return stats.finance(MonthRange.parseOrCurrent(month, clock), productId);
    }

    @GetMapping("/governorates")
    public List<StatsDtos.GovernorateRow> governorates(@RequestParam(name = "month", required = false) String month,
            @RequestParam(name = "productId", required = false) Long productId) {
        return stats.governorates(MonthRange.parseOrCurrent(month, clock), productId);
    }

    @GetMapping("/daily")
    public List<StatsDtos.DayRow> daily(@RequestParam(name = "month", required = false) String month,
            @RequestParam(name = "productId", required = false) Long productId) {
        return stats.daily(MonthRange.parseOrCurrent(month, clock), productId);
    }

    /** Agenda : chaque jour de l'année {@code year} (défaut : année en cours, heure de Tunis). */
    @GetMapping("/calendar")
    public StatsDtos.Calendar calendar(@RequestParam(name = "year", required = false) Integer year,
            @RequestParam(name = "productId", required = false) Long productId) {
        int y = year == null ? java.time.Year.now(clock.withZone(com.shiftcart.common.config.CoreConfig.TUNIS)).getValue()
                : year;
        return stats.calendar(y, productId);
    }

    @GetMapping("/products")
    public List<StatsDtos.ProductRow> products(@RequestParam(name = "month", required = false) String month) {
        return stats.products(MonthRange.parseOrCurrent(month, clock));
    }
}
