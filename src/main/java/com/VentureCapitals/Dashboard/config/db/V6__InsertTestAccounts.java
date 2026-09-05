package com.VentureCapitals.Dashboard.config.db;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import java.sql.*;
import java.time.LocalDateTime;
import java.util.UUID;

public class V6__InsertTestAccounts extends BaseJavaMigration {
    @Override
    public void migrate(Context context) throws Exception {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String vcHash = encoder.encode("dhruv12345");
        String startupHash = encoder.encode("dhruv1310");
        
        try (Connection connection = context.getConnection()) {
            String sql = "INSERT INTO users (id, email, password_hash, user_type, is_active, created_at, updated_at) " +
                    "VALUES (?, ?, ?, ?, true, ?, ?) ON CONFLICT (email) DO NOTHING";
            
            try (PreparedStatement stmt = connection.prepareStatement(sql)) {
                // VC test account
                stmt.setObject(1, UUID.fromString("a0000000-0000-0000-0000-000000000001"));
                stmt.setString(2, "vc.test@test.com");
                stmt.setString(3, vcHash);
                stmt.setString(4, "VC");
                stmt.setTimestamp(5, Timestamp.valueOf(LocalDateTime.now()));
                stmt.setTimestamp(6, Timestamp.valueOf(LocalDateTime.now()));
                stmt.execute();
                
                // Startup test account
                stmt.setObject(1, UUID.fromString("b0000000-0000-0000-0000-000000000001"));
                stmt.setString(2, "startup.test@test.com");
                stmt.setString(3, startupHash);
                stmt.setString(4, "STARTUP");
                stmt.setTimestamp(5, Timestamp.valueOf(LocalDateTime.now()));
                stmt.setTimestamp(6, Timestamp.valueOf(LocalDateTime.now()));
                stmt.execute();
            }
        }
    }
}
