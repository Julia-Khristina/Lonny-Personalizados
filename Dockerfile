# Lonny Personalizados — imagem de produção (Render, Docker)
# 1) compila o app  2) roda o servidor Node que entrega dist/ e /api/mockup

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY server ./server
COPY package.json ./
# o Render informa a porta pela variável PORT
EXPOSE 3000
CMD ["node", "server/index.ts"]
