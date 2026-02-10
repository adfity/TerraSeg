"use client";
import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { 
  Play, Download, AlertCircle, Plus, Minus, ChevronDown, Filter, Save, X, Activity, RefreshCw, FileDown, Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import HeaderBar from '@/components/layout/HeaderBar';

// Konfigurasi Kategori
const KATEGORI = {
  KRITIS: { warna: "#ef4444", label: "KRITIS", status: "DARURAT" },
  WASPADA: { warna: "#f59e0b", label: "WASPADA", status: "PERLU PERHATIAN" },
  STABIL: { warna: "#10b981", label: "STABIL", status: "KONDISI BAIK" }
};

const PUSAT_DEFAULT = [-2.5, 118];
const ZOOM_DEFAULT = 5;

export default function KesehatanPage() {
  const [sedangMenganalisis, setSedangMenganalisis] = useState(false);
  const [hasilAnalisis, setHasilAnalisis] = useState(null);
  const [kategoriTerpilih, setKategoriTerpilih] = useState('SEMUA');
  const [adalahClient, setAdalahClient] = useState(false);
  const [petaSedangMemuat, setPetaSedangMemuat] = useState(true);
  
  const [menuUnduhTerbuka, setMenuUnduhTerbuka] = useState(false);
  const [menuFilterTerbuka, setMenuFilterTerbuka] = useState(false);
  const [menuDatasetTerbuka, setMenuDatasetTerbuka] = useState(false);
  
  // Modal Save
  const [modalSaveTerbuka, setModalSaveTerbuka] = useState(false);
  const [namaSimpan, setNamaSimpan] = useState('');
  const [sedangMenyimpan, setSedangMenyimpan] = useState(false);

  // Metodologi
  const [showMethodology, setShowMethodology] = useState(false);

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

  const jalankanAnalisisBPS = async () => {
    setSedangMenganalisis(true);
    const petunjukMemuat = toast.loading('Mengambil data dari BPS Web API...\nIni mungkin memakan waktu beberapa menit');

    try {
      const respons = await axios.post('http://127.0.0.1:8000/api/analyze-health-bps/', {
        provinces: 'ALL'
      });

      toast.dismiss(petunjukMemuat);
      
      if (respons.data.status === 'success') {
        setHasilAnalisis(respons.data);
        toast.success(`Berhasil menganalisis ${respons.data.total_success} dari ${respons.data.total_attempted} provinsi!`, {
          duration: 5000
        });
      }
    } catch (galat) {
      toast.dismiss(petunjukMemuat);
      
      if (galat.response?.data?.error) {
        toast.error(galat.response.data.error);
      } else {
        toast.error('Gagal terhubung ke server');
      }
      
      console.error(galat);
    } finally {
      setSedangMenganalisis(false);
    }
  };

  const resetAnalisis = () => {
    setHasilAnalisis(null);
    setKategoriTerpilih('SEMUA');
    toast.success('Analisis direset');
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
      const respons = await axios.post('http://127.0.0.1:8000/api/save-health-analysis/', {
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

  const downloadDataset = (indikator) => {
    if (!hasilAnalisis?.datasets) return toast.error("Dataset tidak tersedia");
    
    const dataset = hasilAnalisis.datasets[indikator];
    if (!dataset || dataset.length === 0) return toast.error(`Dataset ${indikator} kosong`);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dataset);
    XLSX.utils.book_append_sheet(wb, ws, indikator);
    XLSX.writeFile(wb, `Dataset_${indikator}_Kesehatan.xlsx`);
    
    toast.success(`Dataset ${indikator} berhasil diunduh`);
    setMenuDatasetTerbuka(false);
  };

  const eksporData = (format) => {
    if (!hasilAnalisis) return toast.error("Data tidak tersedia");
    const ringkasan = hasilAnalisis.analysis_summary;
    setMenuUnduhTerbuka(false);

    if (format === 'EXCEL') {
      const dataExport = ringkasan.map(item => ({
        'Provinsi': item.provinsi,
        'Kategori': item.kategori,
        'Indeks Kesehatan': item.health_index,
        'AKB (per 1000)': item.akb || '-',
        'Stunting (%)': item.stunting || '-',
        'TB (per 100.000)': item.tb || '-'
      }));
      
      const lembarKerja = XLSX.utils.json_to_sheet(dataExport);
      const bukuKerja = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(bukuKerja, lembarKerja, "Analisis Kesehatan BPS");
      XLSX.writeFile(bukuKerja, "TERASEG_Kesehatan_BPS.xlsx");
      toast.success('File Excel berhasil diunduh');
    } else if (format === 'JSON') {
      const gumpalan = new Blob([JSON.stringify(hasilAnalisis, null, 2)], { type: 'application/json' });
      unduhBerkas(gumpalan, 'TERASEG_Kesehatan_BPS.json');
      toast.success('File JSON berhasil diunduh');
    } else if (format === 'CSV') {
      const barisCsv = [
        ["Provinsi", "Kategori", "Indeks Kesehatan", "AKB", "Stunting", "TB"].join(","),
        ...ringkasan.map(s => [
          s.provinsi, 
          s.kategori, 
          s.health_index,
          s.akb || '-',
          s.stunting || '-',
          s.tb || '-'
        ].join(","))
      ].join("\n");
      const gumpalan = new Blob([barisCsv], { type: 'text/csv' });
      unduhBerkas(gumpalan, 'TERASEG_Kesehatan_BPS.csv');
      toast.success('File CSV berhasil diunduh');
    } else if (format === 'GEOJSON') {
      const gumpalan = new Blob([JSON.stringify(hasilAnalisis.matched_features, null, 2)], { type: 'application/json' });
      unduhBerkas(gumpalan, 'TERASEG_Spasial_Kesehatan.geojson');
      toast.success('File GeoJSON berhasil diunduh');
    }
  };

  const unduhBerkas = (gumpalan, namaBerkas) => {
    const tautan = URL.createObjectURL(gumpalan);
    const elemen = document.createElement('a');
    elemen.href = tautan; 
    elemen.download = namaBerkas; 
    elemen.click();
    URL.revokeObjectURL(tautan);
  };

  const ambilDataTabelTerfilter = () => {
    if (!hasilAnalisis?.matched_features?.features) return [];
    const fitur = hasilAnalisis.matched_features.features;
    if (kategoriTerpilih === 'SEMUA') return fitur;
    return fitur.filter(f => f.properties?.health_analysis?.kategori === kategoriTerpilih);
  };

  const dataTerfilter = ambilDataTabelTerfilter();

  if (!adalahClient) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <HeaderBar />
      
      {/* HEADER SECTION */}
      <div className="pt-24 pb-8 px-4 md:px-8">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-lg dark:shadow-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Activity className="text-red-500" size={32} />
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    Analisis Kesehatan
                  </h2>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                  Analisis data kesehatan nasional menggunakan BPS Web API (Data Terbaru)
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold rounded-lg">
                    🚼 Angka Kematian Bayi
                  </span>
                  <span className="px-3 py-1 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-bold rounded-lg">
                    👶 Prevalensi Stunting
                  </span>
                  <span className="px-3 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-bold rounded-lg">
                    🦠 Insiden Tuberkulosis
                  </span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3 w-full md:w-auto">
                <button 
                  onClick={jalankanAnalisisBPS}
                  disabled={sedangMenganalisis}
                  className="flex-1 md:flex-initial px-8 py-4 bg-gradient-to-r from-red-600 to-red-500 dark:from-red-500 dark:to-red-600 text-white rounded-2xl font-black text-xs tracking-wider hover:shadow-xl hover:shadow-red-500/30 dark:hover:shadow-red-400/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase active:scale-95 flex items-center gap-2"
                >
                  <Play size={16} className={sedangMenganalisis ? "animate-pulse" : ""} />
                  {sedangMenganalisis ? 'Mengambil Data...' : 'Mulai Analisis'}
                </button>

                {hasilAnalisis && (
                  <>
                    <button 
                      onClick={resetAnalisis}
                      className="flex-1 md:flex-initial px-8 py-4 bg-gradient-to-r from-slate-600 to-slate-500 dark:from-slate-500 dark:to-slate-600 text-white rounded-2xl font-black text-xs tracking-wider hover:shadow-xl hover:shadow-slate-500/30 dark:hover:shadow-slate-400/20 transition-all uppercase active:scale-95 flex items-center gap-2"
                    >
                      <RefreshCw size={16} /> Reset
                    </button>

                    <button 
                      onClick={bukaModalSave}
                      className="flex-1 md:flex-initial px-8 py-4 bg-gradient-to-r from-green-600 to-green-500 dark:from-green-500 dark:to-green-600 text-white rounded-2xl font-black text-xs tracking-wider hover:shadow-xl hover:shadow-green-500/30 dark:hover:shadow-green-400/20 transition-all uppercase active:scale-95 flex items-center gap-2"
                    >
                      <Save size={16} /> Simpan
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* INFO CARD */}
            {hasilAnalisis && (
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 border border-blue-200 dark:border-blue-800">
                  <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Total Provinsi</div>
                  <div className="text-2xl font-black text-blue-700 dark:text-blue-300">{hasilAnalisis.total_success}/{hasilAnalisis.total_attempted}</div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 border border-red-200 dark:border-red-800">
                  <div className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">Kritis</div>
                  <div className="text-2xl font-black text-red-700 dark:text-red-300">{hasilAnalisis.kategori_distribusi?.KRITIS || 0}</div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl p-4 border border-yellow-200 dark:border-yellow-800">
                  <div className="text-xs font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-wider mb-1">Waspada</div>
                  <div className="text-2xl font-black text-yellow-700 dark:text-yellow-300">{hasilAnalisis.kategori_distribusi?.WASPADA || 0}</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4 border border-green-200 dark:border-green-800">
                  <div className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">Stabil</div>
                  <div className="text-2xl font-black text-green-700 dark:text-green-300">{hasilAnalisis.kategori_distribusi?.STABIL || 0}</div>
                </div>
              </div>
            )}

            {/* Sumber Data Info */}
            {hasilAnalisis && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider mb-2">📊 Sumber Data</div>
                <div className="text-sm text-blue-600 dark:text-blue-400 font-semibold">
                  {hasilAnalisis.source}
                </div>
                <div className="text-xs text-blue-500 dark:text-blue-500 mt-1">
                  ✓ Data BPS API: {hasilAnalisis.total_api_success} provinsi | ⚙ Data Sintetis: {hasilAnalisis.total_synthetic} provinsi
                </div>
              </div>
            )}
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
                placeholder="contoh: Analisis Kesehatan Q1 2024"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:border-red-500 dark:focus:border-red-400 outline-none transition-colors"
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
                className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 dark:from-red-500 dark:to-red-600 text-white rounded-xl font-bold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
                    const analisis = fitur.properties?.health_analysis || {};
                    const terlihat = kategoriTerpilih === 'SEMUA' || analisis.kategori === kategoriTerpilih;
                    return { 
                      fillColor: analisis.warna || "#cbd5e1", 
                      weight: 2, 
                      opacity: terlihat ? 1 : 0, 
                      color: 'white', 
                      fillOpacity: terlihat ? 0.75 : 0 
                    };
                  }}
                  onEachFeature={(fitur, lapisan) => {
                    const analisis = fitur.properties?.health_analysis || {};
                    const dataKesehatan = analisis.data_kesehatan || {};
                    const wawasan = analisis.insights?.map(i => `<div style="margin-bottom:6px; padding-left:10px; border-left:3px solid ${analisis.warna}; font-weight: 600;">${i}</div>`).join('') || '';
                    
                    lapisan.bindTooltip(`
                      <div style="font-family: inherit; padding: 6px;">
                        <div style="font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.1em;">${analisis.nama_provinsi}</div>
                        <div style="font-size: 10px; font-weight: 800; color: ${analisis.warna}; margin-top:2px;">STATUS: ${analisis.kategori}</div>
                        <div style="font-size: 9px; font-weight: 700; color: #64748b; margin-top:4px;">Indeks: ${analisis.health_index}</div>
                      </div>
                    `, { sticky: true, opacity: 0.95 });

                    const isiPopup = `
                      <div style="font-family: inherit; min-width: 300px; color: #1e293b; padding: 5px;">
                        <div style="background: ${analisis.warna}; color: white; padding: 15px; border-radius: 12px 12px 4px 4px; margin-bottom: 10px;">
                          <div style="font-weight: 900; font-size: 16px; text-transform: uppercase; letter-spacing: 0.1em;">${analisis.nama_provinsi}</div>
                          <div style="font-size: 10px; font-weight: 800; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px;">Indeks Kesehatan: ${analisis.health_index}</div>
                        </div>
                        <div style="padding: 10px;">
                          <div style="font-size: 10px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; border-bottom: 2px solid #f1f5f9; padding-bottom: 4px;">Indikator Kesehatan</div>
                          <div style="display: grid; grid-template-columns: 1fr; gap: 8px; margin-bottom: 15px;">
                            <div style="background: #fee2e2; padding: 10px; border-radius: 8px; border: 1px solid #fca5a5;">
                              <div style="font-size: 9px; font-weight: 900; color: #7f1d1d; text-transform: uppercase;">Angka Kematian Bayi</div>
                              <div style="font-size: 13px; font-weight: 900; color: #dc2626;">${dataKesehatan.AKB ? dataKesehatan.AKB + ' per 1000 kelahiran' : '-'}</div>
                            </div>
                            <div style="background: #fed7aa; padding: 10px; border-radius: 8px; border: 1px solid #fdba74;">
                              <div style="font-size: 9px; font-weight: 900; color: #7c2d12; text-transform: uppercase;">Prevalensi Stunting</div>
                              <div style="font-size: 13px; font-weight: 900; color: #ea580c;">${dataKesehatan.STUNTING ? dataKesehatan.STUNTING + '%' : '-'}</div>
                            </div>
                            <div style="background: #f3e8ff; padding: 10px; border-radius: 8px; border: 1px solid #d8b4fe;">
                              <div style="font-size: 9px; font-weight: 900; color: #581c87; text-transform: uppercase;">Insiden Tuberkulosis</div>
                              <div style="font-size: 13px; font-weight: 900; color: #9333ea;">${dataKesehatan.TB ? dataKesehatan.TB + ' per 100.000' : '-'}</div>
                            </div>
                          </div>
                          <div style="font-size: 10px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; border-bottom: 2px solid #f1f5f9; padding-bottom: 4px;">Analisis</div>
                          <div style="font-size: 12px; color: #334155; line-height: 1.5;">${wawasan}</div>
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

        {/* METODOLOGI */}
        {hasilAnalisis && (
          <div className="mt-8">
            <button
              onClick={() => setShowMethodology(!showMethodology)}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 dark:from-indigo-500 dark:to-indigo-600 text-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Info size={24} />
                <span className="text-lg font-black uppercase tracking-wide">Metodologi & Rumus Perhitungan</span>
              </div>
              <ChevronDown size={20} className={`transition-transform ${showMethodology ? 'rotate-180' : ''}`} />
            </button>

            {showMethodology && hasilAnalisis.methodology && (
              <div className="mt-4 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
                {/* Formula */}
                <div className="mb-8">
                  <h3 className="text-xl font-black text-indigo-600 dark:text-indigo-400 uppercase mb-4">📐 Rumus Indeks Kesehatan</h3>
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-xl border-2 border-indigo-200 dark:border-indigo-800">
                    <code className="text-lg font-mono font-bold text-indigo-900 dark:text-indigo-300">
                      {hasilAnalisis.methodology.formula}
                    </code>
                  </div>
                </div>

                {/* Scoring */}
                <div className="mb-8">
                  <h3 className="text-xl font-black text-purple-600 dark:text-purple-400 uppercase mb-4">📊 Sistem Penilaian</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    {Object.entries(hasilAnalisis.methodology.scoring).map(([key, values]) => (
                      <div key={key} className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-xl border border-purple-200 dark:border-purple-800">
                        <h4 className="font-black text-purple-900 dark:text-purple-300 uppercase mb-3">{key}</h4>
                        <ul className="space-y-2 text-sm">
                          {Object.entries(values).map(([kategori, nilai]) => (
                            <li key={kategori} className="text-purple-700 dark:text-purple-400 font-semibold">
                              <span className="capitalize">{kategori}:</span> {nilai}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Category */}
                <div>
                  <h3 className="text-xl font-black text-pink-600 dark:text-pink-400 uppercase mb-4">🏷️ Kategori Hasil</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    {Object.entries(hasilAnalisis.methodology.category).map(([cat, desc]) => (
                      <div key={cat} className="bg-pink-50 dark:bg-pink-900/20 p-6 rounded-xl border border-pink-200 dark:border-pink-800">
                        <div className="font-black text-pink-900 dark:text-pink-300 uppercase mb-2">{cat}</div>
                        <div className="text-sm font-semibold text-pink-700 dark:text-pink-400">{desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Catatan Sumber Data */}
                <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <h4 className="font-black text-blue-900 dark:text-blue-300 uppercase mb-3">📅 Tentang Data</h4>
                  <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-400">
                    <li>✓ <strong>Sumber API:</strong> Data langsung dari BPS Web API (webapi.bps.go.id)</li>
                    <li>✓ <strong>Pembaruan:</strong> Data yang diambil adalah data terbaru yang tersedia di BPS</li>
                    <li>✓ <strong>Fallback:</strong> Jika API tidak tersedia, sistem menggunakan data sintetis berbasis pola regional</li>
                    <li>✓ <strong>Provinsi:</strong> 38 provinsi Indonesia (termasuk pemekaran Papua terbaru)</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TABEL HASIL */}
        <div className="mt-12">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] md:rounded-[3.5rem] shadow-xl dark:shadow-slate-900/50 border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-300">
            <div className="p-8 md:p-12 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Matriks Kesehatan Nasional</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mt-2 tracking-wider">
                   Hasil Filter: <span className="text-red-600 dark:text-red-400 border-b-2 border-red-100 dark:border-red-900">{dataTerfilter.length}</span> Wilayah
                </p>
              </div>
              
              <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                {/* FILTER DROPDOWN */}
                <div className="relative flex-1 sm:flex-initial min-w-[140px]">
                  <button 
                    onClick={() => { setMenuFilterTerbuka(!menuFilterTerbuka); setMenuUnduhTerbuka(false); setMenuDatasetTerbuka(false); }}
                    className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-bold hover:border-red-400 dark:hover:border-red-500 transition-all flex items-center justify-between gap-3 tracking-wider shadow-sm"
                  >
                    <div className="flex items-center gap-2 uppercase"><Filter size={16} /> {kategoriTerpilih}</div>
                    <ChevronDown size={16} className={`transition-transform ${menuFilterTerbuka ? 'rotate-180' : ''}`} />
                  </button>

                  {menuFilterTerbuka && (
                    <div className="absolute top-full mt-2 left-0 w-full bg-white dark:bg-slate-800 rounded-xl shadow-2xl dark:shadow-slate-900/50 z-[1002] overflow-hidden border border-slate-200 dark:border-slate-700">
                      {["SEMUA", "KRITIS", "WASPADA", "STABIL"].map(kat => (
                        <button 
                          key={kat} 
                          onClick={() => { setKategoriTerpilih(kat); setMenuFilterTerbuka(false); }}
                          className={`w-full text-left px-5 py-3 text-xs font-bold transition-all border-b border-slate-100 dark:border-slate-700 last:border-0 ${kategoriTerpilih === kat ? 'bg-red-500 dark:bg-red-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                        >
                          {kat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* DOWNLOAD DATASET DROPDOWN */}
                <div className="relative flex-1 sm:flex-initial min-w-[180px]">
                  <button 
                    onClick={() => { setMenuDatasetTerbuka(!menuDatasetTerbuka); setMenuUnduhTerbuka(false); setMenuFilterTerbuka(false); }}
                    disabled={!hasilAnalisis}
                    className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-500 dark:from-purple-500 dark:to-purple-600 text-white rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-purple-500/30 dark:hover:shadow-purple-400/20 transition-all flex items-center justify-between gap-3 tracking-wider disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                  >
                    <div className="flex items-center gap-2 uppercase"><FileDown size={16} /> DATASET</div>
                    <ChevronDown size={16} />
                  </button>

                  {menuDatasetTerbuka && (
                    <div className="absolute top-full mt-2 right-0 w-full bg-white dark:bg-slate-800 rounded-xl shadow-2xl dark:shadow-slate-900/50 z-[1002] overflow-hidden border border-slate-200 dark:border-slate-700">
                      {['AKB', 'STUNTING', 'TB'].map(dataset => (
                        <button 
                          key={dataset} 
                          onClick={() => downloadDataset(dataset)}
                          className="w-full text-left px-5 py-3 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all border-b border-slate-100 dark:border-slate-700 last:border-0 flex items-center gap-3 uppercase tracking-wider"
                        >
                          <FileDown size={16} className="text-purple-500" /> {dataset}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* DOWNLOAD DROPDOWN */}
                <div className="relative flex-1 sm:flex-initial min-w-[140px]">
                  <button 
                    onClick={() => { setMenuUnduhTerbuka(!menuUnduhTerbuka); setMenuFilterTerbuka(false); setMenuDatasetTerbuka(false); }}
                    disabled={!hasilAnalisis}
                    className="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 dark:from-red-500 dark:to-red-600 text-white rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-red-500/30 dark:hover:shadow-red-400/20 transition-all flex items-center justify-between gap-3 tracking-wider disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
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
                          <Download size={16} className="text-red-500" /> {format}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[1100px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="px-8 py-6 text-center">No</th>
                    <th className="px-8 py-6">Provinsi</th>
                    <th className="px-8 py-6 text-center">Indeks</th>
                    <th className="px-8 py-6 text-center">AKB</th>
                    <th className="px-8 py-6 text-center">Stunting</th>
                    <th className="px-8 py-6 text-center">TB</th>
                    <th className="px-8 py-6">Status</th>
                    <th className="px-8 py-6">Rekomendasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {dataTerfilter.length > 0 ? dataTerfilter.map((fitur, indeks) => {
                    const data = fitur.properties.health_analysis;
                    const dataKesehatan = data.data_kesehatan || {};
                    const rekUtama = data.rekomendasi?.[0];
                    
                    return (
                      <tr key={indeks} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all group">
                        <td className="px-8 py-6 text-center text-xs font-bold text-slate-400 dark:text-slate-500 group-hover:text-red-500 transition-colors">{indeks + 1}</td>
                        <td className="px-8 py-6 text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{data.nama_provinsi}</td>
                        <td className="px-8 py-6 text-center">
                          <span className="px-3 py-1 rounded-lg text-sm font-black bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-mono">
                            {data.health_index}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-center text-sm font-bold text-slate-600 dark:text-slate-400">{dataKesehatan.AKB ? `${dataKesehatan.AKB}` : '-'}</td>
                        <td className="px-8 py-6 text-center text-sm font-bold text-slate-600 dark:text-slate-400">{dataKesehatan.STUNTING ? `${dataKesehatan.STUNTING}%` : '-'}</td>
                        <td className="px-8 py-6 text-center text-sm font-bold text-slate-600 dark:text-slate-400">{dataKesehatan.TB ? `${dataKesehatan.TB}` : '-'}</td>
                        <td className="px-8 py-6">
                          <span className="px-4 py-2 rounded-lg text-xs font-bold tracking-wider border-2 uppercase bg-white dark:bg-slate-800 shadow-sm" 
                                style={{ borderColor: data.warna + '40', color: data.warna }}>
                            {data.kategori}
                          </span>
                        </td>
                        <td className="px-8 py-6 max-w-md">
                          <div className="space-y-2">
                            <p className="text-xs font-black text-red-600 dark:text-red-400 uppercase tracking-wider">{rekUtama?.title || "STRATEGI"}</p>
                            <p className="text-xs font-semibold leading-relaxed text-slate-600 dark:text-slate-300 line-clamp-2">
                              {rekUtama?.actions?.[0] || "-"}
                            </p>
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan="8" className="py-24 text-center">
                        <div className="flex flex-col items-center opacity-20 dark:opacity-30">
                          <AlertCircle size={60} className="text-slate-400 dark:text-slate-600"/>
                          <p className="text-xs font-black uppercase tracking-widest mt-4 text-slate-500 dark:text-slate-600">
                            {sedangMenganalisis ? "SEDANG MENGAMBIL DATA..." : "KLIK TOMBOL ANALISIS UNTUK MEMULAI"}
                          </p>
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