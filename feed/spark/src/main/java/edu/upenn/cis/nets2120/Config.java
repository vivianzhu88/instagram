package edu.upenn.cis.nets2120;

/**
 * Global configuration for NETS 2120 homeworks.
 *
 * @author zives
 */
public class Config {
    public static String MYSQL_HOST = System.getenv("MYSQL_HOST") != null ? System.getenv("MYSQL_HOST") : "localhost";
    public static String MYSQL_USER = System.getenv("MYSQL_USER") != null ? System.getenv("MYSQL_USER") : "user";
    public static String MYSQL_PASSWORD = System.getenv("MYSQL_PASSWORD") != null ? System.getenv("MYSQL_PASSWORD") : "password";
    public static String MYSQL_DATABASE = System.getenv("MYSQL_DATABASE") != null ? System.getenv("MYSQL_DATABASE") : "nets2120";

    public static String LOCAL_SPARK = "local[*]";

    public static String JAR = "target/nets2120-hw3-0.0.1-SNAPSHOT.jar";

    // these will be set via environment variables
    public static String ACCESS_KEY_ID = null; // System.getenv("AWS_ACCESS_KEY_ID");
    public static String SECRET_ACCESS_KEY = System.getenv("AWS_SECRET_ACCESS_KEY");
    public static String SESSION_TOKEN = System.getenv("AWS_SESSION_TOKEN");

    /**
     * How many RDD partitions to use?
     */
    public static int PARTITIONS = 5;
}
