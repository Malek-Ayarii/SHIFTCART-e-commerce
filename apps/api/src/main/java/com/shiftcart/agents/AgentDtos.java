package com.shiftcart.agents;

import java.time.Instant;
import java.util.List;

/** Formes JSON des agents IA (docs/CONTRACT.md › Agents IA). */
public final class AgentDtos {

    private AgentDtos() {}

    /** {@code reads} = libellés des données que l'agent peut lire. */
    public record AgentInfo(String key, String label, String domain, String summary, List<String> reads,
            boolean coordinator) {}

    public record Roster(boolean configured, String model, List<AgentInfo> agents) {}

    public record ThreadSummary(long id, String title, String lastAgent, Instant createdAt, Instant updatedAt,
            long messages) {}

    public record TraceStep(String type, String from, String to, int depth, String label, String question,
            String answer, String status) {}

    public record MessageDto(long id, String role, String agent, String content, List<TraceStep> trace,
            String status, Instant createdAt) {}

    public record ThreadDetail(long id, String title, Instant createdAt, Instant updatedAt,
            List<MessageDto> messages) {}

    /** {@code agent} : clé d'un spécialiste pour lui parler directement ; vide = l'assistant oriente. */
    public record AskRequest(String content, String agent) {}

    /** Un échange : la question de l'équipe et la réponse de l'agent (avec sa trace). */
    public record Exchange(ThreadSummary thread, MessageDto question, MessageDto answer) {}
}
