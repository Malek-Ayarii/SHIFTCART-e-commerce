package com.shiftcart.agents;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.core.JsonValue;
import com.fasterxml.jackson.core.type.TypeReference;
import com.anthropic.errors.AnthropicIoException;
import com.anthropic.errors.AnthropicServiceException;
import com.anthropic.errors.NoCredentialsException;
import com.anthropic.errors.PermissionDeniedException;
import com.anthropic.errors.RateLimitException;
import com.anthropic.errors.UnauthorizedException;
import com.anthropic.models.messages.ContentBlockParam;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.MessageParam;
import com.anthropic.models.messages.OutputConfig;
import com.anthropic.models.messages.StopReason;
import com.anthropic.models.messages.Tool;
import com.anthropic.models.messages.ToolResultBlockParam;
import com.anthropic.models.messages.ToolUseBlock;
import com.shiftcart.common.config.AppProperties;
import com.shiftcart.common.config.CoreConfig;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Boucle d'agents sur l'API Messages d'Anthropic (SDK Java officiel).
 * <ul>
 *   <li>Profondeur 0 : l'agent choisi (l'assistant, ou un spécialiste interrogé directement).</li>
 *   <li>L'assistant consulte des spécialistes avec {@code consult_agent} (en parallèle si plusieurs) ;
 *       un spécialiste peut poser une question à un collègue avec {@code ask_colleague}.</li>
 *   <li>Profondeur maximale 2 : un collègue consulté ne consulte personne. 8 consultations au plus par demande.</li>
 * </ul>
 * Chaque consultation et chaque lecture de données est enregistrée dans la trace (affichée dans le back-office).
 * Les réponses de l'assistant sont rejouées telles quelles ({@link Message#toParam()}) dans la boucle d'outils.
 */
@Component
public class AgentRuntime {

    private static final Logger log = LoggerFactory.getLogger(AgentRuntime.class);

    static final int MAX_DEPTH = 2;
    static final int MAX_CONSULTS = 8;
    static final int MAX_TURNS = 8;
    static final long MAX_TOKENS = 16_000L;
    static final String CONSULT_TOOL = "consult_agent";
    static final String ASK_TOOL = "ask_colleague";
    static final String FALLBACK_BETA = "server-side-fallback-2026-07-01";

    private final AppProperties.Agents props;
    private final AgentDataTools data;
    private final Clock clock;
    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();
    private volatile AnthropicClient client;

    public AgentRuntime(AppProperties props, AgentDataTools data, Clock clock) {
        this.props = props.agents();
        this.data = data;
        this.clock = clock;
    }

    /** Une clé est fournie (config ou variable d'environnement), ou un profil {@code ant auth login} existe. */
    public boolean configured() {
        if (notBlank(props.apiKey()) || notBlank(System.getenv("ANTHROPIC_API_KEY"))
                || notBlank(System.getenv("ANTHROPIC_AUTH_TOKEN"))) {
            return true;
        }
        String home = System.getProperty("user.home");
        return home != null && Files.isDirectory(Path.of(home, ".config", "anthropic"));
    }

    public String model() {
        return props.model();
    }

    // ---------------------------------------------------------------- types

    /** Un tour d'historique (texte seul) : role = user | assistant. */
    public record Turn(String role, String text) {}

    /** Résultat d'un agent : texte final et statut (ok, refused, truncated). */
    public record Outcome(String text, String status) {}

    /** Étape de coordination, sérialisée telle quelle dans la trace. */
    public static final class Step {
        public final String type;
        public final String from;
        public final String to;
        public final int depth;
        public final String label;
        public final String question;
        public volatile String answer;
        public volatile String status;

        Step(String type, String from, String to, int depth, String label, String question) {
            this.type = type;
            this.from = from;
            this.to = to;
            this.depth = depth;
            this.label = label;
            this.question = question;
            this.status = "running";
        }
    }

    /** État partagé d'une demande (trace + compteur de consultations), sûr entre threads. */
    public static final class Run {
        final List<Step> trace = Collections.synchronizedList(new ArrayList<>());
        final AtomicInteger consults = new AtomicInteger();
        final String originalRequest;

        public Run(String originalRequest) {
            this.originalRequest = originalRequest;
        }

        public List<Step> trace() {
            synchronized (trace) {
                return List.copyOf(trace);
            }
        }
    }

    /** Erreur présentable à l'utilisateur (clé absente, quota…). */
    public static final class AgentUnavailableException extends RuntimeException {
        private static final long serialVersionUID = 1L;
        private final String code;

