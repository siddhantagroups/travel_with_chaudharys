# ---- Stage 1: build (pre-rendered, pre-compressed) ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Stage 2: serve the built files only — never the dev server ----
# Nginx Inc's official unprivileged image: the whole server runs as the
# "nginx" user (no root), listening on 8080.
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY nginx.docker.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
