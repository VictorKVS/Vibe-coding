FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["sh","-c","npx wrangler dev --config dist/server/wrangler.json --ip 0.0.0.0 --port ${PORT:-8080}"]
