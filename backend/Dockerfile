FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Production dependencies only, exactly as locked.
RUN npm ci --omit=dev

COPY --chown=node:node . .

ENV NODE_ENV=production

# Run as the image's unprivileged "node" user, not root.
USER node

EXPOSE 5000

CMD ["node", "src/server.js"]
