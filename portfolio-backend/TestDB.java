import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class TestDB {
    public static void main(String[] args) {
        String url = "jdbc:postgresql://aws-1-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require&prepareThreshold=0";
        String user = "postgres.piboztgutnoboayeokwf";
        String password = "wjsthdnjs22!@";
        
        System.out.println("Connecting to: " + url);
        System.out.println("User: " + user);
        
        try (Connection conn = DriverManager.getConnection(url, user, password)) {
            System.out.println("Connection successful!");
        } catch (SQLException e) {
            System.out.println("Connection failed:");
            e.printStackTrace();
        }
    }
}
