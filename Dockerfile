# Gunakan base image Bun yang cukup lengkap (bukan slim)
FROM oven/bun:1

# Install dependencies yang dibutuhkan untuk kompilasi better-sqlite3
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    gcc \
    pkg-config \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy file dependensi dulu → supaya layer caching lebih optimal
COPY package.json bun.lockb* ./

# Install semua dependencies
RUN bun install --frozen-lockfile

# Copy seluruh source code setelah dependensi terinstall
COPY . .

# Buat folder yang dibutuhkan aplikasi
RUN mkdir -p /app/data /app/public/pets

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000

# Expose port (opsional, Railway sebenarnya tidak butuh ini)
EXPOSE 3000

# Jalankan aplikasi
CMD ["bun", "run", "src/index.ts"]