        AgentUnavailableException(String code, String message) {
            super(message);
            this.code = code;
        }

        public String code() {
            return code;
        }
    }

    // ---------------------------------------------------------------- run

    public Outcome ask(AgentKind agent, List<Turn> history, String userText, Run run) {
        List<MessageParam> messages = new ArrayList<>(historyParams(history));
        messages.add(MessageParam.ofUserOfContentBlockParams(List.of(text(userText))));
        return loop(agent, messages, run, 0);
    }

    private Outcome loop(AgentKind agent, List<MessageParam> messages, Run run, int depth) {
        boolean canConsult = agent.isAssistant() && depth == 0;
        boolean canAsk = !agent.isAssistant() && depth < MAX_DEPTH;
        List<Tool> tools = tools(agent, canConsult, canAsk);
        String system = agent.systemPrompt(canAsk, LocalDate.now(clock.withZone(CoreConfig.TUNIS)).toString());
        OutputConfig.Effort effort = depth >= MAX_DEPTH ? OutputConfig.Effort.LOW : OutputConfig.Effort.MEDIUM;

        String lastText = "";
        for (int turn = 0; turn < MAX_TURNS; turn++) {
            MessageCreateParams.Builder params = MessageCreateParams.builder()
                    .model(props.model())
                    .maxTokens(MAX_TOKENS)
                    .system(system)
                    .messages(messages)
                    .outputConfig(OutputConfig.builder().effort(effort).build());
            tools.forEach(params::addTool);
            if (props.fallbacks()) {
                // Repli serveur si le modèle refuse (catégories de sécurité) : routage automatique.
                params.putAdditionalHeader("anthropic-beta", FALLBACK_BETA)
                        .putAdditionalBodyProperty("fallbacks", JsonValue.from("default"));
            }

            Message response = call(params.build());
            messages.add(response.toParam());
            String text = textOf(response);
            if (!text.isBlank()) {
                lastText = text;
            }
            StopReason stop = response.stopReason().orElse(StopReason.END_TURN);

            if (StopReason.REFUSAL.equals(stop)) {
                return new Outcome(lastText.isBlank()
                        ? "Je ne peux pas traiter cette demande. Reformule-la ou précise ce dont tu as besoin."
                        : lastText, "refused");
            }
            if (StopReason.MAX_TOKENS.equals(stop)) {
                return new Outcome(lastText, "truncated");
            }
            if (!StopReason.TOOL_USE.equals(stop)) {
                return new Outcome(lastText, "ok");
            }

            List<ToolUseBlock> calls = response.content().stream()
                    .flatMap(b -> b.toolUse().stream())
                    .toList();
            messages.add(MessageParam.ofUserOfContentBlockParams(runTools(agent, calls, run, depth)));
        }
        return new Outcome(lastText.isBlank()
                ? "Je n'ai pas réussi à conclure. Reformule ta demande plus précisément."
                : lastText, "truncated");
    }

    /** Exécute tous les appels d'outils d'un tour (en parallèle) et renvoie leurs résultats dans l'ordre. */
    private List<ContentBlockParam> runTools(AgentKind agent, List<ToolUseBlock> calls, Run run, int depth) {
        List<Future<ContentBlockParam>> futures = new ArrayList<>();
        for (ToolUseBlock call : calls) {
            futures.add(executor.submit(() -> runTool(agent, call, run, depth)));
        }
        List<ContentBlockParam> results = new ArrayList<>(calls.size());
        for (int i = 0; i < futures.size(); i++) {
            try {
                results.add(futures.get(i).get());
            } catch (Exception e) {
                Throwable cause = e.getCause() == null ? e : e.getCause();
                if (cause instanceof AgentUnavailableException u) {
                    throw u;
                }
                results.add(toolResult(calls.get(i).id(), "Erreur interne de l'outil.", true));
            }
        }
        return results;
    }

