# ================================
# Stage 1: Node.js 빌드
# ================================
FROM node:20-alpine AS build

WORKDIR /app

# 의존성 캐시를 위해 package 파일 먼저 복사
COPY package.json package-lock.json ./
RUN npm ci

# 소스 코드 복사 및 빌드
COPY . .
RUN npm run build

# ================================
# Stage 2: Nginx로 서빙
# ================================
FROM nginx:alpine

# Nginx 설정 복사
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 빌드된 정적 파일 복사
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
