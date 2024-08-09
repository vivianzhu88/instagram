FROM maven:3.8.4-openjdk-11

WORKDIR /app
COPY pom.xml .
RUN mvn install
USER root
RUN apt-get update && apt-get install -y cron
RUN echo "0 * * * * cd app && mvn exec:java@local" > /etc/cron.d/maven-cron
RUN chmod 0644 /etc/cron.d/maven-cron
RUN crontab /etc/cron.d/maven-cron
COPY . .
RUN mvn compile
CMD mvn exec:java@local && cron -f
