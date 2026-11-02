package com.secondbrain.db;

import org.h2.jdbcx.JdbcConnectionPool;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

public final class Db {

    /** Biểu thức SQL sinh id công khai ngẫu nhiên 12 ký tự. */
    public static final String NEW_PUB_ID =
            "SUBSTRING(REPLACE(CAST(RANDOM_UUID() AS VARCHAR), '-', ''), 1, 12)";

    private static final String[] SCHEMA = {
            "CREATE TABLE IF NOT EXISTS users ("
                    + " id VARCHAR(36) PRIMARY KEY,"
                    + " name VARCHAR(100) NOT NULL)",
            "CREATE TABLE IF NOT EXISTS projects ("
                    + " id BIGINT AUTO_INCREMENT PRIMARY KEY,"
                    + " name VARCHAR(200) NOT NULL,"
                    + " color VARCHAR(7) NOT NULL,"
                    + " owner_id VARCHAR(36) NOT NULL REFERENCES users(id),"
                    + " share_key VARCHAR(20) UNIQUE,"
                    + " created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
            "CREATE TABLE IF NOT EXISTS project_members ("
                    + " project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,"
                    + " user_id VARCHAR(36) NOT NULL REFERENCES users(id),"
                    + " PRIMARY KEY (project_id, user_id))",
            "CREATE TABLE IF NOT EXISTS tasks ("
                    + " id BIGINT AUTO_INCREMENT PRIMARY KEY,"
                    + " title VARCHAR(500) NOT NULL,"
                    + " project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,"
                    + " owner_id VARCHAR(36) NOT NULL REFERENCES users(id),"
                    + " due_date DATE,"
                    + " due_time TIME,"
                    + " priority INT DEFAULT 4 NOT NULL,"
                    + " done BOOLEAN DEFAULT FALSE NOT NULL,"
                    + " created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
            // v2: trạng thái online + id công khai (id trong cookie là bí mật, không gửi cho người khác)
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS pub_id VARCHAR(16)",
            "UPDATE users SET pub_id = " + Db.NEW_PUB_ID + " WHERE pub_id IS NULL",
            "CREATE UNIQUE INDEX IF NOT EXISTS users_pub_id ON users(pub_id)"
    };

    private static JdbcConnectionPool pool;

    private Db() {
    }

    public static void init(String url) throws SQLException {
        pool = JdbcConnectionPool.create(url, "sa", "");
        try (Connection c = get(); Statement s = c.createStatement()) {
            for (String sql : SCHEMA) {
                s.execute(sql);
            }
        }
    }

    public static Connection get() throws SQLException {
        return pool.getConnection();
    }

    public static void close() {
        if (pool != null) {
            pool.dispose();
        }
    }
}
