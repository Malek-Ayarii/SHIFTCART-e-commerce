package com.shiftcart.agents;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.shiftcart.IntegrationTest;
import com.shiftcart.agents.AgentRuntime.AgentUnavailableException;
import com.shiftcart.agents.AgentRuntime.Outcome;
import com.shiftcart.agents.AgentRuntime.Run;
import com.shiftcart.agents.AgentRuntime.Step;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

/** API des agents : roster, validation, fils de discussion. Le modèle est simulé (aucun appel réseau). */
class AgentApiTest extends IntegrationTest {

    @MockitoBean
    AgentRuntime runtime;

    private String token;

    @BeforeEach
    void setUp() throws Exception {
        token = adminToken();
        when(runtime.configured()).thenReturn(true);
        when(runtime.model()).thenReturn("claude-opus-5-5");
    }

    private JsonNode postJson(String path, Map<String, Object> payload, int expected) throws Exception {
        return body(mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(json(payload))
                        .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().is(expected)).andReturn());
    }

    @Test
    void rosterListsTheAssistantAndSevenSpecialists() throws Exception {
        JsonNode r = body(mvc.perform(get("/api/admin/agents").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk()).andReturn());
        assertThat(r.get("configured").asBoolean()).isTrue();
        JsonNode agents = r.get("agents");
        assertThat(agents).hasSize(8);
        assertThat(agents.get(0).get("key").asText()).isEqualTo("assistant");
        assertThat(agents.get(0).get("coordinator").asBoolean()).isTrue();
        List<String> keys = new java.util.ArrayList<>();
        agents.forEach(a -> keys.add(a.get("key").asText()));
        assertThat(keys).containsExactly("assistant", "social", "content", "design", "developer", "security", "sales",
                "finance");
    }

    @Test
    void askRunsTheAssistantAndStoresTheExchangeWithItsTrace() throws Exception {
        when(runtime.ask(eq(AgentKind.ASSISTANT), anyList(), anyString(), any(Run.class))).thenAnswer(inv -> {
            Run run = inv.getArgument(3);
            Step step = new Step("consult", "assistant", "sales", 1, "Sales manager", "Quel pack pousser ?");
            step.answer = "Le Pack Barista.";
            step.status = "ok";
            run.trace.add(step);
            return new Outcome("### Plan\n- Pousse le **Pack Barista**.", "ok");
        });

        JsonNode ex = postJson("/api/admin/agents/threads", Map.of("content", "Quel pack mettre en avant ?\nMerci"),
                200);
        long threadId = ex.get("thread").get("id").asLong();
        assertThat(ex.get("thread").get("title").asText()).isEqualTo("Quel pack mettre en avant ?");
        assertThat(ex.get("question").get("role").asText()).isEqualTo("user");
        assertThat(ex.get("answer").get("agent").asText()).isEqualTo("assistant");
        assertThat(ex.get("answer").get("trace").get(0).get("to").asText()).isEqualTo("sales");
        assertThat(ex.get("answer").get("trace").get(0).get("answer").asText()).isEqualTo("Le Pack Barista.");

        // Réponse directe d'un spécialiste dans le même fil.
        when(runtime.ask(eq(AgentKind.FINANCE), anyList(), anyString(), any(Run.class)))
                .thenReturn(new Outcome("Marge : [À DÉFINIR].", "ok"));
        postJson("/api/admin/agents/threads/" + threadId + "/messages",
                Map.of("content", "Et la marge ?", "agent", "finance"), 200);

        JsonNode detail = body(mvc.perform(get("/api/admin/agents/threads/" + threadId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk()).andReturn());
        assertThat(detail.get("messages")).hasSize(4);
        assertThat(detail.get("messages").get(3).get("agent").asText()).isEqualTo("finance");

        JsonNode list = body(mvc.perform(get("/api/admin/agents/threads").header(HttpHeaders.AUTHORIZATION,
                bearer(token))).andExpect(status().isOk()).andReturn());
        assertThat(list.get(0).get("id").asLong()).isEqualTo(threadId);
        assertThat(list.get(0).get("lastAgent").asText()).isEqualTo("finance");

        mvc.perform(delete("/api/admin/agents/threads/" + threadId).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/admin/agents/threads/" + threadId).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isNotFound());
    }

    @Test
    void validatesTheQuestionAndTheAgent() throws Exception {
        postJson("/api/admin/agents/threads", Map.of("content", "   "), 400);
        postJson("/api/admin/agents/threads", Map.of("content", "Salut", "agent", "ceo"), 400);
        postJson("/api/admin/agents/threads", Map.of("content", "x".repeat(4001)), 400);
        postJson("/api/admin/agents/threads/999999/messages", Map.of("content", "Salut"), 404);
    }

    @Test
    void unavailableModelIs503AndCreatesNoThread() throws Exception {
        when(runtime.ask(any(), anyList(), anyString(), any(Run.class)))
                .thenThrow(new AgentUnavailableException("AGENTS_NOT_CONFIGURED", "Pas de clé."));
        Long before = jdbc.queryForObject("select count(*) from agent_thread", Long.class);
        mvc.perform(post("/api/admin/agents/threads").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("content", "Salut"))).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.error").value("AGENTS_NOT_CONFIGURED"));
        assertThat(jdbc.queryForObject("select count(*) from agent_thread", Long.class)).isEqualTo(before);
    }

    @Test
    void threadsOfAnotherTeamMemberAreInvisible() throws Exception {
        jdbc.update("INSERT INTO admin_user (email, name, password_hash, role) VALUES ('autre@test.tn', 'Autre', 'x', "
                + "'AGENT') ON CONFLICT (email) DO NOTHING");
        Long other = jdbc.queryForObject("select id from admin_user where email = 'autre@test.tn'", Long.class);
        jdbc.update("INSERT INTO agent_thread (title, created_by) VALUES ('Privé', ?)", other);
        Long id = jdbc.queryForObject("select max(id) from agent_thread where created_by = ?", Long.class, other);
        mvc.perform(get("/api/admin/agents/threads/" + id).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isNotFound());
        mvc.perform(delete("/api/admin/agents/threads/" + id).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isNotFound());
    }

    @Test
    void requiresAuthentication() throws Exception {
        mvc.perform(get("/api/admin/agents")).andExpect(status().isUnauthorized());
    }
}
