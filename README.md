#  PROJECT MAGANG



## Panduan Instalasi (Getting Started)

Ikuti langkah-langkah di bawah ini secara berurutan untuk menjalankan proyek di mesin lokal:

### 1. Setup Database (Docker)

Jalankan perintah ini di dalam folder utama (**root**) `projectM2/` untuk menyalakan PostgreSQL dan MongoDB:

```bash
# Menjalankan database di latar belakang
docker-compose up -d

```

### 2. Setup Backend (Django)

Buka terminal baru, lalu masuk ke folder backend untuk menginstal dependensi dan menjalankan server:

```bash
# Masuk ke folder backend
cd backend

# Membuat Virtual Environment
python -m venv venv

# Aktivasi Virtual Environment (Windows)
.\venv\Scripts\activate

# Install semua library yang dibutuhkan
pip install -r requirements.txt

# Migrasi database dan jalankan server
python manage.py migrate
python manage.py runserver

```

### 3. Setup Frontend (Next.js)

Buka terminal satu lagi, masuk ke folder frontend, dan jalankan interface web:

```bash
# Masuk ke folder frontend
cd frontend

# Install dependensi Node.js
npm install

# Jalankan server development
npm run dev

```

---

## Catatan Penting

* **Environment**: Pastikan sudah menyalin `.env.example` menjadi `.env` di folder `backend/` sebelum menjalankan server.
* **Port**:
* Frontend: `http://localhost:3000`
* Backend: `http://127.0.0.1:8000`
* MongoDB: `27017`
* PostgreSQL: `5432`
