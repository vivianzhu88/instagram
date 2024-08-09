package edu.upenn.cis.nets2120;

import java.io.IOException;
import java.io.Serializable;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.spark.api.java.JavaPairRDD;
import org.apache.spark.api.java.JavaRDD;

import com.mysql.cj.x.protobuf.MysqlxDatatypes.Array;

import edu.upenn.cis.nets2120.SparkJob;
import scala.Tuple2;

import java.util.*;
import java.lang.Math;
import java.sql.*;

public class ComputeRanks extends SparkJob<List<Tuple2<Tuple2<String, String>, Double>>> {
    static org.apache.logging.log4j.Logger logger = LogManager.getLogger(ComputeRanks.class);

    // Convergence condition variables
    protected double d_max; // largest change in a node's rank from iteration i to iteration i+1
    protected int i_max; // max number of iterations
    int max_answers = 1000;

    Connection connection;

    public ComputeRanks(double d_max, int i_max, int answers, boolean debug) {
        super(true, true, debug);
        this.d_max = d_max;
        this.i_max = i_max;
        this.max_answers = answers;
    }

    public void getConnection() {
        String url = "jdbc:mysql://" + Config.MYSQL_HOST + "/" + Config.MYSQL_DATABASE;
        String user = Config.MYSQL_USER;
        String password = Config.MYSQL_PASSWORD;

        try {
            Class.forName("com.mysql.cj.jdbc.Driver");
            connection = DriverManager.getConnection(url, user, password);
        } catch (ClassNotFoundException e) {
            System.out.println("MySQL JDBC Driver not found.");
            e.printStackTrace();
        } catch (SQLException e) {
            System.out.println("Connection failed.");
            e.printStackTrace();
        }
    }

    protected JavaPairRDD<String, String> getFriends() {
        String query = "SELECT followed, follower FROM friends";

        try {
            Statement stmt = connection.createStatement();

            List<Tuple2<String, String>> edgesList = new ArrayList<>();

            ResultSet rs = stmt.executeQuery(query);

            while (rs.next()) {
                String followed = rs.getString("followed");
                String follower = rs.getString("follower");
                edgesList.add(new Tuple2<String, String>(followed, follower));
            }

            JavaRDD<Tuple2<String, String>> edges = context.parallelize(edgesList);

            return JavaPairRDD.fromJavaRDD(edges);
        } catch (SQLException e) {
            System.out.println("Query execution failed.");
            e.printStackTrace();
        }

        return null;
    }

    protected JavaPairRDD<String, String> getPostsUsers() {
        String query = "SELECT uuid, user_uuid FROM posts";

        try {
            Statement stmt = connection.createStatement();

            List<Tuple2<String, String>> edgesList = new ArrayList<>();

            ResultSet rs = stmt.executeQuery(query);

            while (rs.next()) {
                String post_uuid = rs.getString("uuid");
                String user_uuid = rs.getString("user_uuid");
                edgesList.add(new Tuple2<String, String>(post_uuid, user_uuid));
            }

            JavaRDD<Tuple2<String, String>> edges = context.parallelize(edgesList);

            return JavaPairRDD.fromJavaRDD(edges);
        } catch (SQLException e) {
            System.out.println("Query execution failed.");
            e.printStackTrace();
        }

        return null;
    }

    protected JavaPairRDD<String, String> getUsersHashtags() {
        String query = "SELECT user_uuid, hashtag FROM user_hashtags";

        try {
            Statement stmt = connection.createStatement();

            List<Tuple2<String, String>> edgesList = new ArrayList<>();

            ResultSet rs = stmt.executeQuery(query);

            while (rs.next()) {
                String user_uuid = rs.getString("user_uuid");
                String hashtag = rs.getString("hashtag");
                edgesList.add(new Tuple2<String, String>(user_uuid, hashtag));
            }

            JavaRDD<Tuple2<String, String>> edges = context.parallelize(edgesList);

            return JavaPairRDD.fromJavaRDD(edges);
        } catch (SQLException e) {
            System.out.println("Query execution failed.");
            e.printStackTrace();
        }

        return null;
    }

