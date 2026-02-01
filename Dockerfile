FROM oven/bun:1
WORKDIR /app
COPY package.json ./
RUN bun install
COPY . .
RUN mkdir -p /app/data /app/public/pets
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["bun", "run", "src/index.ts"]
