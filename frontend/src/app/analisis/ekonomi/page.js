"use client";
import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { 
  Upload, Download, FileText, AlertCircle, Plus, Minus, ChevronDown, Filter, Save, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import HeaderBar from '@/components/layout/HeaderBar';

// Konfigurasi Kategori Sesuai Data Backend
const KATEGORI = {
  RENDAH: { warna: "#ef4444", label: "RENDAH", status: "KRITIS" },
  SEDANG: { warna: "#f59e0b", label: "SEDANG", status: "WASPADA" },
  TINGGI: { warna: "#10b981", label: "TINGGI", status: "AMAN" }
};

const PUSAT_DEFAULT = [-2.5, 118];
const ZOOM_DEFAULT = 5;

export default function EkonomiPage() {
  const [fileCsv, setFileCsv] = useState(null);
  const [sedangMenganalisis, setSedangMenganalisis] = useState(false);
  const [hasilAnalisis, setHasilAnalisis] = useState(null);
  const [kategoriTerpilih, setKategoriTerpilih] = useState('SEMUA');
  const [adalahClient, setAdalahClient] = useState(false);
  const [petaSedangMemuat, setPetaSedangMemuat] = useState(true);
  
  const [menuUnduhTerbuka, setMenuUnduhTerbuka] = useState(false);
  const [menuFilterTerbuka, setMenuFilterTerbuka] = useState(false);
  
  // Modal Save
  const [modalSaveTerbuka, setModalSaveTerbuka] = useState(false);
  const [namaSimpan, setNamaSimpan] = useState('');
  const [sedangMenyimpan, setSedangMenyimpan] = useState(false);

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
    if (file) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') {
        setFileCsv(file);
        toast.success(`Berkas "${file.name}" siap dianalisis`);
      } else {
        toast.error("Mohon unggah berkas format CSV atau XLSX");
      }
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
      console.error(galat);
    } finally {
      setSedangMenganalisis(false);
    }
  };

  const bukaModalSave = () => {
    if (!hasilAnalisis) return toast.error("Belum ada data untuk disimpan");
    setNamaSimpan('');
    setModalSaveTerbuka(true);
  };

  const simpanAnalisis = async () => {
    if (!namaSimpan.trim()) return toast.error("Nama analisis tidak boleh kosong");
    
    setSedangMenyimpan(true);
    const petunjukMemuat = toast.loading('Menyimpan analisis...');

    try {
      const respons = await axios.post('http://127.0.0.1:8000/api/save-analysis/', {
        name: namaSimpan,
        analysis_data: hasilAnalisis
      });

      toast.dismiss(petunjukMemuat);
      if (respons.data.status === 'success') {
        toast.success(`Analisis "${namaSimpan}" berhasil disimpan!`);
        setModalSaveTerbuka(false);
        setNamaSimpan('');
      }
    } catch (galat) {
      toast.dismiss(petunjukMemuat);
      toast.error('Gagal menyimpan analisis');
      console.error(galat);
    } finally {
      setSedangMenyimpan(false);
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
      toast.success('File Excel berhasil diunduh');
    } else if (format === 'JSON') {
      const gumpalan = new Blob([JSON.stringify(hasilAnalisis, null, 2)], { type: 'application/json' });
      unduhBerkas(gumpalan, 'TERASEG_Pendidikan.json');
      toast.success('File JSON berhasil diunduh');
    } else if (format === 'CSV') {
      const barisCsv = [
        ["Provinsi", "Indeks Risiko", "Kategori", "Rata-rata Partisipasi"].join(","),
        ...ringkasan.map(s => [s.provinsi, s.weri, s.kategori, s.rata_aps].join(","))
      ].join("\n");
      const gumpalan = new Blob([barisCsv], { type: 'text/csv' });
      unduhBerkas(gumpalan, 'TERASEG_Pendidikan.csv');
      toast.success('File CSV berhasil diunduh');
    } else if (format === 'GEOJSON') {
      const gumpalan = new Blob([JSON.stringify(hasilAnalisis.matched_features, null, 2)], { type: 'application/json' });
      unduhBerkas(gumpalan, 'TERASEG_Spasial_Pendidikan.geojson');
      toast.success('File GeoJSON berhasil diunduh');
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <HeaderBar />
      
      {/* UPLOAD SECTION */}
      <div className="pt-24 pb-8 px-4 md:px-8">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-lg dark:shadow-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8">
              <div className="flex-1">
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">
                  Analisis Ekonomi
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                  Unggah data CSV atau XLSX untuk menganalisis partisipasi pendidikan di Indonesia
                </p>
              </div>
              
              <div className="flex flex-wrap gap-3 w-full md:w-auto">
                <div 
                  onClick={() => refInputFile.current?.click()}
                  className="flex-1 md:flex-initial flex items-center justify-center gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-solid border-slate-300 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all group"
                >
                  <Upload size={20} className="text-slate-400 dark:text-slate-500 group-hover:text-blue-500" />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider truncate max-w-[150px]">
                    {fileCsv ? fileCsv.name : "Pilih File (CSV/XLSX)"}
                  </span>
                  <input type="file" ref={refInputFile} hidden onChange={tanganiUnggahFile} accept=".csv,.xlsx,.xls" />
                </div>
                
                <button 
                  onClick={jalankanAnalisis}
                  disabled={sedangMenganalisis || !fileCsv}
                  className="flex-1 md:flex-initial px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-500 dark:to-blue-600 text-white rounded-2xl font-black text-xs tracking-wider hover:shadow-xl hover:shadow-blue-500/30 dark:hover:shadow-blue-400/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase active:scale-95"
                >
                  {sedangMenganalisis ? 'Menganalisis...' : 'Mulai Analisis'}
                </button>

                {hasilAnalisis && (
                  <button 
                    onClick={bukaModalSave}
                    className="flex-1 md:flex-initial px-8 py-4 bg-gradient-to-r from-green-600 to-green-500 dark:from-green-500 dark:to-green-600 text-white rounded-2xl font-black text-xs tracking-wider hover:shadow-xl hover:shadow-green-500/30 dark:hover:shadow-green-400/20 transition-all uppercase active:scale-95 flex items-center gap-2"
                  >
                    <Save size={16} /> Simpan
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL SAVE */}
      {modalSaveTerbuka && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Simpan Analisis</h3>
              <button onClick={() => setModalSaveTerbuka(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">Nama Analisis</label>
              <input 
                type="text"
                value={namaSimpan}
                onChange={(e) => setNamaSimpan(e.target.value)}
                placeholder="contoh: Analisis APS 2024"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-colors"
                onKeyPress={(e) => e.key === 'Enter' && simpanAnalisis()}
              />
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setModalSaveTerbuka(false)}
                className="flex-1 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={simpanAnalisis}
                disabled={sedangMenyimpan || !namaSimpan.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-500 dark:to-blue-600 text-white rounded-xl font-bold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {sedangMenyimpan ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1440px] mx-auto px-4 md:px-8 pb-12">
        {/* AREA PETA */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] md:rounded-[3.5rem] shadow-xl dark:shadow-slate-900/50 border-4 md:border-8 border-white dark:border-slate-800 h-[550px] md:h-[750px] relative overflow-hidden group transition-all duration-300">
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

          {/* KENDALI ZOOM */}
          <div className="absolute top-6 left-6 z-[1000] flex flex-col gap-2">
            <button 
              onClick={() => petaRef.current?.zoomIn()} 
              className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-3 rounded-xl shadow-lg dark:shadow-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-90 border border-slate-200 dark:border-slate-700"
            >
              <Plus size={18}/>
            </button>
            <button 
              onClick={() => petaRef.current?.zoomOut()} 
              className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-3 rounded-xl shadow-lg dark:shadow-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-90 border border-slate-200 dark:border-slate-700"
            >
              <Minus size={18}/>
            </button>
          </div>

          {/* LEGENDA */}
          <div className="absolute top-6 right-6 z-[1000] bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl p-5 rounded-2xl shadow-xl dark:shadow-slate-900/50 border border-slate-200 dark:border-slate-700">
            <div className="space-y-3">
              {Object.entries(KATEGORI).map(([kunci, nilai]) => (
                <div key={kunci} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shadow-inner" style={{ backgroundColor: nilai.warna }}></div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{nilai.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* TABEL HASIL */}
        <div className="mt-12">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] md:rounded-[3.5rem] shadow-xl dark:shadow-slate-900/50 border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-300">
            <div className="p-8 md:p-12 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Matriks Strategi Kebijakan</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mt-2 tracking-wider">
                   Hasil Filter: <span className="text-blue-600 dark:text-blue-400 border-b-2 border-blue-100 dark:border-blue-900">{dataTerfilter.length}</span> Wilayah Ditemukan
                </p>
              </div>
              
              <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                {/* FILTER DROPDOWN */}
                <div className="relative flex-1 sm:flex-initial min-w-[140px]">
                  <button 
                    onClick={() => { setMenuFilterTerbuka(!menuFilterTerbuka); setMenuUnduhTerbuka(false); }}
                    className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-bold hover:border-blue-400 dark:hover:border-blue-500 transition-all flex items-center justify-between gap-3 tracking-wider shadow-sm"
                  >
                    <div className="flex items-center gap-2 uppercase"><Filter size={16} /> {kategoriTerpilih}</div>
                    <ChevronDown size={16} className={`transition-transform ${menuFilterTerbuka ? 'rotate-180' : ''}`} />
                  </button>

                  {menuFilterTerbuka && (
                    <div className="absolute top-full mt-2 left-0 w-full bg-white dark:bg-slate-800 rounded-xl shadow-2xl dark:shadow-slate-900/50 z-[1002] overflow-hidden border border-slate-200 dark:border-slate-700">
                      {["SEMUA", "RENDAH", "SEDANG", "TINGGI"].map(kat => (
                        <button 
                          key={kat} 
                          onClick={() => { setKategoriTerpilih(kat); setMenuFilterTerbuka(false); }}
                          className={`w-full text-left px-5 py-3 text-xs font-bold transition-all border-b border-slate-100 dark:border-slate-700 last:border-0 ${kategoriTerpilih === kat ? 'bg-blue-500 dark:bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                        >
                          {kat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* DOWNLOAD DROPDOWN */}
                <div className="relative flex-1 sm:flex-initial min-w-[140px]">
                  <button 
                    onClick={() => { setMenuUnduhTerbuka(!menuUnduhTerbuka); setMenuFilterTerbuka(false); }}
                    disabled={!hasilAnalisis}
                    className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-500 dark:to-blue-600 text-white rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-blue-500/30 dark:hover:shadow-blue-400/20 transition-all flex items-center justify-between gap-3 tracking-wider disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                  >
                    <div className="flex items-center gap-2 uppercase"><Download size={16} /> UNDUH</div>
                    <ChevronDown size={16} />
                  </button>

                  {menuUnduhTerbuka && (
                    <div className="absolute top-full mt-2 right-0 w-full bg-white dark:bg-slate-800 rounded-xl shadow-2xl dark:shadow-slate-900/50 z-[1002] overflow-hidden border border-slate-200 dark:border-slate-700">
                      {['GEOJSON', 'JSON', 'EXCEL', 'CSV'].map(format => (
                        <button 
                          key={format} 
                          onClick={() => eksporData(format)}
                          className="w-full text-left px-5 py-3 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all border-b border-slate-100 dark:border-slate-700 last:border-0 flex items-center gap-3 uppercase tracking-wider"
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
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="px-8 py-6 text-center">No</th>
                    <th className="px-8 py-6">Wilayah</th>
                    <th className="px-8 py-6 text-center">Indeks Resiko</th>
                    <th className="px-8 py-6">Status</th>
                    <th className="px-8 py-6">Rekomendasi Strategis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {dataTerfilter.length > 0 ? dataTerfilter.map((fitur, indeks) => {
                    const data = fitur.properties.analysis;
                    const rekUtama = data.rekomendasi?.[0];
                    const deskripsiKebijakan = rekUtama?.actions?.join(". ") + ".";
                    
                    return (
                      <tr key={indeks} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all group">
                        <td className="px-8 py-6 text-center text-xs font-bold text-slate-400 dark:text-slate-500 group-hover:text-blue-500 transition-colors">{indeks + 1}</td>
                        <td className="px-8 py-6 text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{data.nama_provinsi}</td>
                        <td className="px-8 py-6 text-center text-sm font-black text-slate-900 dark:text-white font-mono">{data.weri}</td>
                        <td className="px-8 py-6">
                          <span className="px-4 py-2 rounded-lg text-xs font-bold tracking-wider border-2 uppercase bg-white dark:bg-slate-800 shadow-sm" 
                                style={{ borderColor: data.warna + '40', color: data.warna }}>
                            {data.kategori}
                          </span>
                        </td>
                        <td className="px-8 py-6 max-w-xl">
                          <div className="space-y-2">
                            <p className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider underline decoration-2 underline-offset-4">{rekUtama?.title || "STRATEGI"}</p>
                            <p className="text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300 italic group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                              "{deskripsiKebijakan}"
                            </p>
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan="5" className="py-24 text-center">
                        <div className="flex flex-col items-center opacity-20 dark:opacity-30">
                          <AlertCircle size={60} className="text-slate-400 dark:text-slate-600"/>
                          <p className="text-xs font-black uppercase tracking-widest mt-4 text-slate-500 dark:text-slate-600">DATA TIDAK TERSEDIA</p>
                        </div>
                      </td>
                    </tr>
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