    protected JavaPairRDD<String, String> getPostsHashtags() {
        String query = "SELECT post_uuid, hashtag FROM post_hashtags";

        try {
            Statement stmt = connection.createStatement();

            List<Tuple2<String, String>> edgesList = new ArrayList<>();

            ResultSet rs = stmt.executeQuery(query);

            while (rs.next()) {
                String post_uuid = rs.getString("post_uuid");
                String hashtag = rs.getString("hashtag");
                edgesList.add(new Tuple2<String, String>(post_uuid, hashtag));
            }

            JavaRDD<Tuple2<String, String>> edges = context.parallelize(edgesList);

            return JavaPairRDD.fromJavaRDD(edges);
        } catch (SQLException e) {
            System.out.println("Query execution failed.");
            e.printStackTrace();
        }

        return null;
    }

    protected void uploadRankingsRaw(List<String[]> buffer) {
        try {

            String query = "INSERT IGNORE INTO rankings (source, destination, score) VALUES ";
            for (String[] entry : buffer) {
                query += "('" + entry[0] + "', '" + entry[1] + "', " + entry[2] + ")";
                if (buffer.indexOf(entry) != buffer.size() - 1) {
                    query += ", ";
                }
            }
            PreparedStatement pstmt = connection.prepareStatement(query);

            pstmt.executeUpdate();
        } catch (SQLException e) {
            System.out.println("Query execution failed.");
            e.printStackTrace();
        }
    }

    protected void uploadRankings(List<Tuple2<Tuple2<String, String>, Double>> rankings) {
        try {
            connection.prepareStatement("DELETE FROM rankings WHERE 1").executeUpdate();
        } catch (SQLException e) {
            System.out.println("Query execution failed.");
            e.printStackTrace();
            return;
        }

        List<String[]> buffer = new ArrayList<>();

        for (Tuple2<Tuple2<String, String>, Double> entry : rankings) {
            buffer.add(new String[] { entry._1._1, entry._1._2, entry._2.toString() });

            if (buffer.size() >= 100) {
                uploadRankingsRaw(buffer);
                buffer.clear();
            }
        }

        if (buffer.size() > 0) {
            uploadRankingsRaw(buffer);
        }
    }

    /**
     * Retrieves the sinks in the provided graph.
     *
     * @param network The input graph represented as a JavaPairRDD.
     * @return A JavaRDD containing the nodes with no outgoing edges.
     */
    protected JavaRDD<String> getSinks(JavaPairRDD<String, String> network) {
        JavaRDD<String> nodeRDD = network.flatMap(x -> Arrays.asList(x._1, x._2).iterator()).distinct();
        JavaRDD<String> nonSinkRDD = network.flatMap(x -> Arrays.asList(x._1).iterator()).distinct();
        return nodeRDD.subtract(nonSinkRDD);
    }

