package com.shiftcart.agents;

import com.shiftcart.agents.AgentDtos.AgentInfo;
import com.shiftcart.agents.AgentDtos.AskRequest;
import com.shiftcart.agents.AgentDtos.Exchange;
import com.shiftcart.agents.AgentDtos.MessageDto;
import com.shiftcart.agents.AgentDtos.Roster;
import com.shiftcart.agents.AgentDtos.ThreadDetail;
import com.shiftcart.agents.AgentDtos.ThreadSummary;
import com.shiftcart.agents.AgentDtos.TraceStep;
import com.shiftcart.agents.AgentRuntime.AgentUnavailableException;
import com.shiftcart.agents.AgentRuntime.Outcome;
import com.shiftcart.agents.AgentRuntime.Run;
import com.shiftcart.agents.AgentRuntime.Turn;
import com.shiftcart.common.error.ApiException;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/**
 * Fils de discussion avec les agents. L'appel au modèle se fait hors transaction (il peut durer) ; la question et la
 * réponse ne sont enregistrées qu'une fois la réponse obtenue. Une seule demande en cours par membre de l'équipe.
 */
@Service
public class AgentService {

    static final int MAX_CONTENT = 4000;
    static final int HISTORY_TURNS = 12;

    private final AgentRuntime runtime;
    private final AgentRepository repo;
    private final Set<Long> busy = ConcurrentHashMap.newKeySet();

    public AgentService(AgentRuntime runtime, AgentRepository repo) {
        this.runtime = runtime;
        this.repo = repo;
    }

    public Roster roster() {
        List<AgentInfo> agents = java.util.Arrays.stream(AgentKind.values())
                .map(a -> new AgentInfo(a.key(), a.label(), a.domain(), a.summary(),
                        a.tools().stream().map(DataTool::traceLabel).toList(), a.isAssistant()))
                .toList();
        return new Roster(runtime.configured(), runtime.model(), agents);
    }

    public List<ThreadSummary> threads(long userId) {
        return repo.threads(userId);
    }

    public ThreadDetail thread(long id, long userId) {
        ThreadSummary t = repo.thread(id, userId).orElseThrow(() -> ApiException.notFound("Conversation introuvable."));
        return new ThreadDetail(t.id(), t.title(), t.createdAt(), t.updatedAt(), repo.messages(id));
    }

    public void delete(long id, long userId) {
        if (!repo.deleteThread(id, userId)) {
            throw ApiException.notFound("Conversation introuvable.");
        }
    }

    /** {@code threadId} null = nouvelle conversation (créée seulement si l'agent a répondu). */
    public Exchange ask(Long threadId, AskRequest body, long userId) {
        String content = body == null || body.content() == null ? "" : body.content().trim();
        if (content.isEmpty()) {
            throw ApiException.badRequest("Écris ta question.");
        }
        if (content.length() > MAX_CONTENT) {
            throw ApiException.badRequest("Ta question dépasse " + MAX_CONTENT + " caractères : raccourcis-la.");
        }
        AgentKind agent = body.agent() == null || body.agent().isBlank() ? AgentKind.ASSISTANT
                : AgentKind.fromKey(body.agent()).orElseThrow(() -> ApiException.badRequest("Agent inconnu."));

        List<Turn> history = List.of();
        if (threadId != null) {
            repo.thread(threadId, userId).orElseThrow(() -> ApiException.notFound("Conversation introuvable."));
            List<MessageDto> previous = repo.messages(threadId).stream()
                    .filter(m -> "ok".equals(m.status()) || "truncated".equals(m.status()) || "user".equals(m.role()))
                    .toList();
            history = previous.subList(Math.max(0, previous.size() - HISTORY_TURNS), previous.size()).stream()
                    .map(m -> new Turn(m.role(), m.content()))
                    .toList();
        }

        if (!busy.add(userId)) {
            throw ApiException.conflict("AGENT_BUSY", "Une demande est déjà en cours : attends sa réponse.");
        }
        Outcome outcome;
        Run run = new Run(content);
        try {
            outcome = runtime.ask(agent, history, content, run);
        } catch (AgentUnavailableException e) {
            HttpStatus status = "AGENTS_RATE_LIMIT".equals(e.code()) ? HttpStatus.TOO_MANY_REQUESTS
                    : HttpStatus.SERVICE_UNAVAILABLE;
            throw new ApiException(status, e.code(), e.getMessage());
        } finally {
            busy.remove(userId);
        }

        long id = threadId != null ? threadId : repo.createThread(userId, title(content));
        MessageDto question = repo.addMessage(id, "user", agent.key(), content, List.of(), "ok");
        List<TraceStep> trace = run.trace().stream()
                .map(s -> new TraceStep(s.type, s.from, s.to, s.depth, s.label, s.question, s.answer, s.status))
                .toList();
        String text = outcome.text().isBlank() ? "Je n'ai pas de réponse à te proposer pour l'instant." : outcome.text();
        MessageDto answer = repo.addMessage(id, "assistant", agent.key(), text, trace, outcome.status());
        ThreadSummary summary = repo.thread(id, userId).orElseThrow();
        return new Exchange(summary, question, answer);
    }

    /** Titre lisible : première ligne de la question, 80 caractères au plus. */
    static String title(String content) {
        String line = content.strip().lines().findFirst().orElse("Nouvelle conversation").strip();
        return line.length() <= 80 ? line : line.substring(0, 79).strip() + "…";
    }
}
