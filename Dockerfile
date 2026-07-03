FROM node:20-alpine

WORKDIR /app

COPY package.json ./package.json
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY backend ./backend
COPY frontend ./frontend
COPY seeds ./seeds

RUN npm install --prefix backend && npm install --prefix frontend && npm run build --prefix frontend

ENV NODE_ENV=production
ENV PORT=10000
ENV API_PORT=10000
ENV SEED_DIR=/app/seeds

EXPOSE 10000

CMD ["node", "backend/src/index.js"]