    private ContentBlockParam runTool(AgentKind agent, ToolUseBlock call, Run run, int depth) {
        Map<String, Object> input = parseInput(call);
        String name = call.name();

        if (CONSULT_TOOL.equals(name) || ASK_TOOL.equals(name)) {
            AgentKind target = AgentKind.fromKey(asString(input.get("agent"))).orElse(null);
            String question = asString(input.get("question"));
            if (target == null || target.isAssistant() || target == agent) {
                return toolResult(call.id(), "Agent inconnu. Choisis parmi : " + specialistKeys(agent) + ".", true);
            }
            if (question == null || question.isBlank()) {
                return toolResult(call.id(), "La question est vide.", true);
            }
            if (run.consults.incrementAndGet() > MAX_CONSULTS) {
                return toolResult(call.id(),
                        "Limite de consultations atteinte pour cette demande : réponds avec ce que tu as.", true);
            }
            Step step = new Step("consult", agent.key(), target.key(), depth + 1, target.label(), question);
            run.trace.add(step);
            String brief = "Demande d'origine de l'équipe : " + run.originalRequest
                    + "\n\nQuestion de ton collègue (" + agent.label() + ") : " + question;
            List<MessageParam> sub = new ArrayList<>();
            sub.add(MessageParam.ofUserOfContentBlockParams(List.of(text(brief))));
            Outcome out = loop(target, sub, run, depth + 1);
            step.answer = out.text();
            step.status = out.status();
            return toolResult(call.id(), out.text().isBlank() ? "(pas de réponse)" : out.text(), false);
        }

        DataTool tool = DataTool.byToolName(name);
        if (tool == null || !agent.tools().contains(tool)) {
            return toolResult(call.id(), "Outil non disponible pour cet agent.", true);
        }
        AgentDataTools.Result result = data.run(tool, input);
        String month = asString(input.get("month"));
        Step step = new Step("data", agent.key(), null, depth, tool.traceLabel()
                + (tool.monthParam() && month != null && !month.isBlank() ? " (" + month + ")" : ""), null);
        step.status = result.error() ? "error" : "ok";
        run.trace.add(step);
        return toolResult(call.id(), result.content(), result.error());
    }

    // ---------------------------------------------------------------- tools

    private static List<Tool> tools(AgentKind agent, boolean canConsult, boolean canAsk) {
        List<Tool> tools = new ArrayList<>();
        for (DataTool t : agent.tools()) {
            Tool.InputSchema.Builder schema = Tool.InputSchema.builder();
            if (t.monthParam()) {
                schema.properties(Tool.InputSchema.Properties.builder()
                        .putAdditionalProperty("month", JsonValue.from(Map.of(
                                "type", "string",
                                "description", "Mois au format AAAA-MM. Omis = mois en cours.")))
                        .build());
            } else {
                schema.properties(Tool.InputSchema.Properties.builder().build());
            }
            tools.add(Tool.builder().name(t.toolName()).description(t.description()).inputSchema(schema.build())
                    .build());
        }
        if (canConsult) {
            tools.add(agentTool(CONSULT_TOOL, """
                    Consulte un spécialiste de l'équipe et reçois sa réponse. Pose une question précise et autonome \
                    (il ne voit pas la conversation, seulement la demande d'origine et ta question). Appelle plusieurs \
                    spécialistes dans le même tour s'ils sont indépendants. Spécialistes :
                    """ + roster(null), null));
        }
        if (canAsk) {
            tools.add(agentTool(ASK_TOOL, """
                    Pose une question à un collègue spécialiste quand une partie de la demande relève de son métier. \
                    Question précise et autonome. Collègues :
                    """ + roster(agent), agent));
        }
        return tools;
    }

    private static Tool agentTool(String name, String description, AgentKind exclude) {
        List<String> keys = AgentKind.specialists().stream().filter(a -> a != exclude).map(AgentKind::key).toList();
        return Tool.builder()
                .name(name)
                .description(description)
                .inputSchema(Tool.InputSchema.builder()
                        .properties(Tool.InputSchema.Properties.builder()
                                .putAdditionalProperty("agent", JsonValue.from(Map.of(
                                        "type", "string", "enum", keys,
                                        "description", "Clé du spécialiste à consulter.")))
                                .putAdditionalProperty("question", JsonValue.from(Map.of(
                                        "type", "string",
                                        "description", "La question, avec le contexte utile (chiffres, pack, objectif).")))
                                .build())
                        .required(List.of("agent", "question"))
                        .build())
                .build();
    }

    private static String roster(AgentKind exclude) {
        return AgentKind.specialists().stream()
                .filter(a -> a != exclude)
                .map(a -> "- " + a.key() + " (" + a.label() + ") : " + a.summary())
                .collect(Collectors.joining("\n"));
    }

    private static String specialistKeys(AgentKind exclude) {
        return AgentKind.specialists().stream().filter(a -> a != exclude).map(AgentKind::key)
                .collect(Collectors.joining(", "));
    }

