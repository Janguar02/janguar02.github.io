# Browser Zombies lobby relay - any container host (Fly.io, Railway, Render, VPS). MULTIPLAYER.md
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.js ./
ENV PORT=8090
EXPOSE 8090
USER node
CMD ["node", "server.js"]
