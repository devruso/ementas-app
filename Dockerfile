FROM node:20-alpine AS build
WORKDIR /app

ARG API_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN VITE_API_URL=${API_URL} npm run build

FROM nginx:alpine
ENV PORT=8080

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

CMD sh -c "sed -i 's/$PORT/'\"$PORT\"'/g' /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"
