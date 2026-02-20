"use client";
import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { 
  Play, Download, Plus, Minus, ChevronDown, Filter, Save, X, Activity, RotateCcw, ChevronUp, Info, Table, FileText, ClipboardList, Search, Eye, EyeOff, Wheat
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import HeaderBar from '@/components/layout/HeaderBar';

// Konfigurasi Kategori Ketahanan Pangan
const KATEGORI = {
  "SANGAT RENTAN": { warna: "#dc2626", label: "SANGAT RENTAN", emoji: "🚨" },
  "RENTAN": { warna: "#ef4444", label: "RENTAN", emoji: "⚠️" },
  "AGAK TAHAN": { warna: "#f59e0b", label: "AGAK TAHAN", emoji: "📊" },
  "TAHAN": { warna: "#10b981", label: "TAHAN", emoji: "✅" },
  "SANGAT TAHAN": { warna: "#059669", label: "SANGAT TAHAN", emoji: "🏆" }
};

const PUSAT_DEFAULT = [-2.5, 118];
const ZOOM_DEFAULT = 5;

export default function PanganPage() {
  const [sedangMenganalisis, setSedangMenganalisis] = useState(false);
  const [hasilAnalisis, setHasilAnalisis] = useState(null);
  const [kategoriTerpilih, setKategoriTerpilih] = useState('SEMUA');
  const [adalahClient, setAdalahClient] = useState(false);
  const [petaSedangMemuat, setPetaSedangMemuat] = useState(true);
  
  const [menuUnduhTerbuka, setMenuUnduhTerbuka] = useState(false);
  const [menuFilterTerbuka, setMenuFilterTerbuka] = useState(false);
  
  // Drop-up panels
  const [panelInfoTerbuka, setPanelInfoTerbuka] = useState(false);
  const [panelTabelTerbuka, setPanelTabelTerbuka] = useState(false);
  const [panelMetodologiTerbuka, setPanelMetodologiTerbuka] = useState(false);
  const [panelKebijakanTerbuka, setPanelKebijakanTerbuka] = useState(false);
  
  // Koordinat cursor dan zoom
  const [koordinatCursor, setKoordinatCursor] = useState({ lat: 0, lng: 0 });
  const [currentZoom, setCurrentZoom] = useState(ZOOM_DEFAULT);
  
  // Modal Save
  const [modalSaveTerbuka, setModalSaveTerbuka] = useState(false);
  const [namaSimpan, setNamaSimpan] = useState('');
  const [sedangMenyimpan, setSedangMenyimpan] = useState(false);

  // Search location
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerbuka, setSearchTerbuka] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [provinsiDipilih, setProvinsiDipilih] = useState(null);

  // Clean View Mode
  const [modeBersih, setModeBersih] = useState(false);

  const petaRef = useRef(null);

  const [KontainerPeta, setKontainerPeta] = useState(null);
  const [LapisanPeta, setLapisanPeta] = useState(null);
  const [GeoJSON, setGeoJSON] = useState(null);
  const [useMapEvents, setUseMapEvents] = useState(null);

  useEffect(() => {
    setAdalahClient(true);
    setPetaSedangMemuat(true);
    import('react-leaflet').then((leaflet) => {
      setKontainerPeta(() => leaflet.MapContainer);
      setLapisanPeta(() => leaflet.TileLayer);
      setGeoJSON(() => leaflet.GeoJSON);
      setUseMapEvents(() => leaflet.useMapEvents);
      setPetaSedangMemuat(false);
    });
    import('leaflet/dist/leaflet.css');
  }, []);

  const hitungScaleKm = (zoom) => {
    const scales = { 5: 1000, 6: 500, 7: 200, 8: 100, 9: 50, 10: 25 };
    return scales[Math.floor(zoom)] || scales[5];
  };

  const MouseTracker = () => {
    if (!useMapEvents) return null;
    
    const MapEventsComponent = () => {
      useMapEvents({
        mousemove: (e) => {
          setKoordinatCursor({
            lat: e.latlng.lat.toFixed(4),
            lng: e.latlng.lng.toFixed(4)
          });
        },
        zoomend: (e) => {
          setCurrentZoom(e.target.getZoom());
        }
      });
      return null;
    };
    
    return <MapEventsComponent />;
  };

  useEffect(() => {
    if (!hasilAnalisis?.matched_features?.features || !searchQuery.trim()) {
      setSearchSuggestions([]);
      return;
    }
    
    const suggestions = hasilAnalisis.matched_features.features
      .filter(f => f.properties?.food_security_analysis?.nama_provinsi?.toLowerCase().includes(searchQuery.toLowerCase()))
      .map(f => ({
        nama: f.properties.food_security_analysis.nama_provinsi,
        kategori: f.properties.food_security_analysis.kategori,
        warna: f.properties.food_security_analysis.warna
      }))
      .slice(0, 5);
    
    setSearchSuggestions(suggestions);
  }, [searchQuery, hasilAnalisis]);

  const handleSearch = (namaProvinsi) => {
    const provinsiNama = namaProvinsi || searchQuery;
    if (!hasilAnalisis?.matched_features?.features || !provinsiNama.trim()) return;
    
    const fitur = hasilAnalisis.matched_features.features.find(f => 
      f.properties?.food_security_analysis?.nama_provinsi?.toLowerCase() === provinsiNama.toLowerCase()
    );
    
    if (fitur && petaRef.current) {
      const coords = fitur.geometry.coordinates;
      let lat, lng;
      if (fitur.geometry.type === "MultiPolygon") {
        const polygon = coords[0][0];
        lat = polygon.reduce((sum, coord) => sum + coord[1], 0) / polygon.length;
        lng = polygon.reduce((sum, coord) => sum + coord[0], 0) / polygon.length;
      } else {
        const polygon = coords[0];
        lat = polygon.reduce((sum, coord) => sum + coord[1], 0) / polygon.length;
        lng = polygon.reduce((sum, coord) => sum + coord[0], 0) / polygon.length;
      }
      
      petaRef.current.setView([lat, lng], 7);
      setProvinsiDipilih(fitur.properties.food_security_analysis.nama_provinsi);
      
      toast.success(
        <div className="flex items-center gap-2">
          <span className="text-xl">📍</span>
          <div>
            <div className="font-bold">Lokasi Ditemukan!</div>
            <div className="text-xs">{fitur.properties.food_security_analysis.nama_provinsi}</div>
          </div>
        </div>,
        { duration: 3000, style: { background: '#fff', color: '#333', padding: '12px', borderRadius: '12px' } }
      );
      
      setSearchTerbuka(false);
      setSearchQuery('');
      setSearchSuggestions([]);
    } else {
      toast.error('Provinsi tidak ditemukan');
    }
  };

  const jalankanAnalisisBPS = async () => {
    setSedangMenganalisis(true);
    const petunjukMemuat = toast.loading('Mengambil data ketahanan pangan dari BPS Web API...');

    try {
      const respons = await axios.post('http://127.0.0.1:8000/api/analyze-food-security-bps/', {});

      toast.dismiss(petunjukMemuat);
      
      if (respons.data.status === 'success') {
        setHasilAnalisis(respons.data);
        toast.success(`Berhasil menganalisis ${respons.data.total_success} provinsi!`, { duration: 5000 });
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
    setPanelInfoTerbuka(false);
    setPanelTabelTerbuka(false);
    setPanelMetodologiTerbuka(false);
    setPanelKebijakanTerbuka(false);
    setProvinsiDipilih(null);
    setModeBersih(false);
    toast.success('Analisis berhasil direset');
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
      const respons = await axios.post('http://127.0.0.1:8000/api/save-food-security-analysis/', {
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
      const dataExport = ringkasan.map(item => ({
        'Provinsi': item.provinsi,
        'Kategori': item.kategori,
        'IKP': item.food_security_index,
        'Prevalensi Ketidakcukupan (%)': item.prevalensi_ketidakcukupan
      }));
      
      const lembarKerja = XLSX.utils.json_to_sheet(dataExport);
      const bukuKerja = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(bukuKerja, lembarKerja, "Ketahanan Pangan");
      XLSX.writeFile(bukuKerja, "TERASEG_Ketahanan_Pangan_BPS.xlsx");
      toast.success('File Excel berhasil diunduh');
    } else if (format === 'JSON') {
      const gumpalan = new Blob([JSON.stringify(hasilAnalisis, null, 2)], { type: 'application/json' });
      unduhBerkas(gumpalan, 'TERASEG_Ketahanan_Pangan_BPS.json');
      toast.success('File JSON berhasil diunduh');
    } else if (format === 'CSV') {
      const barisCsv = [
        ["Provinsi", "Kategori", "IKP", "Prevalensi (%)"].join(","),
        ...ringkasan.map(s => [s.provinsi, s.kategori, s.food_security_index, s.prevalensi_ketidakcukupan].join(","))
      ].join("\n");
      const gumpalan = new Blob([barisCsv], { type: 'text/csv' });
      unduhBerkas(gumpalan, 'TERASEG_Ketahanan_Pangan_BPS.csv');
      toast.success('File CSV berhasil diunduh');
    } else if (format === 'GEOJSON') {
      const gumpalan = new Blob([JSON.stringify(hasilAnalisis.matched_features, null, 2)], { type: 'application/json' });
      unduhBerkas(gumpalan, 'TERASEG_Spasial_Ketahanan_Pangan.geojson');
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
    let fitur = hasilAnalisis.matched_features.features;
    
    if (kategoriTerpilih !== 'SEMUA') {
      fitur = fitur.filter(f => f.properties?.food_security_analysis?.kategori === kategoriTerpilih);
    }
    
    return fitur.sort((a, b) => {
      const ikpA = a.properties?.food_security_analysis?.food_security_index || 0;
      const ikpB = b.properties?.food_security_analysis?.food_security_index || 0;
      return ikpA - ikpB; // Sort ascending (terburuk dulu)
    });
  };

  const dataTerfilter = ambilDataTabelTerfilter();
  const adaPanelTerbuka = panelInfoTerbuka || panelTabelTerbuka || panelMetodologiTerbuka || panelKebijakanTerbuka;

  const hitungKategori = () => {
    if (!hasilAnalisis?.kategori_distribusi) return { "SANGAT RENTAN": 0, "RENTAN": 0, "AGAK TAHAN": 0, "TAHAN": 0, "SANGAT TAHAN": 0 };
    return hasilAnalisis.kategori_distribusi;
  };

  const jumlahKategori = hitungKategori();

  const toggleAllPanels = () => {
    setPanelInfoTerbuka(false);
    setPanelTabelTerbuka(false);
    setPanelMetodologiTerbuka(false);
    setPanelKebijakanTerbuka(false);
  };

  if (!adalahClient) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {!modeBersih && <HeaderBar />}
      
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
                placeholder="contoh: Analisis Ketahanan Pangan 2024"
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
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-bold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {sedangMenyimpan ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`fixed inset-0 bg-white dark:bg-slate-900 ${modeBersih ? 'top-0' : 'top-16'}`}>
        {!petaSedangMemuat && KontainerPeta && (
          <KontainerPeta 
            center={PUSAT_DEFAULT} 
            zoom={ZOOM_DEFAULT} 
            className="h-full w-full z-0" 
            zoomControl={false}
            ref={petaRef}
          >
            <LapisanPeta 
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <MouseTracker />
            {hasilAnalisis?.matched_features?.features && (
              <GeoJSON 
                key={JSON.stringify(hasilAnalisis.matched_features.features) + kategoriTerpilih + provinsiDipilih}
                data={{ type: "FeatureCollection", features: hasilAnalisis.matched_features.features }}
                style={(fitur) => {
                  const analisis = fitur.properties?.food_security_analysis || {};
                  let terlihat = true;
                  
                  if (kategoriTerpilih !== 'SEMUA' && analisis.kategori !== kategoriTerpilih) {
                    terlihat = false;
                  }
                  
                  const isHighlighted = provinsiDipilih === analisis.nama_provinsi;
                  
                  return { 
                    fillColor: analisis.warna || "#cbd5e1", 
                    weight: isHighlighted ? 4 : 2, 
                    opacity: terlihat ? 1 : 0, 
                    color: isHighlighted ? '#3b82f6' : 'white', 
                    fillOpacity: terlihat ? 0.75 : 0 
                  };
                }}
                onEachFeature={(fitur, lapisan) => {
                  const analisis = fitur.properties?.food_security_analysis || {};
                  const wawasan = analisis.insights?.map(i => `<div style="margin-bottom:3px; padding-left:6px; border-left:2px solid ${analisis.warna}; font-weight: 600; font-size: 9px;">${i}</div>`).join('') || '';
                  
                  lapisan.bindTooltip(`
                    <div style="font-family: inherit; padding: 4px;">
                      <div style="font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; font-size: 11px;">${analisis.nama_provinsi}</div>
                      <div style="font-size: 9px; font-weight: 800; color: ${analisis.warna}; margin-top:2px;">${KATEGORI[analisis.kategori]?.emoji || ''} ${analisis.kategori}</div>
                      <div style="font-size: 8px; font-weight: 700; color: #64748b; margin-top:2px;">IKP: ${analisis.food_security_index}</div>
                    </div>
                  `, { sticky: true, opacity: 0.95 });

                  lapisan.bindPopup(`
                    <div style="font-family: inherit; min-width: 280px; color: #1e293b; padding: 4px;">
                      <div style="background: ${analisis.warna}; color: white; padding: 8px; border-radius: 8px; margin-bottom: 6px;">
                        <div style="font-weight: 900; font-size: 12px; text-transform: uppercase;">${analisis.nama_provinsi}</div>
                        <div style="font-size: 10px; opacity: 0.9; margin-top: 2px;">Analisis Ketahanan Pangan</div>
                      </div>
                      
                      <div style="padding: 0 2px;">
                        <div style="text-align: center; margin-bottom: 6px;">
                          <span style="background: ${analisis.warna}; color: white; padding: 4px 12px; border-radius: 10px; font-size: 8px; font-weight: 900;">
                            ${KATEGORI[analisis.kategori]?.emoji || ''} ${analisis.kategori}
                          </span>
                        </div>

                        <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 8px; border-radius: 8px; margin-bottom: 6px; border-left: 3px solid ${analisis.warna};">
                          <div style="font-size: 7px; font-weight: 900; color: #14532d; text-transform: uppercase;">Indeks Ketahanan Pangan (IKP)</div>
                          <div style="font-size: 16px; font-weight: 900; color: #16a34a;">${analisis.food_security_index}</div>
                        </div>

                        <div style="background: #fef2f2; padding: 8px; border-radius: 8px; margin-bottom: 6px; border-left: 3px solid #ef4444;">
                          <div style="font-size: 7px; font-weight: 900; color: #7f1d1d; text-transform: uppercase;">Prevalensi Ketidakcukupan</div>
                          <div style="font-size: 16px; font-weight: 900; color: #dc2626;">${analisis.prevalensi_ketidakcukupan}%</div>
                        </div>

                        <div style="font-size: 7px; font-weight: 900; color: #64748b; text-transform: uppercase; margin-bottom: 4px; border-bottom: 1px solid #f1f5f9; padding-bottom: 2px;">💡 WAWASAN</div>
                        <div style="font-size: 9px; color: #334155; line-height: 1.4;">${wawasan}</div>
                      </div>
                    </div>
                  `, { maxWidth: 300, maxHeight: 400 });
                }}
              />
            )}
          </KontainerPeta>
        )}

        {/* JUDUL HALAMAN */}
        {!modeBersih && (
          <div className="absolute top-6 left-6 z-[1000] bg-gradient-to-r from-amber-600 to-amber-500 px-5 py-3 rounded-xl shadow-xl">
            <div className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Wheat size={18} /> Ketahanan Pangan Nasional
            </div>
          </div>
        )}

        {/* ZOOM CONTROLS */}
        {!modeBersih && (
          <div className="absolute top-20 left-6 z-[1000] flex flex-col gap-2">
            <button onClick={() => petaRef.current?.zoomIn()} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 rounded-lg shadow-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-90 border border-slate-200 dark:border-slate-700">
              <Plus size={16}/>
            </button>
            <button onClick={() => petaRef.current?.zoomOut()} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 rounded-lg shadow-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-90 border border-slate-200 dark:border-slate-700">
              <Minus size={16}/>
            </button>
          </div>
        )}

        {/* MODE BERSIH */}
        {hasilAnalisis && (
          <div className="absolute top-[170px] left-6 z-[1000]">
            <button onClick={() => setModeBersih(!modeBersih)} className="p-2.5 rounded-lg shadow-lg hover:shadow-xl transition-all active:scale-90 border-2 border-white dark:border-slate-700 bg-gradient-to-r from-amber-600 to-amber-500">
              {modeBersih ? <EyeOff size={16} className="text-white" /> : <Eye size={16} className="text-white" />}
            </button>
          </div>
        )}

        {/* SEARCH */}
        {hasilAnalisis && !modeBersih && (
          <div className="absolute top-[215px] left-6 z-[1000]">
            {searchTerbuka ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="p-2 flex gap-2">
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSearch()} placeholder="Cari provinsi..." className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:border-blue-500 outline-none w-48" autoFocus />
                  <button onClick={() => handleSearch()} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-all"><Search size={16} /></button>
                  <button onClick={() => { setSearchTerbuka(false); setSearchQuery(''); setSearchSuggestions([]); setProvinsiDipilih(null); }} className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 p-2 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"><X size={16} /></button>
                </div>
                {searchSuggestions.length > 0 && (
                  <div className="border-t border-slate-200 dark:border-slate-700 max-h-48 overflow-y-auto">
                    {searchSuggestions.map((sug, idx) => (
                      <button key={idx} onClick={() => handleSearch(sug.nama)} className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{sug.nama}</span>
                        <span className="text-[10px] font-bold px-2 py-1 rounded-lg" style={{ backgroundColor: sug.warna + '20', color: sug.warna }}>{sug.kategori}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => setSearchTerbuka(true)} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 rounded-lg shadow-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-90 border border-slate-200 dark:border-slate-700"><Search size={16}/></button>
            )}
          </div>
        )}

        {/* KOORDINAT & LEGEND */}
        {!modeBersih && (
          <div className="absolute top-6 right-6 z-[1000] space-y-2">
            <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl px-4 py-2 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
              <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
                <span className="text-blue-600 dark:text-blue-400">Lat:</span> {koordinatCursor.lat} | <span className="text-blue-600 dark:text-blue-400">Lng:</span> {koordinatCursor.lng}
              </div>
            </div>

            <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl px-4 py-2 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
              <div className="flex flex-col gap-1">
                <div className="h-2 bg-slate-300 dark:bg-slate-600" style={{width: '80px', borderLeft: '2px solid #64748b', borderRight: '2px solid #64748b', borderBottom: '2px solid #64748b'}}></div>
                <div className="text-[11px] font-bold text-center text-slate-700 dark:text-slate-300">{hitungScaleKm(currentZoom)} km</div>
              </div>
            </div>

            {/* LEGEND */}
            <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl p-3 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700">
              <div className="space-y-2">
                {Object.entries(KATEGORI).map(([kunci, nilai]) => (
                  <div key={kunci} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shadow-inner" style={{ backgroundColor: nilai.warna }}></div>
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{nilai.emoji} {nilai.label}</span>
                    </div>
                    {hasilAnalisis && (
                      <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-900 dark:text-white">{jumlahKategori[kunci] || 0}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* FILTER */}
            {hasilAnalisis && (
              <div className="relative">
                <button onClick={() => { setMenuFilterTerbuka(!menuFilterTerbuka); setMenuUnduhTerbuka(false); }} className="w-full px-4 py-2 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-[10px] font-bold hover:border-amber-400 transition-all flex items-center justify-between gap-2 shadow-lg">
                  <div className="flex items-center gap-2"><Filter size={14} /> {kategoriTerpilih}</div>
                  <ChevronDown size={14} className={`transition-transform ${menuFilterTerbuka ? 'rotate-180' : ''}`} />
                </button>

                {menuFilterTerbuka && (
                  <div className="absolute top-full mt-2 right-0 w-full bg-white dark:bg-slate-800 rounded-xl shadow-2xl z-[1002] overflow-hidden border border-slate-200 dark:border-slate-700">
                    {["SEMUA", ...Object.keys(KATEGORI)].map(kat => (
                      <button key={kat} onClick={() => { setKategoriTerpilih(kat); setMenuFilterTerbuka(false); }} className={`w-full text-left px-4 py-2 text-[10px] font-bold transition-all border-b border-slate-100 dark:border-slate-700 last:border-0 ${kategoriTerpilih === kat ? 'bg-amber-500 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>{kat}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ACTION BUTTONS */}
        {!modeBersih && (
          <div className={`absolute left-1/2 -translate-x-1/2 z-[1002] transition-all duration-300 ${adaPanelTerbuka ? 'bottom-[380px]' : 'bottom-16'}`}>
            <div className="flex gap-3">
              <button onClick={jalankanAnalisisBPS} disabled={sedangMenganalisis} className="px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-xl font-black text-xs tracking-wider hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase active:scale-95 flex items-center gap-2">
                <Play size={14} className={sedangMenganalisis ? "animate-pulse" : ""} />
                {sedangMenganalisis ? 'Loading...' : 'Analisis'}
              </button>

              {hasilAnalisis && (
                <>
                  <button onClick={bukaModalSave} className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-black text-xs tracking-wider hover:shadow-xl transition-all uppercase active:scale-95 flex items-center gap-2">
                    <Save size={14} /> Simpan
                  </button>
                  <button onClick={resetAnalisis} className="px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-500 text-white rounded-xl font-black text-xs tracking-wider hover:shadow-xl transition-all uppercase active:scale-95 flex items-center gap-2">
                    <RotateCcw size={14} /> Reset
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* BOTTOM PANELS - Similar structure to health page */}
        {hasilAnalisis && !modeBersih && (
          <div className="absolute bottom-0 left-0 right-0 z-[1001]">
            {/* INFO PANEL */}
            <div className={`bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 transition-all duration-300 shadow-2xl ${panelInfoTerbuka ? 'h-[340px] overflow-y-auto' : 'max-h-0 overflow-hidden'}`}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Activity className="text-amber-500" size={24} />
                    <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Ringkasan Analisis</h2>
                  </div>
                  <button onClick={() => setPanelInfoTerbuka(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><X size={18} className="text-slate-500" /></button>
                </div>
                
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-4">
                  Analisis ketahanan pangan menggunakan data BPS - Prevalensi Ketidakcukupan Konsumsi Pangan
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-200 dark:border-blue-800">
                    <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Total Provinsi</div>
                    <div className="text-xl font-black text-blue-700 dark:text-blue-300">{hasilAnalisis.total_success}</div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 border border-red-200 dark:border-red-800">
                    <div className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">Sangat Rentan</div>
                    <div className="text-xl font-black text-red-700 dark:text-red-300">{jumlahKategori["SANGAT RENTAN"]}</div>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 border border-orange-200 dark:border-orange-800">
                    <div className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-1">Rentan</div>
                    <div className="text-xl font-black text-orange-700 dark:text-orange-300">{jumlahKategori["RENTAN"]}</div>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-3 border border-yellow-200 dark:border-yellow-800">
                    <div className="text-[10px] font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-wider mb-1">Agak Tahan</div>
                    <div className="text-xl font-black text-yellow-700 dark:text-yellow-300">{jumlahKategori["AGAK TAHAN"]}</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 border border-green-200 dark:border-green-800">
                    <div className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">Tahan</div>
                    <div className="text-xl font-black text-green-700 dark:text-green-300">{jumlahKategori["TAHAN"]}</div>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 border border-emerald-200 dark:border-emerald-800">
                    <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Sangat Tahan</div>
                    <div className="text-xl font-black text-emerald-700 dark:text-emerald-300">{jumlahKategori["SANGAT TAHAN"]}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* TABEL PANEL */}
            <div className={`bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 transition-all duration-300 shadow-2xl ${panelTabelTerbuka ? 'h-[340px] overflow-y-auto' : 'max-h-0 overflow-hidden'}`}>
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Matriks Ketahanan Pangan</h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mt-1">{dataTerfilter.length} Wilayah</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <div className="relative">
                      <button onClick={() => { setMenuUnduhTerbuka(!menuUnduhTerbuka); setMenuFilterTerbuka(false); }} className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-xl text-[10px] font-bold hover:shadow-lg transition-all flex items-center gap-2">
                        <Download size={12} /> UNDUH
                      </button>

                      {menuUnduhTerbuka && (
                        <div className="absolute top-full mt-2 right-0 w-40 bg-white dark:bg-slate-800 rounded-xl shadow-2xl z-[1002] overflow-hidden border border-slate-200 dark:border-slate-700">
                          {['GEOJSON', 'JSON', 'EXCEL', 'CSV'].map(format => (
                            <button key={format} onClick={() => eksporData(format)} className="w-full text-left px-4 py-2 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all border-b border-slate-100 dark:border-slate-700 last:border-0">
                              <Download size={12} className="inline mr-2 text-amber-500" /> {format}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button onClick={() => setPanelTabelTerbuka(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><X size={18} className="text-slate-500" /></button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">
                        <th className="px-3 py-2 text-center">No</th>
                        <th className="px-3 py-2">Provinsi</th>
                        <th className="px-3 py-2 text-center">IKP</th>
                        <th className="px-3 py-2 text-center">Prevalensi (%)</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {dataTerfilter.map((fitur, indeks) => {
                        const data = fitur.properties.food_security_analysis;
                        
                        return (
                          <tr key={indeks} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all">
                            <td className="px-3 py-2 text-center text-[10px] font-bold text-slate-400">{indeks + 1}</td>
                            <td className="px-3 py-2 text-xs font-black text-slate-900 dark:text-white">{data.nama_provinsi}</td>
                            <td className="px-3 py-2 text-center">
                              <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white">
                                {data.food_security_index}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center text-xs font-bold text-slate-600 dark:text-slate-400">
                              {data.prevalensi_ketidakcukupan}%
                            </td>
                            <td className="px-3 py-2">
                              <span className="px-2 py-1 rounded-lg text-[10px] font-bold border-2" style={{ borderColor: data.warna + '40', color: data.warna }}>
                                {KATEGORI[data.kategori]?.emoji || ''} {data.kategori}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* KEBIJAKAN PANEL */}
            <div className={`bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 transition-all duration-300 shadow-2xl ${panelKebijakanTerbuka ? 'h-[340px] overflow-y-auto' : 'max-h-0 overflow-hidden'}`}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <ClipboardList className="text-amber-500" size={24} />
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Rekomendasi Kebijakan</h3>
                  </div>
                  <button 
                    onClick={() => setPanelKebijakanTerbuka(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <X size={18} className="text-slate-500" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[900px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">
                        <th className="px-3 py-2 text-center">No</th>
                        <th className="px-3 py-2">Provinsi</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Prioritas</th>
                        <th className="px-3 py-2">Rekomendasi Kebijakan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {dataTerfilter.map((fitur, indeks) => {
                        const data = fitur.properties.food_security_analysis;
                        const rekUtama = data.rekomendasi?.[0];
                        
                        return (
                          <tr key={indeks} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all">
                            <td className="px-3 py-2 text-center text-[10px] font-bold text-slate-400">{indeks + 1}</td>
                            <td className="px-3 py-2 text-xs font-black text-slate-900 dark:text-white">{data.nama_provinsi}</td>
                            <td className="px-3 py-2">
                              <span className="px-2 py-1 rounded-lg text-[10px] font-bold border-2" 
                                    style={{ borderColor: data.warna + '40', color: data.warna }}>
                                {KATEGORI[data.kategori]?.emoji || ''} {data.kategori}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                                data.kategori === 'SANGAT RENTAN' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                                data.kategori === 'RENTAN' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
                                data.kategori === 'AGAK TAHAN' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                                data.kategori === 'TAHAN' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                                'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                              }`}>
                                {rekUtama?.priority || "PEMELIHARAAN"}
                              </span>
                            </td>
                            <td className="px-3 py-2 max-w-md">
                              <div className="mb-2">
                                <div className="text-xs font-black text-slate-900 dark:text-white mb-1">
                                  {rekUtama?.title || "Pertahankan Kondisi"}
                                </div>
                              </div>
                              <ul className="space-y-1 text-[10px]">
                                {rekUtama?.actions?.map((action, idx) => (
                                  <li key={idx} className="text-slate-600 dark:text-slate-300 font-medium">
                                    • {action}
                                  </li>
                                )) || <li className="text-slate-400">Pertahankan kondisi saat ini</li>}
                              </ul>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* METODOLOGI PANEL - FULL LENGKAP */}
            <div className={`bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 transition-all duration-300 shadow-2xl ${panelMetodologiTerbuka ? 'h-[340px] overflow-y-auto' : 'max-h-0 overflow-hidden'}`}>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    Metodologi Perhitungan Indeks Ketahanan Pangan (IKP)
                  </h3>
                  <button 
                    onClick={() => setPanelMetodologiTerbuka(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <X size={18} className="text-slate-500" />
                  </button>
                </div>

                {/* INTRO TEXT */}
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Indeks Ketahanan Pangan (IKP) mengukur tingkat ketahanan pangan suatu wilayah berdasarkan prevalensi ketidakcukupan konsumsi pangan penduduk.
                </p>

                {/* INDIKATOR UTAMA */}
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border-2 border-amber-200 dark:border-amber-800">
                  <h4 className="text-sm font-black text-amber-900 dark:text-amber-100 mb-2 uppercase flex items-center gap-2">
                    <Wheat size={16} /> Indikator Utama
                  </h4>
                  <div className="space-y-2 text-xs text-amber-800 dark:text-amber-200">
                    <div>
                      <strong>Nama:</strong> Prevalensi Ketidakcukupan Konsumsi Pangan
                    </div>
                    <div>
                      <strong>Definisi:</strong> Persentase penduduk yang konsumsi energi pangannya di bawah kebutuhan minimum (2100 kkal/kapita/hari)
                    </div>
                    <div>
                      <strong>Karakteristik:</strong> Indikator negatif - semakin rendah nilai, semakin baik ketahanan pangan
                    </div>
                    <div>
                      <strong>Sumber:</strong> BPS Web API - Variabel 1473
                    </div>
                  </div>
                </div>

                {/* FORMULA PERHITUNGAN */}
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                  <h4 className="text-sm font-black text-purple-900 dark:text-purple-100 mb-2 uppercase">Formula Perhitungan IKP</h4>
                  <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-purple-300 dark:border-purple-700 mb-3">
                    <code className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                      IKP = max(0, 100 - (Prevalensi × 4))
                    </code>
                  </div>
                  <div className="text-xs text-purple-800 dark:text-purple-200 space-y-1">
                    <p><strong>Penjelasan:</strong></p>
                    <p>Faktor 4 digunakan untuk memberikan gradasi yang jelas dalam skala 0-100. Ini memastikan bahwa perubahan prevalensi diterjemahkan secara proporsional ke dalam indeks.</p>
                  </div>
                </div>

                {/* CONTOH PERHITUNGAN */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                  <h4 className="text-sm font-black text-blue-900 dark:text-blue-100 mb-2 uppercase">Contoh Perhitungan</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="bg-white dark:bg-slate-900 rounded-lg p-2 border border-blue-200 dark:border-blue-700">
                      <div className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase mb-1">Prevalensi 0%</div>
                      <code className="text-xs font-mono text-slate-900 dark:text-white">IKP = 100 - (0 × 4) = 100</code>
                      <div className="text-[9px] text-green-600 dark:text-green-400 mt-1">→ Sangat Tahan</div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-lg p-2 border border-blue-200 dark:border-blue-700">
                      <div className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase mb-1">Prevalensi 5%</div>
                      <code className="text-xs font-mono text-slate-900 dark:text-white">IKP = 100 - (5 × 4) = 80</code>
                      <div className="text-[9px] text-green-600 dark:text-green-400 mt-1">→ Tahan</div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-lg p-2 border border-blue-200 dark:border-blue-700">
                      <div className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase mb-1">Prevalensi 10%</div>
                      <code className="text-xs font-mono text-slate-900 dark:text-white">IKP = 100 - (10 × 4) = 60</code>
                      <div className="text-[9px] text-yellow-600 dark:text-yellow-400 mt-1">→ Agak Tahan</div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-lg p-2 border border-blue-200 dark:border-blue-700">
                      <div className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase mb-1">Prevalensi 15%</div>
                      <code className="text-xs font-mono text-slate-900 dark:text-white">IKP = 100 - (15 × 4) = 40</code>
                      <div className="text-[9px] text-orange-600 dark:text-orange-400 mt-1">→ Rentan</div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-lg p-2 border border-blue-200 dark:border-blue-700">
                      <div className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase mb-1">Prevalensi 20%</div>
                      <code className="text-xs font-mono text-slate-900 dark:text-white">IKP = 100 - (20 × 4) = 20</code>
                      <div className="text-[9px] text-red-600 dark:text-red-400 mt-1">→ Sangat Rentan</div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-lg p-2 border border-blue-200 dark:border-blue-700">
                      <div className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase mb-1">Prevalensi 25%+</div>
                      <code className="text-xs font-mono text-slate-900 dark:text-white">IKP = max(0, ...) = 0</code>
                      <div className="text-[9px] text-red-600 dark:text-red-400 mt-1">→ Krisis Pangan</div>
                    </div>
                  </div>
                </div>

                {/* KATEGORI HASIL */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-800/20 rounded-xl p-4 border-2 border-green-200 dark:border-green-800">
                  <h4 className="text-sm font-black text-green-900 dark:text-green-100 uppercase mb-3">Kategori Ketahanan Pangan</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-emerald-200 dark:border-emerald-700">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#059669' }}></div>
                        <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase">🏆 Sangat Tahan</div>
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                        <div><strong>Prevalensi:</strong> {'<'} 5%</div>
                        <div><strong>IKP:</strong> ≥ 80</div>
                        <div className="text-[10px]">Akses pangan sangat baik, sistem ketahanan pangan optimal</div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-green-200 dark:border-green-700">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
                        <div className="text-xs font-black text-green-600 dark:text-green-400 uppercase">✅ Tahan</div>
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                        <div><strong>Prevalensi:</strong> 5-10%</div>
                        <div><strong>IKP:</strong> 60-80</div>
                        <div className="text-[10px]">Akses pangan baik, sistem berfungsi dengan baik</div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-yellow-200 dark:border-yellow-700">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }}></div>
                        <div className="text-xs font-black text-yellow-600 dark:text-yellow-400 uppercase">📊 Agak Tahan</div>
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                        <div><strong>Prevalensi:</strong> 10-15%</div>
                        <div><strong>IKP:</strong> 40-60</div>
                        <div className="text-[10px]">Perlu penguatan sistem distribusi dan ketersediaan</div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-orange-200 dark:border-orange-700">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }}></div>
                        <div className="text-xs font-black text-orange-600 dark:text-orange-400 uppercase">⚠️ Rentan</div>
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                        <div><strong>Prevalensi:</strong> 15-20%</div>
                        <div><strong>IKP:</strong> 20-40</div>
                        <div className="text-[10px]">Rawan pangan, perlu intervensi program bantuan</div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-red-200 dark:border-red-700 md:col-span-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#dc2626' }}></div>
                        <div className="text-xs font-black text-red-600 dark:text-red-400 uppercase">🚨 Sangat Rentan</div>
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                        <div><strong>Prevalensi:</strong> ≥ 20%</div>
                        <div><strong>IKP:</strong> {'<'} 20</div>
                        <div className="text-[10px]">Krisis pangan, memerlukan intervensi darurat segera</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* DIMENSI KETAHANAN PANGAN */}
                <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-xl p-4 border border-cyan-200 dark:border-cyan-800">
                  <h4 className="text-sm font-black text-cyan-900 dark:text-cyan-100 mb-2 uppercase">Dimensi Ketahanan Pangan</h4>
                  <p className="text-xs text-cyan-800 dark:text-cyan-200 mb-3">
                    Prevalensi ketidakcukupan konsumsi pangan mengukur dimensi <strong>"AKSES"</strong> dari ketahanan pangan:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <div className="bg-white dark:bg-slate-900 rounded-lg p-2 border border-cyan-200 dark:border-cyan-700">
                      <div className="text-[10px] font-black text-cyan-600 dark:text-cyan-400 uppercase mb-1">1. Ketersediaan</div>
                      <div className="text-[9px] text-slate-600 dark:text-slate-300">Produksi & stok pangan</div>
                    </div>
                    <div className="bg-cyan-100 dark:bg-cyan-900/40 rounded-lg p-2 border-2 border-cyan-500 dark:border-cyan-600">
                      <div className="text-[10px] font-black text-cyan-700 dark:text-cyan-300 uppercase mb-1">2. Akses ✓</div>
                      <div className="text-[9px] text-slate-700 dark:text-slate-200 font-bold">Kemampuan memperoleh pangan</div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-lg p-2 border border-cyan-200 dark:border-cyan-700">
                      <div className="text-[10px] font-black text-cyan-600 dark:text-cyan-400 uppercase mb-1">3. Pemanfaatan</div>
                      <div className="text-[9px] text-slate-600 dark:text-slate-300">Asupan & absorpsi gizi</div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-lg p-2 border border-cyan-200 dark:border-cyan-700">
                      <div className="text-[10px] font-black text-cyan-600 dark:text-cyan-400 uppercase mb-1">4. Stabilitas</div>
                      <div className="text-[9px] text-slate-600 dark:text-slate-300">Konsistensi sepanjang waktu</div>
                    </div>
                  </div>
                </div>

                {/* REFERENSI */}
                <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                  <div className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase mb-2">Referensi Metodologi</div>
                  <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                    <li>• FAO - Food Security Indicators and Measurement Framework</li>
                    <li>• Kementan RI - Peta Ketahanan dan Kerentanan Pangan (FSVA)</li>
                    <li>• BPS - Statistik Ketahanan Pangan Indonesia</li>
                    <li>• WHO - Nutrition Landscape Information System (NLIS)</li>
                    <li>• WFP - Comprehensive Food Security and Vulnerability Analysis</li>
                  </ul>
                </div>

                {/* VALIDITAS */}
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                  <h4 className="text-sm font-black text-green-900 dark:text-green-100 uppercase mb-2">Validitas Metodologi</h4>
                  <p className="text-xs text-green-800 dark:text-green-200 mb-3">
                    Threshold kategori berdasarkan standar FAO untuk food security dan disesuaikan dengan kondisi Indonesia melalui penelitian Kementan RI tentang peta kerentanan pangan. Prevalensi ketidakcukupan konsumsi pangan adalah indikator kunci dalam mengukur dimensi 'akses' dari ketahanan pangan.
                  </p>
                  <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-green-300 dark:border-green-700">
                    <div className="text-[10px] font-black text-green-600 dark:text-green-400 uppercase mb-1">Catatan Penting</div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Indikator ini mencerminkan kemampuan rumah tangga untuk memperoleh pangan yang cukup secara kuantitas maupun kualitas. Semakin rendah prevalensi, semakin baik akses masyarakat terhadap pangan bergizi.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* CONTROL BUTTONS BAR */}
            <div className="bg-white dark:bg-slate-900 border-t-2 border-slate-200 dark:border-slate-800 p-3 shadow-2xl">
              <div className="flex justify-center gap-2">
                <button 
                  onClick={() => { 
                    setPanelInfoTerbuka(!panelInfoTerbuka); 
                    setPanelTabelTerbuka(false); 
                    setPanelMetodologiTerbuka(false); 
                    setPanelKebijakanTerbuka(false); 
                  }} 
                  className={`px-5 py-2 rounded-xl text-[10px] font-bold transition-all flex items-center gap-2 ${panelInfoTerbuka ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                >
                  <Info size={14} /> Info
                  {panelInfoTerbuka ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
                
                <button 
                  onClick={() => { 
                    setPanelTabelTerbuka(!panelTabelTerbuka); 
                    setPanelInfoTerbuka(false); 
                    setPanelMetodologiTerbuka(false); 
                    setPanelKebijakanTerbuka(false); 
                  }} 
                  className={`px-5 py-2 rounded-xl text-[10px] font-bold transition-all flex items-center gap-2 ${panelTabelTerbuka ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                >
                  <Table size={14} /> Tabel
                  {panelTabelTerbuka ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
                
                <button 
                  onClick={() => { 
                    setPanelKebijakanTerbuka(!panelKebijakanTerbuka); 
                    setPanelInfoTerbuka(false); 
                    setPanelTabelTerbuka(false); 
                    setPanelMetodologiTerbuka(false); 
                  }} 
                  className={`px-5 py-2 rounded-xl text-[10px] font-bold transition-all flex items-center gap-2 ${panelKebijakanTerbuka ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                >
                  <ClipboardList size={14} /> Kebijakan
                  {panelKebijakanTerbuka ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
                
                <button 
                  onClick={() => { 
                    setPanelMetodologiTerbuka(!panelMetodologiTerbuka); 
                    setPanelInfoTerbuka(false); 
                    setPanelTabelTerbuka(false); 
                    setPanelKebijakanTerbuka(false); 
                  }} 
                  className={`px-5 py-2 rounded-xl text-[10px] font-bold transition-all flex items-center gap-2 ${panelMetodologiTerbuka ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                >
                  <FileText size={14} /> Metodologi
                  {panelMetodologiTerbuka ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>

                {adaPanelTerbuka && (
                  <button 
                    onClick={toggleAllPanels} 
                    className="px-5 py-2 rounded-xl text-[10px] font-bold transition-all flex items-center gap-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
                  >
                    <ChevronDown size={14} /> Tutup Semua
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}