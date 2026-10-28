# Gunakan image Node.js versi 20 Alpine (sangat ringan)
FROM node:20-alpine

# Set direktori kerja di dalam kontainer
WORKDIR /app

# Salin file konfigurasi package (root)
COPY package*.json ./

# Salin direktori backend dan frontend
COPY backend ./backend
COPY frontend ./frontend

# 1. Instal dependensi dan build frontend
WORKDIR /app/frontend
RUN npm install
RUN npm run build

# 2. Instal dependensi backend
WORKDIR /app/backend
RUN npm install

# 3. Kembali ke direktori backend sebagai tempat eksekusi utama
WORKDIR /app/backend

# Ekspos port yang digunakan aplikasi (3001)
EXPOSE 3001

# Perintah untuk menjalankan aplikasi
CMD ["node", "server.js"]
