# syntax=docker/dockerfile:1
FROM eclipse-temurin:21-jdk AS builder
WORKDIR /app

# Copy gradle configuration files
COPY gradlew .
COPY gradle gradle
COPY build.gradle settings.gradle .

# Fix CRLF line endings on Windows and set executable permission
RUN sed -i 's/\r$//' gradlew && chmod +x gradlew

# Download dependencies
RUN ./gradlew dependencies --no-daemon || true

# Copy source code and build jar
COPY src src
RUN ./gradlew bootJar --no-daemon -x test

# Runtime stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Run as non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

COPY --from=builder /app/build/libs/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
