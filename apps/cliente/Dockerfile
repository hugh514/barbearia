FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && chown -R node:node .next
ENV NODE_ENV=production
EXPOSE 3002
USER node
CMD ["npm", "start"]
