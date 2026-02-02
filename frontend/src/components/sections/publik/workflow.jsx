export default function WorkflowSection() {
  const stepsData = [
    { 
      number: '1', 
      title: 'Buat Akun', 
      desc: 'Daftar akun TerraSeg untuk mengakses fitur penyimpanan hasil analisis AI Anda.' 
    },
    { 
      number: '2', 
      title: 'Pilih Area', 
      desc: 'Buka peta dan tentukan area yang ingin dianalisis dengan fitur navigasi yang mudah.' 
    },
    { 
      number: '3', 
      title: 'Aktifkan AI', 
      desc: 'Nyalakan GeoAI untuk memulai segmentasi otomatis elemen geografis.' 
    },
    { 
      number: '4', 
      title: 'Eksplor Hasil', 
      desc: 'Analisis polygon hasil deteksi, simpan, atau ekspor ke format yang diinginkan.' 
    }
  ];

  return (
    <section className="how-it-works section-hidden" id="how-it-works">
      <div className="container">
        <div className="section-title">
          <h2>Cara Menggunakan TerraSeg</h2>
          <p>
            Hanya dengan 4 langkah sederhana, Anda dapat melakukan 
            analisis geospasial yang canggih
          </p>
        </div>
        
        <div className="steps-container">
          <div className="steps-connector"></div>
          
          <div className="steps">
            {stepsData.map((step, index) => (
              <div key={index} className="step">
                <div className="step-number">{step.number}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}