    /**
     * Main functionality in the program: read and process the social network
     * Runs the SocialRank algorithm to compute the ranks of nodes in a social
     * network.
     *
     * @param debug a boolean value indicating whether to enable debug mode
     * @return a list of tuples containing the node ID and its corresponding
     *         SocialRank value
     * @throws IOException          if there is an error reading the social network
     *                              data
     * @throws InterruptedException if the execution is interrupted
     */
    public List<Tuple2<Tuple2<String, String>, Double>> run(boolean debug) throws IOException, InterruptedException {
        getConnection();
        
        // Load the social network, aka. the edges (followed, follower)
        JavaPairRDD<String, String> friendsRDD = getFriends().distinct(); // followed, follower
        JavaPairRDD<String, String> postsUsersRDD = getPostsUsers().distinct(); // post, user
        JavaPairRDD<String, String> postsHashtagsRDD = getPostsHashtags().distinct(); // post, hashtag
        JavaPairRDD<String, String> usersHashtagsRDD = getUsersHashtags().distinct(); // user, hashtag

        JavaRDD<String> userNodeRDD = friendsRDD.flatMap(x -> Arrays.asList(x._1, x._2).iterator()).distinct(); // user
        JavaPairRDD<String, String> userNodeWithLabelsRDD = userNodeRDD.mapToPair(x -> new Tuple2<>(x, "user")); // user, "user"

        JavaRDD<String> postNodeRDD = postsUsersRDD.map(x -> x._1).distinct(); // post
        JavaPairRDD<String, String> postNodeWithLabelsRDD = postNodeRDD.mapToPair(x -> new Tuple2<>(x, "post")); // post, "post"

        JavaRDD<String> userNodeRDD2 = postsUsersRDD.map(x -> x._2).distinct(); // user
        JavaPairRDD<String, String> userNodeWithLabelsRDD2 = userNodeRDD2.mapToPair(x -> new Tuple2<>(x, "user")); // user, "user"

        JavaRDD<String> hashtagNodeRDD = postsHashtagsRDD.map(x -> x._2).distinct(); // hashtag
        JavaPairRDD<String, String> hashtagNodeWithLabelsRDD = hashtagNodeRDD.mapToPair(x -> new Tuple2<>(x, "hashtag")); // hashtag, "hashtag"

        JavaRDD<String> postNodeRDD2 = postsHashtagsRDD.map(x -> x._1).distinct(); // post
        JavaPairRDD<String, String> postNodeWithLabelsRDD2 = postNodeRDD2.mapToPair(x -> new Tuple2<>(x, "post")); // post, "post"

        JavaRDD<String> userNodeRDD3 = usersHashtagsRDD.map(x -> x._2).distinct(); // hashtag
        JavaPairRDD<String, String> userNodeWithLabelsRDD3 = userNodeRDD.mapToPair(x -> new Tuple2<>(x, "user")); // user, "user"

        JavaRDD<String> hashtagNodeRDD2 = usersHashtagsRDD.map(x -> x._2).distinct(); // hashtag
        JavaPairRDD<String, String> hashtagNodeWithLabelsRDD2 = hashtagNodeRDD2.mapToPair(x -> new Tuple2<>(x, "hashtag")); // hashtag, "hashtag"

        userNodeRDD = userNodeRDD.union(userNodeRDD2).union(userNodeRDD3).distinct(); // user
        userNodeWithLabelsRDD = userNodeWithLabelsRDD.union(userNodeWithLabelsRDD2).union(userNodeWithLabelsRDD3).distinct(); // user, label
        postNodeRDD = postNodeRDD.union(postNodeRDD2).distinct(); // post
        postNodeWithLabelsRDD = postNodeWithLabelsRDD.union(postNodeWithLabelsRDD2).distinct(); // post, label
        hashtagNodeRDD = hashtagNodeRDD.union(hashtagNodeRDD2).distinct(); // hashtag
        hashtagNodeWithLabelsRDD = hashtagNodeWithLabelsRDD.union(hashtagNodeWithLabelsRDD2).distinct(); // hashtag, label

        JavaRDD<String> nodeRDD = userNodeRDD.union(postNodeRDD).union(hashtagNodeRDD).distinct(); // node
        JavaPairRDD<String, String> nodeWithLabelsRDD = userNodeWithLabelsRDD.union(postNodeWithLabelsRDD).union(hashtagNodeWithLabelsRDD).distinct(); // node, label

        // double edges now
        friendsRDD = friendsRDD.flatMapToPair(x -> Arrays.asList(new Tuple2<>(x._1, x._2), new Tuple2<>(x._2, x._1)).iterator()).distinct(); // dest, source
        postsUsersRDD = postsUsersRDD.flatMapToPair(x -> Arrays.asList(new Tuple2<>(x._1, x._2), new Tuple2<>(x._2, x._1)).iterator()).distinct(); // dest, source
        postsHashtagsRDD = postsHashtagsRDD.flatMapToPair(x -> Arrays.asList(new Tuple2<>(x._1, x._2), new Tuple2<>(x._2, x._1)).iterator()).distinct(); // dest, source
        usersHashtagsRDD = usersHashtagsRDD.flatMapToPair(x -> Arrays.asList(new Tuple2<>(x._1, x._2), new Tuple2<>(x._2, x._1)).iterator()).distinct(); // dest, source

        JavaPairRDD<String, String> augmentedEdgeRDD = friendsRDD.union(postsUsersRDD).union(postsHashtagsRDD)
                .union(usersHashtagsRDD).distinct(); // dest, source

        long numUsers = userNodeRDD.count();
        long numPosts = postNodeRDD.count();
        long numHashtags = hashtagNodeRDD.count();
        long numNodes = nodeRDD.count();
        long numEdges = augmentedEdgeRDD.count();
        System.out.println("Number of users: " + numUsers);
        System.out.println("Number of posts: " + numPosts);
        System.out.println("Number of hashtags: " + numHashtags);
        System.out.println("Number of nodes: " + numNodes);
        System.out.println("Number of edges: " + numEdges);

        if (numNodes == 0 || numEdges == 0) {
            return new ArrayList<>();
        }

        JavaPairRDD<String, String> userKeyNodeRDDPair = userNodeRDD.cartesian(nodeRDD); // key, user
        JavaRDD<Tuple2<String, String>> userKeyNodeRDD = userKeyNodeRDDPair.map(x -> new Tuple2<>(x._1, x._2)); // key, user

        JavaPairRDD<Tuple2<String, String>, String> userKeyAugmentedEdgeRDD = userNodeRDD.cartesian(augmentedEdgeRDD)
                .mapToPair(x -> new Tuple2<>(new Tuple2<>(x._1, x._2._1), x._2._2)); // key, dest, source

        JavaPairRDD<Tuple2<String, String>, Double> socialRankRDD = userKeyNodeRDD.mapToPair(x -> new Tuple2<>(x, x._1.equals(x._2) ? 1.0 : 0.0)); // key, user, score
        JavaPairRDD<String, Integer> neighborCountRDD = augmentedEdgeRDD.mapToPair(x -> new Tuple2<>(x._2, 1))
                .reduceByKey((x, y) -> x + y); // source, count
        JavaPairRDD<String, Tuple2<String, String>> labeledEdgeRDD = augmentedEdgeRDD.join(nodeWithLabelsRDD); // dest, source, dest label
        JavaPairRDD<String, Integer> userNeighborCountRDD = labeledEdgeRDD.mapToPair(x -> new Tuple2<>(x._2._1, x._2._2.equals("user") ? 1 : 0)).reduceByKey((x, y) -> x + y); // source, count
        JavaPairRDD<String, Integer> postNeighborCountRDD = labeledEdgeRDD.mapToPair(x -> new Tuple2<>(x._2._1, x._2._2.equals("post") ? 1 : 0)).reduceByKey((x, y) -> x + y); // source, count
        JavaPairRDD<String, Integer> hashtagNeighborCountRDD = labeledEdgeRDD.mapToPair(x -> new Tuple2<>(x._2._1, x._2._2.equals("hashtag") ? 1 : 0)).reduceByKey((x, y) -> x + y); // source, count
        JavaPairRDD<Tuple2<String, String>, Tuple2<String, String>> bothLabeledEdgeRDD = labeledEdgeRDD.mapToPair(x -> new Tuple2<>(x._2._1, new Tuple2<>(x._1, x._2._2)))
            .join(nodeWithLabelsRDD).mapToPair(x -> new Tuple2<>(x._2._1, new Tuple2<>(x._1, x._2._2))); // dest, dest label, source, source label
        JavaPairRDD<String, Tuple2<String, String>> userLabeledEdges = bothLabeledEdgeRDD.filter(x -> x._2._2.equals("user")).mapToPair(x -> new Tuple2<>(x._2._1, x._1)); // user, dest, dest label
        JavaPairRDD<String, String> userToUserEdges = userLabeledEdges.filter(x -> x._2._2.equals("user")).mapToPair(x -> new Tuple2<>(x._1, x._2._1)); // user source, user dest
        JavaPairRDD<String, String> userToPostEdges = userLabeledEdges.filter(x -> x._2._2.equals("post")).mapToPair(x -> new Tuple2<>(x._1, x._2._1)); // user source, post dest
        JavaPairRDD<String, String> userToHashtagEdges = userLabeledEdges.filter(x -> x._2._2.equals("hashtag")).mapToPair(x -> new Tuple2<>(x._1, x._2._1)); // user source, hashtag dest
        JavaPairRDD<String, String> nonUserEdges = bothLabeledEdgeRDD.filter(x -> !x._2._2.equals("user")).mapToPair(x -> new Tuple2<>(x._2._1, x._1._1)); // source, dest

        double decayFactor = 0.15;
        for (int i = 0; i < i_max; i++) {
            JavaPairRDD<String, Tuple2<Tuple2<String, Double>, String>> socialRankWithTags = socialRankRDD.mapToPair(x -> new Tuple2<>(x._1._2, new Tuple2<>(x._1._1, x._2))).join(nodeWithLabelsRDD); // node, key, score, label
            JavaPairRDD<String, Tuple2<String, Double>> users = socialRankWithTags.filter(x -> x._2._2.equals("user")).mapToPair(x -> new Tuple2<>(x._1, x._2._1)); // user, key, score
            JavaPairRDD<String, Tuple2<String, Double>> passedOnToUsers = users.join(userNeighborCountRDD).mapToPair(x -> new Tuple2<>(x._1, new Tuple2<>(x._2._1._1, x._2._2 == 0 ? 0 : x._2._1._2 * 0.3 / x._2._2))); // user, key, score
            JavaPairRDD<String, Tuple2<String, Double>> passedOnToPosts = users.join(postNeighborCountRDD).mapToPair(x -> new Tuple2<>(x._1, new Tuple2<>(x._2._1._1, x._2._2 == 0 ? 0 : x._2._1._2 * 0.3 / x._2._2))); // user, key, score
            JavaPairRDD<String, Tuple2<String, Double>> passedOnToHashtags = users.join(hashtagNeighborCountRDD).mapToPair(x -> new Tuple2<>(x._1, new Tuple2<>(x._2._1._1, x._2._2 == 0 ? 0 : x._2._1._2 * 0.3 / x._2._2))); // user, key, score
            JavaPairRDD<String, Tuple2<String, Tuple2<String, Double>>> passedValuesToUsers = userToUserEdges.join(passedOnToUsers); // user source, user dest, key, score
            JavaPairRDD<String, Tuple2<String, Tuple2<String, Double>>> passedValuesToPosts = userToPostEdges.join(passedOnToPosts); // user source, post dest, key, score
            JavaPairRDD<String, Tuple2<String, Tuple2<String, Double>>> passedValuesToHashtags = userToHashtagEdges.join(passedOnToHashtags); // user source, hashtag dest, key, score
            
            JavaPairRDD<String, Tuple2<String, Double>> notUsers = socialRankWithTags.filter(x -> !x._2._2.equals("user")).mapToPair(x -> new Tuple2<>(x._1, x._2._1)); // node, key, score
            JavaPairRDD<String, Tuple2<String, Double>> passedOnToNonUsers = notUsers.join(neighborCountRDD).mapToPair(x -> new Tuple2<>(x._1, new Tuple2<>(x._2._1._1, x._2._2 == 0 ? 0 : x._2._1._2 / x._2._2))); // node, key, score
            JavaPairRDD<String, Tuple2<String, Tuple2<String, Double>>> passedValuesToNonUsers = nonUserEdges.join(passedOnToNonUsers); // source, dest, key, score
            

            JavaPairRDD<String, Tuple2<String, Tuple2<String, Double>>> passedValuesRDD = passedValuesToUsers.union(passedValuesToPosts).union(passedValuesToHashtags).union(passedValuesToNonUsers); // source, dest, key, score
            JavaPairRDD<Tuple2<String, String>, Double> gainedValuesRDD = passedValuesRDD.mapToPair(x -> new Tuple2<>(new Tuple2<>(x._2._2._1, x._2._1), x._2._2._2)); // key, node, score
            JavaPairRDD<Tuple2<String, String>, Double> ensureNodeRDD = userKeyNodeRDD.mapToPair(x -> new Tuple2<>(x, x._1.equals(x._2) ? 1.0 : 0.0)); // key, node, score
            JavaPairRDD<Tuple2<String, String>, Double> allRDD = gainedValuesRDD.union(ensureNodeRDD); // key, node, score
            JavaPairRDD<Tuple2<String, String>, Double> totalRDD = allRDD.reduceByKey((x, y) -> x + y); // key, node, score
            JavaPairRDD<Tuple2<String, String>, Double> newSocialRankRDD = totalRDD.mapValues(x -> decayFactor + (1 - decayFactor) * x); // key, node, score
            
            try {
                double largestChange = socialRankRDD.join(newSocialRankRDD).mapToDouble(x -> Math.abs(x._2._1 - x._2._2))
                .max();

                if (largestChange < d_max) {
                    break;
                }
            } catch (Exception e) {
                System.out.println("Error: " + e);
                return new ArrayList<>();
            }

            socialRankRDD = newSocialRankRDD;


        }

        List<Tuple2<Tuple2<String, String>, Double>> rankings = socialRankRDD.collect();

        uploadRankings(rankings);
        System.out.println("Uploaded rankings.");

        return rankings;
    }
}
