# ---- Build stage ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Vite inlines VITE_* vars at build time
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ---- Serve stage ----
FROM node:22-alpine
WORKDIR /app

RUN npm install -g serve

COPY --from=build /app/dist ./dist

USER node
EXPOSE 3000

# -s = SPA mode (falls back to index.html so client-side routes work on refresh)
CMD ["serve", "-s", "dist", "-l", "3000"]