# syntax=docker/dockerfile:1.4

# ---------- Stage 1: build the React (Vite) SPA ----------
FROM node:20-alpine AS frontend
WORKDIR /build
COPY frontend/package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY frontend/ ./
RUN npm run build                          # -> /build/dist (index.html, assets/, favicon.svg)

# ---------- Stage 2: build the executable Spring Boot jar (with the SPA staged inside) ----------
FROM maven:3.9.8-eclipse-temurin-17 AS backend
WORKDIR /build
COPY backend/pom.xml ./pom.xml
COPY backend/src ./src
# Stage the freshly built SPA into the jar's static-resource location
# (classpath:/static/** is served at the web root by Spring Boot).
RUN rm -rf src/main/resources/static
COPY --from=frontend /build/dist ./src/main/resources/static
RUN --mount=type=cache,target=/root/.m2 mvn -B package -DskipTests
# -> target/branchstock-api-1.0.0.jar (Spring Boot repackaged, executable)

# ---------- Stage 3: lean runtime image ----------
FROM eclipse-temurin:17-jre-alpine AS runtime
WORKDIR /app
# Spring Boot resolves server.port=${PORT:8080}; Render sets $PORT,
# local `docker run -p 8080:8080` defaults to 8080.
COPY --from=backend /build/target/branchstock-api-1.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]
