"use client";
import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { 
  Upload, Download, FileText, School, Wallet, HeartPulse, 
  AlertCircle, CheckCircle, Plus, Minus, ChevronDown, Filter, Menu, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import * as XLSX from 'xlsx';

// Konfigurasi Kategori Sesuai Data Backend
const KATEGORI = {
  RENDAH: { warna: "#d73027", label: "RENDAH", status: "KRITIS" },
  SEDANG: { warna: "#fee08b", label: "SEDANG", status: "WASPADA" },
  TINGGI: { warna: "#1a9850", label: "TINGGI", status: "AMAN" }
};

const PUSAT_DEFAULT = [-2.5, 118];
const ZOOM_DEFAULT = 5;

export default function HalamanAnalisisPendidikan() {
  const [fileCsv, setFileCsv] = useState(null);
  const [sedangMenganalisis, setSedangMenganalisis] = useState(false);
  const [hasilAnalisis, setHasilAnalisis] = useState(null);
  const [kategoriTerpilih, setKategoriTerpilih] = useState('SEMUA');
  const [adalahClient, setAdalahClient] = useState(false);
  const [petaSedangMemuat, setPetaSedangMemuat] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [menuUnduhTerbuka, setMenuUnduhTerbuka] = useState(false);
  const [menuFilterTerbuka, setMenuFilterTerbuka] = useState(false);

  const refInputFile = useRef(null);
  const petaRef = useRef(null);

  const [KontainerPeta, setKontainerPeta] = useState(null);
  const [LapisanPeta, setLapisanPeta] = useState(null);
  const [GeoJSON, setGeoJSON] = useState(null);
  const [Skala, setSkala] = useState(null);

  useEffect(() => {
    setAdalahClient(true);
    setPetaSedangMemuat(true);
    import('react-leaflet').then((leaflet) => {
      setKontainerPeta(() => leaflet.MapContainer);
      setLapisanPeta(() => leaflet.TileLayer);
      setGeoJSON(() => leaflet.GeoJSON);
      setSkala(() => leaflet.ScaleControl);
      setPetaSedangMemuat(false);
    });
    import('leaflet/dist/leaflet.css');
  }, []);

  const tanganiUnggahFile = (e) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith('.csv')) {
      setFileCsv(file);
      toast.success(`Berkas "${file.name}" siap dianalisis`);
    } else {
      toast.error("Mohon unggah berkas format CSV");
    }
  };

  const jalankanAnalisis = async () => {
    if (!fileCsv) return toast.error('Silakan pilih berkas terlebih dahulu');
    setSedangMenganalisis(true);
    const petunjukMemuat = toast.loading('Sedang menganalisis data...');
    const dataFormulir = new FormData();
    dataFormulir.append('csv_file', fileCsv);

    try {
      const respons = await axios.post('http://127.0.0.1:8000/api/analyze-aps/', dataFormulir);
      toast.dismiss(petunjukMemuat);
      if (respons.data.status === 'success') {
        setHasilAnalisis(respons.data);
        toast.success(`Berhasil menganalisis ${respons.data.total_matched} wilayah`);
      }
    } catch (galat) {
      toast.dismiss(petunjukMemuat);
      toast.error('Gagal terhubung ke peladen');
    } finally {
      setSedangMenganalisis(false);
    }
  };

  const eksporData = (format) => {
    if (!hasilAnalisis) return toast.error("Data tidak tersedia");
    const ringkasan = hasilAnalisis.analysis_summary;
    setMenuUnduhTerbuka(false);

    if (format === 'EXCEL') {
      const lembarKerja = XLSX.utils.json_to_sheet(ringkasan);
      const bukuKerja = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(bukuKerja, lembarKerja, "Analisis Pendidikan");
      XLSX.writeFile(bukuKerja, "TERASEG_Pendidikan.xlsx");
    } else if (format === 'JSON') {
      const gumpalan = new Blob([JSON.stringify(hasilAnalisis, null, 2)], { type: 'application/json' });
      unduhBerkas(gumpalan, 'TERASEG_Pendidikan.json');
    } else if (format === 'CSV') {
      const barisCsv = [
        ["Provinsi", "Indeks Risiko", "Kategori", "Rata-rata Partisipasi"].join(","),
        ...ringkasan.map(s => [s.provinsi, s.weri, s.kategori, s.rata_aps].join(","))
      ].join("\n");
      const gumpalan = new Blob([barisCsv], { type: 'text/csv' });
      unduhBerkas(gumpalan, 'TERASEG_Pendidikan.csv');
    } else if (format === 'GEOJSON') {
      const gumpalan = new Blob([JSON.stringify(hasilAnalisis.matched_features, null, 2)], { type: 'application/json' });
      unduhBerkas(gumpalan, 'TERASEG_Spasial_Pendidikan.geojson');
    }
  };

  const unduhBerkas = (gumpalan, namaBerkas) => {
    const tautan = URL.createObjectURL(gumpalan);
    const elemen = document.createElement('a');
    elemen.href = tautan; elemen.download = namaBerkas; elemen.click();
    URL.revokeObjectURL(tautan);
  };

  const ambilDataTabelTerfilter = () => {
    if (!hasilAnalisis?.matched_features?.features) return [];
    const fitur = hasilAnalisis.matched_features.features;
    if (kategoriTerpilih === 'SEMUA') return fitur;
    return fitur.filter(f => f.properties?.analysis?.kategori === kategoriTerpilih);
  };

  const dataTerfilter = ambilDataTabelTerfilter();

  if (!adalahClient) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900 overflow-x-hidden">
      {/* HEADER UTAMA */}
      <nav className="bg-white border-b px-4 md:px-8 py-5 flex justify-between items-center shadow-sm sticky top-0 z-[1001]">
        {/* LOGO KIRI */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-9 h-9 bg-[#0f172a] rounded-xl flex items-center justify-center shadow-lg shadow-slate-200">
            <div className="w-3 h-3 border-2 border-cyan-400 rounded-full animate-pulse"></div>
          </div>
          <span className="text-xl font-black text-[#0f172a] tracking-[0.2em] uppercase">TERASEG</span>
        </div>

        {/* NAVIGASI TENGAH (Desktop) */}
        <div className="hidden lg:flex items-center gap-10 absolute left-1/2 -translate-x-1/2">
          <Link href="/ekonomi" className="flex items-center gap-2 text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] hover:text-blue-600 transition-all">
            <Wallet size={15} /> Ekonomi
          </Link>
          <Link href="/pendidikan" className="flex items-center gap-2 text-[11px] font-black text-blue-600 border-b-2 border-blue-600 pb-1 uppercase tracking-[0.15em]">
            <School size={15} /> Pendidikan
          </Link>
          <Link href="/kesehatan" className="flex items-center gap-2 text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] hover:text-blue-600 transition-all">
            <HeartPulse size={15} /> Kesehatan
          </Link>
        </div>

        {/* UNGGAH & MENU MOBILE (Kanan) */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3">
            <div 
              onClick={() => refInputFile.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-white hover:border-blue-400 hover:shadow-md transition-all group"
            >
              <Upload size={14} className="text-slate-400 group-hover:text-blue-500" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider truncate max-w-[100px]">
                {fileCsv ? fileCsv.name : "UNGGAH"}
              </span>
              <input type="file" ref={refInputFile} hidden onChange={tanganiUnggahFile} accept=".csv" />
            </div>
            <button 
              onClick={jalankanAnalisis}
              disabled={sedangMenganalisis || !fileCsv}
              className="px-6 py-2.5 bg-[#0f172a] text-white rounded-xl font-black text-[10px] tracking-[0.2em] hover:bg-blue-600 hover:shadow-xl hover:shadow-blue-200 disabled:opacity-50 transition-all uppercase active:scale-95"
            >
              ANALISIS
            </button>
          </div>
          
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2 text-slate-800 bg-slate-50 rounded-xl">
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* MENU MOBILE OVERLAY */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[1002] bg-white p-8 flex flex-col gap-6 animate-in slide-in-from-top duration-300">
          <div className="flex justify-between items-center mb-8">
            <span className="font-black text-[#0f172a] tracking-[0.2em] uppercase">MENU</span>
            <button onClick={() => setMobileMenuOpen(false)} className="p-2 bg-slate-100 rounded-full"><X size={24}/></button>
          </div>
          <Link href="/ekonomi" className="flex items-center gap-4 text-sm font-black text-slate-500 uppercase tracking-[0.2em] py-4 border-b border-slate-50">
            <Wallet size={20} /> Ekonomi
          </Link>
          <Link href="/pendidikan" className="flex items-center gap-4 text-sm font-black text-blue-600 uppercase tracking-[0.2em] py-4 border-b border-slate-50">
            <School size={20} /> Pendidikan
          </Link>
          <Link href="/kesehatan" className="flex items-center gap-4 text-sm font-black text-slate-500 uppercase tracking-[0.2em] py-4 border-b border-slate-50">
            <HeartPulse size={20} /> Kesehatan
          </Link>
          <div className="mt-auto flex flex-col gap-4">
             <div onClick={() => refInputFile.current?.click()} className="flex justify-center items-center gap-3 p-5 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
                <Upload size={20} className="text-slate-400" />
                <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">{fileCsv ? fileCsv.name : "PILIH BERKAS CSV"}</span>
             </div>
             <button onClick={() => { jalankanAnalisis(); setMobileMenuOpen(false); }} className="w-full p-5 bg-[#0f172a] text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-200">MULAI ANALISIS ⚡</button>
          </div>
        </div>
      )}

      <div className="max-w-[1440px] mx-auto p-4 md:p-8">
        {/* AREA PETA */}
        <div className="bg-white rounded-[2.5rem] md:rounded-[4rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border-4 md:border-[12px] border-white h-[550px] md:h-[750px] relative overflow-hidden group">
          {!petaSedangMemuat && KontainerPeta && (
            <KontainerPeta 
              center={PUSAT_DEFAULT} 
              zoom={ZOOM_DEFAULT} 
              className="h-full w-full z-0" 
              zoomControl={false}
              ref={petaRef}
            >
              <LapisanPeta url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
              {hasilAnalisis?.matched_features?.features && (
                <GeoJSON 
                  key={JSON.stringify(hasilAnalisis.matched_features.features) + kategoriTerpilih}
                  data={{ type: "FeatureCollection", features: hasilAnalisis.matched_features.features }}
                  style={(fitur) => {
                    const analisis = fitur.properties?.analysis || {};
                    const terlihat = kategoriTerpilih === 'SEMUA' || analisis.kategori === kategoriTerpilih;
                    return { 
                      fillColor: analisis.warna || "#cbd5e1", 
                      weight: 2, opacity: terlihat ? 1 : 0, 
                      color: 'white', fillOpacity: terlihat ? 0.75 : 0 
                    };
                  }}
                  onEachFeature={(fitur, lapisan) => {
                    const analisis = fitur.properties?.analysis || {};
                    const dataAps = analisis.aps_data || {};
                    const wawasan = analisis.insights?.map(i => `<div style="margin-bottom:6px; padding-left:10px; border-left:3px solid ${analisis.warna}; font-weight: 600;">${i}</div>`).join('') || '';
                    
                    lapisan.bindTooltip(`
                      <div style="font-family: inherit; padding: 6px;">
                        <div style="font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.1em;">${analisis.nama_provinsi}</div>
                        <div style="font-size: 10px; font-weight: 800; color: ${analisis.warna}; margin-top:2px;">STATUS: ${analisis.kategori}</div>
                      </div>
                    `, { sticky: true, opacity: 0.95 });

                    const isiPopup = `
                      <div style="font-family: inherit; min-width: 280px; color: #1e293b; padding: 5px;">
                        <div style="background: ${analisis.warna}; color: white; padding: 15px; border-radius: 12px 12px 4px 4px; margin-bottom: 10px;">
                          <div style="font-weight: 900; font-size: 16px; text-transform: uppercase; letter-spacing: 0.1em;">${analisis.nama_provinsi}</div>
                          <div style="font-size: 10px; font-weight: 800; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px;">Analisis Strategis Wilayah</div>
                        </div>
                        <div style="padding: 10px;">
                          <div style="font-size: 10px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; border-bottom: 2px solid #f1f5f9; padding-bottom: 4px;">Wawasan Utama</div>
                          <div style="font-size: 12px; color: #334155; line-height: 1.5; margin-bottom: 15px;">${wawasan}</div>
                          <div style="font-size: 10px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; border-bottom: 2px solid #f1f5f9; padding-bottom: 4px;">Matriks Partisipasi</div>
                          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                            <div style="background: #f8fafc; padding: 10px; border-radius: 8px; text-align:center; border: 1px solid #f1f5f9;">
                              <div style="font-size: 9px; font-weight: 900; color: #0369a1; text-transform: uppercase;">SD</div>
                              <div style="font-size: 13px; font-weight: 900;">${dataAps.APS_7_12 || '-'}%</div>
                            </div>
                            <div style="background: #f8fafc; padding: 10px; border-radius: 8px; text-align:center; border: 1px solid #f1f5f9;">
                              <div style="font-size: 9px; font-weight: 900; color: #a16207; text-transform: uppercase;">SMP</div>
                              <div style="font-size: 13px; font-weight: 900;">${dataAps.APS_13_15 || '-'}%</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    `;
                    lapisan.bindPopup(isiPopup);
                  }}
                />
              )}
              {Skala && <Skala position="bottomleft" metric={true} imperial={false} />}
            </KontainerPeta>
          )}

          {/* KENDALI ZOOM (POJOK KIRI ATAS) */}
          <div className="absolute top-8 left-8 z-[1000] flex flex-col gap-3">
            <button onClick={() => petaRef.current?.zoomIn()} className="bg-[#0f172a] text-white p-3.5 rounded-2xl shadow-2xl hover:bg-blue-600 transition-all active:scale-90"><Plus size={20}/></button>
            <button onClick={() => petaRef.current?.zoomOut()} className="bg-[#0f172a] text-white p-3.5 rounded-2xl shadow-2xl hover:bg-blue-600 transition-all active:scale-90"><Minus size={20}/></button>
          </div>

          {/* LEGENDA (POJOK KANAN ATAS) */}
          <div className="absolute top-8 right-8 z-[1000] bg-white/95 backdrop-blur-xl p-5 rounded-[2rem] shadow-2xl border border-white/50">
            <div className="space-y-3">
              {Object.entries(KATEGORI).map(([kunci, nilai]) => (
                <div key={kunci} className="flex items-center gap-4">
                  <div className="w-3.5 h-3.5 rounded-full shadow-inner" style={{ backgroundColor: nilai.warna }}></div>
                  <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{nilai.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* TABEL HASIL */}
        <div className="mt-12 pb-24">
          <div className="bg-white rounded-[2.5rem] md:rounded-[4rem] shadow-[0_20px_60px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden">
            <div className="p-8 md:p-12 border-b flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-white">
              <div>
                <h3 className="text-2xl font-black text-[#0f172a] uppercase tracking-tight">Matriks Strategi Kebijakan</h3>
                <p className="text-[11px] text-gray-400 font-bold uppercase mt-2 tracking-widest">
                   Hasil Filter: <span className="text-blue-600 border-b-2 border-blue-100">{dataTerfilter.length}</span> Wilayah Ditemukan
                </p>
              </div>
              
              <div className="flex flex-wrap gap-4 w-full lg:w-auto relative">
                {/* FILTER DROPDOWN */}
                <div className="relative flex-grow sm:flex-grow-0">
                  <button 
                    onClick={() => { setMenuFilterTerbuka(!menuFilterTerbuka); setMenuUnduhTerbuka(false); }}
                    className="w-full px-6 py-4 bg-white border-2 border-slate-100 text-[#0f172a] rounded-2xl text-[10px] font-black hover:border-blue-400 transition-all flex items-center justify-between gap-4 tracking-widest shadow-sm"
                  >
                    <div className="flex items-center gap-2 uppercase"><Filter size={16} /> {kategoriTerpilih}</div>
                    <ChevronDown size={16} className={`transition-transform ${menuFilterTerbuka ? 'rotate-180' : ''}`} />
                  </button>

                  {menuFilterTerbuka && (
                    <div className="absolute top-full mt-3 left-0 w-full sm:w-56 bg-[#0f172a] rounded-2xl shadow-2xl z-[1002] overflow-hidden border border-slate-800">
                      {["SEMUA", "RENDAH", "SEDANG", "TINGGI"].map(kat => (
                        <button 
                          key={kat} 
                          onClick={() => { setKategoriTerpilih(kat); setMenuFilterTerbuka(false); }}
                          className={`w-full text-left px-6 py-4 text-[10px] font-black transition-all border-b border-slate-800 last:border-0 ${kategoriTerpilih === kat ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                        >
                          {kat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* DOWNLOAD DROPDOWN */}
                <div className="relative flex-grow sm:flex-grow-0">
                  <button 
                    onClick={() => { setMenuUnduhTerbuka(!menuUnduhTerbuka); setMenuFilterTerbuka(false); }}
                    disabled={!hasilAnalisis}
                    className="w-full px-8 py-4 bg-[#0f172a] text-white rounded-2xl text-[10px] font-black hover:bg-blue-600 transition-all flex items-center justify-between gap-4 tracking-widest shadow-xl shadow-slate-200 disabled:opacity-20 active:scale-95"
                  >
                    <div className="flex items-center gap-2 uppercase"><Download size={16} /> UNDUH</div>
                    <ChevronDown size={16} />
                  </button>

                  {menuUnduhTerbuka && (
                    <div className="absolute top-full mt-3 right-0 w-full sm:w-56 bg-[#0f172a] rounded-2xl shadow-2xl z-[1002] overflow-hidden border border-slate-800">
                      {['GEOJSON', 'JSON', 'EXCEL', 'CSV'].map(format => (
                        <button 
                          key={format} 
                          onClick={() => eksporData(format)}
                          className="w-full text-left px-6 py-4 text-[10px] font-black text-slate-400 hover:text-white hover:bg-slate-800 transition-all border-b border-slate-800 last:border-0 flex items-center gap-3 uppercase tracking-widest"
                        >
                          <FileText size={16} className="text-blue-500" /> {format}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50/50 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    <th className="px-10 py-10 text-center">No</th>
                    <th className="px-10 py-10">Wilayah</th>
                    <th className="px-10 py-10 text-center">Indeks Resiko</th>
                    <th className="px-10 py-10">Status</th>
                    <th className="px-10 py-10">Rekomendasi Strategis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {dataTerfilter.length > 0 ? dataTerfilter.map((fitur, indeks) => {
                    const data = fitur.properties.analysis;
                    const rekUtama = data.rekomendasi?.[0];
                    const deskripsiKebijakan = rekUtama?.actions?.join(". ") + ".";
                    
                    return (
                      <tr key={indeks} className="hover:bg-slate-50/40 transition-all group">
                        <td className="px-10 py-10 text-center text-[11px] font-black text-slate-300 group-hover:text-blue-500 transition-colors">{indeks + 1}</td>
                        <td className="px-10 py-10 text-sm font-black text-[#0f172a] uppercase tracking-tight">{data.nama_provinsi}</td>
                        <td className="px-10 py-10 text-center text-sm font-black text-[#0f172a] font-mono">{data.weri}</td>
                        <td className="px-10 py-10">
                          <span className="px-5 py-2.5 rounded-xl text-[10px] font-black tracking-widest border-2 uppercase bg-white shadow-sm" 
                                style={{ borderColor: data.warna + '40', color: '#0f172a' }}>
                            {data.kategori}
                          </span>
                        </td>
                        <td className="px-10 py-10 max-w-xl text-[#0f172a]">
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest underline decoration-2 underline-offset-4">{rekUtama?.title || "STRATEGI"}</p>
                            <p className="text-[13px] font-bold leading-relaxed italic opacity-70 group-hover:opacity-100 transition-opacity">
                              "{deskripsiKebijakan}"
                            </p>
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan="5" className="py-32 text-center"><div className="flex flex-col items-center opacity-20"><AlertCircle size={60}/><p className="text-xs font-black uppercase tracking-widest mt-4">DATA TIDAK TERSEDIA</p></div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}