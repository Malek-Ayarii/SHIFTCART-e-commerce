package com.shiftcart.agents;

import static org.assertj.core.api.Assertions.assertThat;

import com.anthropic.models.messages.MessageParam;
import com.shiftcart.agents.AgentRuntime.Turn;
import java.util.List;
import org.junit.jupiter.api.Test;

class AgentRuntimeTest {

    @Test
    void historyStartsWithUserAlternatesAndEndsWithAssistant() {
        List<MessageParam> p = AgentRuntime.historyParams(List.of(
                new Turn("assistant", "orphelin"),
                new Turn("user", "Q1"),
                new Turn("user", "Q1 bis"),
                new Turn("assistant", "R1"),
                new Turn("assistant", ""),
                new Turn("user", "Q2 sans réponse")));
        assertThat(p).hasSize(2);
        assertThat(p.get(0).isUser()).isTrue();
        assertThat(p.get(1).isAssistant()).isTrue();
    }

    @Test
    void everySpecialistHasAPromptAndOnlyTheAssistantCoordinates() {
        assertThat(AgentKind.specialists()).hasSize(7);
        for (AgentKind a : AgentKind.values()) {
            String prompt = a.systemPrompt(true, "2026-11-19");
            assertThat(prompt).contains("NEXO SHIFT").contains("2026-11-19");
            assertThat(prompt.contains("ask_colleague")).isEqualTo(!a.isAssistant());
        }
        assertThat(AgentKind.fromKey(" Finance ")).contains(AgentKind.FINANCE);
        assertThat(AgentKind.fromKey("ceo")).isEmpty();
    }

    @Test
    void threadTitleIsTheFirstLineCappedAt80() {
        assertThat(AgentService.title("  Bonjour\nla suite")).isEqualTo("Bonjour");
        assertThat(AgentService.title("a".repeat(120))).hasSize(80).endsWith("…");
    }
}
