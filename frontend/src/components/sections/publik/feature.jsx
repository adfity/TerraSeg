export default function FeaturesSection() {
  const featuresData = [
    { 
      icon: 'fas fa-brain', 
      title: 'GeoAI Segmentasi', 
      desc: 'Identifikasi otomatis elemen geografis seperti air, jalan, bangunan, dan pepohonan dari citra satelit menggunakan neural network.' 
    },
    { 
      icon: 'fas fa-shapes', 
      title: 'Polygon Detection', 
      desc: 'Hasil segmentasi divisualisasikan dalam bentuk polygon interaktif yang dapat diukur, diedit, dan diekspor.' 
    },
    { 
      icon: 'fas fa-sliders-h', 
      title: 'Layer Management', 
      desc: 'Kelola berbagai layer peta termasuk basemap, hasil AI, radius, dan lokasi Anda melalui sidebar yang intuitif.' 
    },
    { 
      icon: 'fas fa-cloud-upload-alt', 
      title: 'Simpan & Bagikan', 
      desc: 'Simpan hasil analisis ke akun Anda dan bagikan dengan tim. Akses kapan saja dari perangkat apapun.' 
    }
  ];

  return (
    <section className="features section-hidden min-h-[100vh]" id="features">
      <div className="container">
        <div className="section-title">
          <h2>Fitur Unggulan</h2>
          <p>
            Temukan kekuatan analisis geospasial dengan teknologi AI terbaru 
            untuk berbagai kebutuhan pemetaan dan penelitian
          </p>
        </div>
        
        <div className="features-grid">
          {featuresData.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">
                <i className={feature.icon}></i>
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}