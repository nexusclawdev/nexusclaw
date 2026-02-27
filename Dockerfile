FROM node:20-slim

# Install Playwright dependencies
RUN npx -y playwright install --with-deps chromium

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY dist/ ./dist/

ENV NODE_ENV=production

ENTRYPOINT ["node", "dist/cli/index.js"]
CMD ["status"]
