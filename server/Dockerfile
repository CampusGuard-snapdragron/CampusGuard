FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY dist/ ./dist/

ENV PORT=8787
EXPOSE ${PORT}

CMD ["node", "dist/index.js"]