    // ---------------------------------------------------------------- API

    private Message call(MessageCreateParams params) {
        try {
            return client().messages().create(params);
        } catch (NoCredentialsException e) {
            throw new AgentUnavailableException("AGENTS_NOT_CONFIGURED",
                    "Les agents IA ne sont pas configurés : ajoute AGENTS_API_KEY (ou ANTHROPIC_API_KEY) à l'API.");
        } catch (UnauthorizedException | PermissionDeniedException e) {
            log.warn("Agents: Anthropic API rejected the credentials (HTTP {})", e.statusCode());
            throw new AgentUnavailableException("AGENTS_AUTH",
                    "La clé de l'API Anthropic est refusée. Vérifie AGENTS_API_KEY.");
        } catch (RateLimitException e) {
            throw new AgentUnavailableException("AGENTS_RATE_LIMIT",
                    "Trop de demandes en même temps. Réessaie dans une minute.");
        } catch (AnthropicServiceException e) {
            log.warn("Agents: Anthropic API error HTTP {}", e.statusCode());
            throw new AgentUnavailableException("AGENTS_UPSTREAM",
                    "Le service IA a répondu une erreur (" + e.statusCode() + "). Réessaie.");
        } catch (AnthropicIoException e) {
            log.warn("Agents: network error calling Anthropic ({})", e.getClass().getSimpleName());
            throw new AgentUnavailableException("AGENTS_NETWORK",
                    "Le service IA est injoignable. Vérifie la connexion du serveur et réessaie.");
        }
    }

    private AnthropicClient client() {
        AnthropicClient c = client;
        if (c == null) {
            synchronized (this) {
                c = client;
                if (c == null) {
                    AnthropicOkHttpClient.Builder b = AnthropicOkHttpClient.builder().fromEnv()
                            .timeout(props.timeout())
                            .maxRetries(2);
                    if (notBlank(props.apiKey())) {
                        b.apiKey(props.apiKey());
                    }
                    if (notBlank(props.baseUrl())) {
                        b.baseUrl(props.baseUrl());
                    }
                    c = b.build();
                    client = c;
                }
            }
        }
        return c;
    }

    // ---------------------------------------------------------------- helpers

    /** Historique texte → messages alternés commençant par l'utilisateur (tours consécutifs fusionnés). */
    static List<MessageParam> historyParams(List<Turn> history) {
        List<Turn> merged = new ArrayList<>();
        for (Turn t : history) {
            if (t.text() == null || t.text().isBlank()) {
                continue;
            }
            if (merged.isEmpty() && !"user".equals(t.role())) {
                continue;
            }
            if (!merged.isEmpty() && merged.get(merged.size() - 1).role().equals(t.role())) {
                Turn last = merged.remove(merged.size() - 1);
                merged.add(new Turn(last.role(), last.text() + "\n\n" + t.text()));
            } else {
                merged.add(t);
            }
        }
        // Le nouveau message utilisateur suit : l'historique doit se terminer par l'assistant.
        if (!merged.isEmpty() && "user".equals(merged.get(merged.size() - 1).role())) {
            merged.remove(merged.size() - 1);
        }
        List<MessageParam> out = new ArrayList<>();
        for (Turn t : merged) {
            out.add("user".equals(t.role())
                    ? MessageParam.ofUserOfContentBlockParams(List.of(text(t.text())))
                    : MessageParam.ofAssistantOfContentBlockParams(List.of(text(t.text()))));
        }
        return out;
    }

    private static String textOf(Message m) {
        return m.content().stream()
                .flatMap(b -> b.text().stream())
                .map(t -> t.text())
                .collect(Collectors.joining("\n\n"))
                .trim();
    }

    private static ContentBlockParam text(String s) {
        return ContentBlockParam.ofText(com.anthropic.models.messages.TextBlockParam.builder().text(s).build());
    }

    private static ContentBlockParam toolResult(String id, String content, boolean error) {
        return ContentBlockParam.ofToolResult(ToolResultBlockParam.builder()
                .toolUseId(id)
                .content(content)
                .isError(error)
                .build());
    }

    private static Map<String, Object> parseInput(ToolUseBlock call) {
        try {
            Map<String, Object> m = call._input().convert(new TypeReference<Map<String, Object>>() {});
            return m == null ? Map.of() : m;
        } catch (RuntimeException e) {
            return Map.of();
        }
    }

    private static String asString(Object o) {
        return o == null ? null : o.toString();
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}
