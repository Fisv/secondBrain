package com.secondbrain.db;

import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;
import javax.servlet.annotation.WebListener;
import java.sql.SQLException;

@WebListener
public class DbListener implements ServletContextListener {

    @Override
    public void contextInitialized(ServletContextEvent e) {
        String url = e.getServletContext().getInitParameter("db.url");
        try {
            Db.init(url != null ? url : "jdbc:h2:~/.secondbrain/data");
        } catch (SQLException ex) {
            throw new IllegalStateException("Không khởi tạo được CSDL", ex);
        }
    }

    @Override
    public void contextDestroyed(ServletContextEvent e) {
        Db.close();
    }
}
