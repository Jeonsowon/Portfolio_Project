# ================================
# Stage 1: Maven 빌드
# ================================
FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /app

# 의존성 캐시를 위해 pom.xml 먼저 복사
COPY pom.xml .
RUN mvn dependency:go-offline -B

# 소스 코드 복사 및 빌드
COPY src ./src
RUN mvn package -DskipTests -B

# ================================
# Stage 2: JRE로 실행
# ================================
FROM eclipse-temurin:17-jre

WORKDIR /app

# 빌드된 JAR 복사
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
