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
    private final Clock clock;

    public StatsController(StatsService stats, Clock clock) {
        this.stats = stats;
        this.clock = clock;
    }

    @GetMapping("/kpis")
    public StatsDtos.Kpis kpis(@RequestParam(name = "month", required = false) String month) {
        return stats.kpis(MonthRange.parseOrCurrent(month, clock));
    }

    @GetMapping("/finance")
    public StatsDtos.Finance finance(@RequestParam(name = "month", required = false) String month) {
        return stats.finance(MonthRange.parseOrCurrent(month, clock));
    }

    @GetMapping("/governorates")
    public List<StatsDtos.GovernorateRow> governorates(@RequestParam(name = "month", required = false) String month) {
        return stats.governorates(MonthRange.parseOrCurrent(month, clock));
    }
}
