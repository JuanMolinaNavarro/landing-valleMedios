FROM node:20-bookworm-slim AS build

WORKDIR /app

ARG PUBLIC_API_BASE=/api
ENV PUBLIC_API_BASE=${PUBLIC_API_BASE}

COPY package*.json ./
RUN npm ci

COPY astro.config.mjs ./
COPY tsconfig.json ./
COPY public ./public
COPY src ./src

RUN npm run build

FROM node:20-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

COPY package*.json ./
RUN npm ci --omit=dev \
  && npm cache clean --force

COPY --from=build /app/dist ./dist

EXPOSE 4321

CMD ["node", "dist/server/entry.mjs"]
