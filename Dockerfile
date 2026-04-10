FROM node:18-alpine
WORKDIR /app

# Install all deps (including devDeps for TypeScript compiler)
COPY package*.json ./
RUN npm install

# Copy source and compile TypeScript → dist/
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc --skipLibCheck

ENV PORT=8080
EXPOSE 8080
CMD ["node", "dist/index.js"]
