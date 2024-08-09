package edu.upenn.cis.nets2120;

import edu.upenn.cis.nets2120.ComputeRanks;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import scala.Tuple2;

import java.io.FileOutputStream;
import java.io.PrintStream;
import java.util.*;

public class ComputeRanksLocal {
    public static void main(String[] args) {
        boolean debug;

        // // Check so we'll fatally exit if the environment isn't set
        // if (System.getenv("AWS_ACCESS_KEY_ID") == null) {
        //     logger.error("AWS_ACCESS_KEY_ID not set -- update your .env and run source .env");
        //     System.exit(-1);
        // }

        double d_max = 0.001;
        int i_max = 5;
        debug = false;

        ComputeRanks job = new ComputeRanks(d_max, i_max, 1000, debug);

        job.mainLogic();
    }
}
