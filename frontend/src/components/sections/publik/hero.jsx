import Link from "next/link";
import Image from "next/image";

export default function HeroSection() {
  return (
    <section className="hero bg-white dark:bg-slate-950 transition-colors duration-300" id="home">
      <div className="container mx-auto">
        <div className="hero-content">
          <div className="hero-text">
            {/* Mengatur warna teks H1 dan Span untuk mode dark */}
            <h1 className="text-slate-900 dark:text-white transition-colors">
              Analisis <span className="text-[#1378b7] dark:text-cyan-400">Geospasial</span> dengan Kecerdasan Buatan
            </h1>
            
            {/* Mengatur warna teks paragraf */}
            <p className="text-slate-600 dark:text-slate-400 transition-colors">
              TerraSeg menghadirkan teknologi AI untuk segmentasi citra satelit
              secara otomatis. Deteksi air, jalan, bangunan, dan pepohonan
              dengan akurasi tinggi dan visualisasi polygon yang interaktif.
            </p>

            <div className="hero-buttons">
              <Link href="/map" className="btn btn-primary">
                <i className="fas fa-map-marked-alt"></i> Buka Peta
              </Link>
              <Link href="#features" className="btn btn-secondary dark:bg-slate-800 dark:text-white dark:border-slate-700">
                <i className="fas fa-play-circle"></i> Pelajari Fitur
              </Link>
            </div>
          </div>

          <div className="hero-image">
            <Image
              src="/icons/dasbor.png"
              alt="TerraSegMap Interface"
              width={900}
              height={900}
              // Mengubah warna border gambar di mode dark agar tidak terlalu kontras menyala
              className="rounded-lg shadow-xl border-8 border-white dark:border-slate-800 transition-all"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}