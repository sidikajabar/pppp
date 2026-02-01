# Gunakan base image Bun resmi (debian-based, recommended untuk Railway/Bun apps)
# Tag 'latest' atau versi spesifik seperti '1' kalau mau pin version
FROM oven/bun:1

# Set working directory
WORKDIR /app

# Copy dependensi dulu → optimal caching layer
COPY package.json bun.lockb* ./

# Install dependencies (tidak perlu --frozen-lockfile kalau lockfile clean)
# Karena tidak ada native deps lagi, ini cepat & aman
RUN bun install

# Copy seluruh source code
COPY . .

# Buat folder persistent untuk DB (Railway volume akan di-mount ke sini)
RUN mkdir -p /app/data /app/public/pets

# Set environment variables default
ENV NODE_ENV=production \
    PORT=3000 \
    # Opsional: path DB default (Railway volume biasanya /data atau /app/data)
    # Kamu bisa override di Railway Variables: DB_PATH=/data/petpad.db
    DB_PATH=/app/data/petpad.db

# Expose port (Railway ignore ini, tapi bagus untuk dokumentasi)
EXPOSE 3000

# Jalankan app
CMD ["bun", "run", "src/index.ts"]
