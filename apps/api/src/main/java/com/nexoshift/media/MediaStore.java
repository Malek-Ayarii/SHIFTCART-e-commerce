package com.nexoshift.media;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Accès JDBC à la table {@code media}. Les octets ne sont lus que par {@link #content(long)} : les listes de
 * packs ne chargent que les métadonnées.
 */
@Repository
public class MediaStore {

    private static final String META_COLUMNS = "id, content_type, width, height, alt, sha256";

    private final NamedParameterJdbcTemplate jdbc;

    public MediaStore(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Métadonnées d'un média (sans les octets). */
    public record MediaMeta(long id, String contentType, Integer width, Integer height, String alt, String sha256) {

        public MediaDto toDto() {
            return new MediaDto(id, MediaDto.urlOf(id), contentType, width, height, alt);
        }
    }

    /** Octets + type + empreinte (pour l'ETag). */
    public record MediaContent(byte[] data, String contentType, String sha256) {}

    public long insert(byte[] data, String contentType, Integer width, Integer height, String alt, String sha256,
            Instant now) {
        Long id = jdbc.queryForObject("""
                INSERT INTO media (data, content_type, size_bytes, width, height, alt, sha256, created_at)
                VALUES (:data, :type, :size, :width, :height, :alt, :sha, :now)
                RETURNING id
                """,
                new MapSqlParameterSource()
                        .addValue("data", data)
                        .addValue("type", contentType)
                        .addValue("size", data.length)
                        .addValue("width", width, java.sql.Types.INTEGER)
                        .addValue("height", height, java.sql.Types.INTEGER)
                        .addValue("alt", alt, java.sql.Types.VARCHAR)
                        .addValue("sha", sha256)
                        .addValue("now", Timestamp.from(now)),
                Long.class);
        if (id == null) {
            throw new IllegalStateException("media insert returned no id");
        }
        return id;
    }

    public Optional<MediaMeta> find(long id) {
        return jdbc.query("SELECT " + META_COLUMNS + " FROM media WHERE id = :id",
                new MapSqlParameterSource("id", id), MediaStore::meta).stream().findFirst();
    }

    public Map<Long, MediaMeta> findAll(Collection<Long> ids) {
        Map<Long, MediaMeta> out = new HashMap<>();
        if (ids == null || ids.isEmpty()) {
            return out;
        }
        List<MediaMeta> rows = jdbc.query("SELECT " + META_COLUMNS + " FROM media WHERE id IN (:ids)",
                new MapSqlParameterSource("ids", ids), MediaStore::meta);
        rows.forEach(m -> out.put(m.id(), m));
        return out;
    }

    public Optional<MediaContent> content(long id) {
        return jdbc.query("SELECT data, content_type, sha256 FROM media WHERE id = :id",
                new MapSqlParameterSource("id", id),
                (rs, i) -> new MediaContent(rs.getBytes("data"), rs.getString("content_type"), rs.getString("sha256")))
                .stream().findFirst();
    }

    public Optional<Long> findIdBySha256(String sha256) {
        return jdbc.query("SELECT id FROM media WHERE sha256 = :sha ORDER BY id LIMIT 1",
                new MapSqlParameterSource("sha", sha256), (rs, i) -> rs.getLong(1)).stream().findFirst();
    }

    public int updateAlt(long id, String alt) {
        return jdbc.update("UPDATE media SET alt = :alt WHERE id = :id",
                new MapSqlParameterSource().addValue("id", id).addValue("alt", alt, java.sql.Types.VARCHAR));
    }

    private static MediaMeta meta(ResultSet rs, int i) throws SQLException {
        return new MediaMeta(rs.getLong("id"), rs.getString("content_type"), (Integer) rs.getObject("width"),
                (Integer) rs.getObject("height"), rs.getString("alt"), rs.getString("sha256"));
    }
}
