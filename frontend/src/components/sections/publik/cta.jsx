import Link from "next/link";

export default function CTASection() {
  return (
    <section className="cta section-hidden" id="cta">
      <div className="container">
        <div className="cta-content">
          <h2>Siap Mengubah Cara Anda Menganalisis Geospasial?</h2>
          <p>
            Bergabunglah dengan TerraSeg sekarang dan nikmati kemudahan 
            analisis geospasial berbasis AI. Hanya dengan akun, Anda dapat 
            menyimpan semua hasil analisis dan mengaksesnya kapan saja.
          </p>
          
          <div className="highlight-box">
            <h3>
              <i className="fas fa-exclamation-circle"></i> Penting!
            </h3>
            <p>
              Untuk menyimpan hasil segmentasi AI dan pengaturan peta Anda, 
              Anda harus memiliki akun TerraSeg. Daftar sekarang gratis!
            </p>
          </div>
          
          <Link href="/register" className="btn btn-cta">
            <i className="fas fa-rocket"></i> Daftar Sekarang Gratis
          </Link>
        </div>
      </div>
    </section>
  );
}