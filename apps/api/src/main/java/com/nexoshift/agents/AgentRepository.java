package com.nexoshift.agents;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexoshift.agents.AgentDtos.MessageDto;
import com.nexoshift.agents.AgentDtos.ThreadSummary;
import com.nexoshift.agents.AgentDtos.TraceStep;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

/** Fils et messages des agents (JDBC). Chaque membre de l'équipe ne voit que ses propres fils. */
@Repository
public class AgentRepository {

    private static final TypeReference<List<TraceStep>> TRACE = new TypeReference<>() {};

    private static final String THREAD_SELECT = """
            SELECT t.id, t.title, t.created_at, t.updated_at,
                   (SELECT count(*) FROM agent_message m WHERE m.thread_id = t.id) AS messages,
                   (SELECT m.agent FROM agent_message m WHERE m.thread_id = t.id AND m.role = 'assistant'
                     ORDER BY m.id DESC LIMIT 1) AS last_agent
            FROM agent_thread t
            """;

    private static final String MESSAGE_SELECT = """
            SELECT id, role, agent, content, trace::text AS trace, status, created_at FROM agent_message
            """;

    private final NamedParameterJdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public AgentRepository(NamedParameterJdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    public long createThread(long userId, String title) {
        GeneratedKeyHolder keys = new GeneratedKeyHolder();
        jdbc.update("INSERT INTO agent_thread (title, created_by) VALUES (:title, :user)",
                new MapSqlParameterSource().addValue("title", title).addValue("user", userId), keys,
                new String[] {"id"});
        return keys.getKey().longValue();
    }

    public List<ThreadSummary> threads(long userId) {
        return jdbc.query(THREAD_SELECT + " WHERE t.created_by = :user ORDER BY t.updated_at DESC, t.id DESC LIMIT 100",
                new MapSqlParameterSource("user", userId), (rs, i) -> summary(rs));
    }

    public Optional<ThreadSummary> thread(long id, long userId) {
        return jdbc.query(THREAD_SELECT + " WHERE t.id = :id AND t.created_by = :user",
                new MapSqlParameterSource().addValue("id", id).addValue("user", userId),
                (rs, i) -> summary(rs)).stream().findFirst();
    }

    public List<MessageDto> messages(long threadId) {
        return jdbc.query(MESSAGE_SELECT + " WHERE thread_id = :thread ORDER BY id",
                new MapSqlParameterSource("thread", threadId), (rs, i) -> message(rs));
    }

    public MessageDto addMessage(long threadId, String role, String agent, String content, List<TraceStep> trace,
            String status) {
        String traceJson = null;
        if (trace != null && !trace.isEmpty()) {
            try {
                traceJson = mapper.writeValueAsString(trace);
            } catch (JsonProcessingException e) {
                traceJson = null;
            }
        }
        GeneratedKeyHolder keys = new GeneratedKeyHolder();
        jdbc.update("""
                INSERT INTO agent_message (thread_id, role, agent, content, trace, status)
                VALUES (:thread, :role, :agent, :content, CAST(:trace AS jsonb), :status)
                """, new MapSqlParameterSource()
                .addValue("thread", threadId).addValue("role", role).addValue("agent", agent)
                .addValue("content", content).addValue("trace", traceJson).addValue("status", status),
                keys, new String[] {"id"});
        jdbc.update("UPDATE agent_thread SET updated_at = now() WHERE id = :id",
                new MapSqlParameterSource("id", threadId));
        long id = keys.getKey().longValue();
        return jdbc.query(MESSAGE_SELECT + " WHERE id = :id", new MapSqlParameterSource("id", id),
                (rs, i) -> message(rs)).get(0);
    }

    public boolean deleteThread(long id, long userId) {
        return jdbc.update("DELETE FROM agent_thread WHERE id = :id AND created_by = :user",
                new MapSqlParameterSource().addValue("id", id).addValue("user", userId)) > 0;
    }

    private static ThreadSummary summary(ResultSet rs) throws SQLException {
        return new ThreadSummary(rs.getLong("id"), rs.getString("title"), rs.getString("last_agent"),
                rs.getTimestamp("created_at").toInstant(), rs.getTimestamp("updated_at").toInstant(),
                rs.getLong("messages"));
    }

    private MessageDto message(ResultSet rs) throws SQLException {
        String raw = rs.getString("trace");
        List<TraceStep> trace = List.of();
        if (raw != null) {
            try {
                trace = mapper.readValue(raw, TRACE);
            } catch (JsonProcessingException e) {
                trace = List.of();
            }
        }
        return new MessageDto(rs.getLong("id"), rs.getString("role"), rs.getString("agent"), rs.getString("content"),
                trace, rs.getString("status"), rs.getTimestamp("created_at").toInstant());
    }
}
