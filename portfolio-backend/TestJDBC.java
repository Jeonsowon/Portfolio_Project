import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class TestJDBC {
    public static void main(String[] args) {
        String urlPooler = "jdbc:postgresql://aws-1-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require&prepareThreshold=0";
        String userPooler = "postgres.piboztgutnoboayeokwf";
        String pass = "wjsthdnjs22!@";

        System.out.println("Testing Pooler Connection with prepareThreshold=0...");
        try (Connection conn = DriverManager.getConnection(urlPooler, userPooler, pass)) {
            System.out.println("Pooler Connection SUCCESS!");
        } catch (SQLException e) {
            System.out.println("Pooler Connection FAILED: " + e.getMessage());
        }
    }
}
