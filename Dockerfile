FROM node:20-alpine AS build
WORKDIR /app

ARG API_URL
ARG VITE_API_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN VITE_API_URL=${VITE_API_URL:-$API_URL} npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.d/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh
RUN chmod +x /docker-entrypoint.d/40-runtime-config.sh

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
