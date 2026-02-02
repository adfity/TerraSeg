"use client";
// TAMBAHKAN useEffect DI SINI
import { useState, useEffect } from 'react'; 
import html2canvas from 'html2canvas';
import { Scan, Save, Trash2, Box, Wand2 } from 'lucide-react';
import axios from 'axios';
// useMap & useMapEvents dihapus karena kita pakai props 'map'

export default function GeoDetectionPanel({ 
  map,
  boxSize,
  setBoxSize,
  onNewData, 
  onDetectionComplete, 
  onClearPreview, 
  previewData, 
  setPreviewData
}) {
  const [zoomLevel, setZoomLevel] = useState(map ? map.getZoom() : 5);

  // Hook ini sekarang akan berjalan lancar karena useEffect sudah di-import
  useEffect(() => {
    if (!map) return;

    const handleZoom = () => {
      setZoomLevel(map.getZoom());
    };

    map.on('zoomend', handleZoom);

    return () => {
      map.off('zoomend', handleZoom);
    };
  }, [map]);
  
  const [selectedCats, setSelectedCats] = useState([]);
  const [tempResults, setTempResults] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [selectionMode, setSelectionMode] = useState('bbox');

  const categories = [
    { id: 'bangunan', label: '🏠 Bangunan' },
    { id: 'perairan', label: '🌊 Perairan' },
    { id: 'pepohonan', label: '🌳 Pepohonan' },
    { id: 'jalan', label: '🛣️ Jalan' }
  ];

  const handleToggleCat = (id) => {
    setSelectedCats(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const handleDetect = async () => {
      if (zoomLevel < 18) return alert("Harap zoom lebih dekat (Minimal Level 18)!");
      if (selectedCats.length === 0) return alert("Silakan pilih minimal satu kategori!");

      setLoading(true);
      if (onClearPreview) onClearPreview();

      try {
        const center = map.getCenter();
        const scanLat = center.lat;
        const scanLng = center.lng;

        const mapElement = document.querySelector('.leaflet-container');
        const rect = mapElement.getBoundingClientRect();
        
        // Gunakan boxSize dari props, bukan angka statis 640 lagi
        const startX = selectionMode === 'bbox' ? (rect.width - boxSize) / 2 : 0;
        const startY = selectionMode === 'bbox' ? (rect.height - boxSize) / 2 : 0;
        const captureWidth = selectionMode === 'bbox' ? boxSize : rect.width;
        const captureHeight = selectionMode === 'bbox' ? boxSize : rect.height;

        const canvas = await html2canvas(mapElement, {
          useCORS: true,
          allowTaint: true,
          x: startX,
          y: startY,
          width: captureWidth,
          height: captureHeight,
          scale: 1,
          logging: false, // Matikan logging agar tidak spam error di console
          
          // MENGABAIKAN ELEMEN PENYEBAB ERROR
          ignoreElements: (el) => {
            // Abaikan elemen yang punya class shadow box atau panel agar tidak crash
            return (
              el.tagName === 'BUTTON' || 
              el.tagName === 'ASIDE' || 
              el.classList.contains('fixed') || 
              el.classList.contains('absolute') ||
              el.getAttribute('data-html2canvas-ignore') === 'true' // Tambahan pengaman
            );
          }
        });

        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        const formData = new FormData();
        formData.append('image', blob, 'map_capture.png');
        formData.append('lat', scanLat);
        formData.append('lng', scanLng);
        formData.append('mode', selectionMode);
        formData.append('categories', selectedCats.join(','));

        const res = await fetch('http://127.0.0.1:8000/api/run-detection/', {
          method: 'POST',
          body: formData
        });

        const data = await res.json();
        
        if (data.results && data.results.length > 0) {
          const resultsWithCoords = data.results.map(obj => ({
            ...obj,
            lat: scanLat,
            lng: scanLng
          }));
          setTempResults(resultsWithCoords);
          if (onDetectionComplete) onDetectionComplete(resultsWithCoords);
          alert(`Berhasil mendeteksi ${data.results.length} objek!`);
        } else {
          alert("Tidak ada objek ditemukan.");
        }
      } catch (err) {
        console.error("Error:", err);
        alert("Terjadi Kesalahan: " + err.message);
      } finally {
        setLoading(false);
      }
  };

  // --- HANDLE SAVE ASLI (Sesuai kode awal Anda) ---
const handleSave = async () => {
  if (!previewData || previewData.length === 0) return;

  try {
    const dataToSave = previewData.map(obj => {
      // 1. Ambil posisi pixel tengah peta saat scan dilakukan
      const scanCenterPixel = map.latLngToContainerPoint([obj.lat, obj.lng]);
      
      // 2. HITUNG OFFSET DINAMIS (Kunci konsistensi)
      const halfSize = boxSize / 2; 

      const wktPoints = obj.segmentation.map(pt => {
        // pt[0] adalah koordinat x pada gambar hasil scan (0 sampai boxSize)
        // Kita kurangi dengan halfSize agar titik 0 berada tepat di tengah kursor peta
        const latLng = map.containerPointToLatLng([
          scanCenterPixel.x + (pt[0] - halfSize),
          scanCenterPixel.y + (pt[1] - halfSize)
        ]);
        return `${latLng.lng} ${latLng.lat}`;
      });

      wktPoints.push(wktPoints[0]); // Tutup poligon

      return {
        nama: obj.kategori,
        kategori: obj.kategori,
        confidence_score: obj.confidence_score,
        polygon_coords: wktPoints.join(', '),
        metadata: {
          scan_size: boxSize,
          zoom: zoomLevel
        }
      };
    });

    const res = await axios.post('http://127.0.0.1:8000/api/save-detection/', { 
      features: dataToSave 
    });

    if (res.status === 201) {
      alert("✅ Data Berhasil Disimpan!");
      setTempResults(null);
      setPreviewData([]);
      if (onNewData) onNewData();
    }
  } catch (err) {
    alert("Gagal simpan: " + (err.response?.data?.message || err.message));
  }
};

return (
    <div className="flex flex-col h-full bg-white font-sans overflow-hidden">
      
      {/* --- 1. HEADER (STAY ON TOP) --- */}
      <div className="p-5 border-b border-slate-100 bg-white shrink-0 z-10">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800">
            <Scan size={20} className="text-blue-600 animate-pulse"/> 
            GeoAI Analysis
          </h3>
          {loading && (
            <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-lg font-bold animate-bounce">
              PROCESSING...
            </span>
          )}
        </div>
        <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-medium">
          Satellite Imagery Detection System
        </p>
      </div>

      {/* --- 2. BODY (SCROLLABLE AREA) --- */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6 bg-white">
        
        {/* Kontrol Mode Seleksi */}
        <section>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">
            Metode Seleksi
          </label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
            <button 
              onClick={() => setSelectionMode('bbox')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                selectionMode === 'bbox' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Box size={14}/> BBox
            </button>
            <button 
              onClick={() => setSelectionMode('smart')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                selectionMode === 'smart' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Wand2 size={14}/> Smart
            </button>
          </div>
        </section>

        {/* Kontrol Ukuran Box (Hanya Muncul jika mode BBox) */}
        {selectionMode === 'bbox' && (
          <section className="bg-slate-50 p-4 rounded-2xl border border-slate-100 group">
            <div className="flex justify-between items-center mb-3">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Area Scan
              </label>
              <span className="text-xs font-black text-blue-600 bg-white px-2 py-0.5 rounded shadow-sm">
                {boxSize}px
              </span>
            </div>
            <input 
              type="range"
              min="256"
              max="1024"
              step="32"
              value={boxSize}
              onChange={(e) => setBoxSize(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 group-hover:accent-blue-400 transition-all"
            />
            <div className="flex justify-between text-[9px] text-slate-400 mt-2 font-bold uppercase">
              <span>Fokus</span>
              <span>Luas</span>
            </div>
          </section>
        )}

        {/* Kontrol Kategori */}
        <section>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">
            Kategori Objek
          </label>
          <div className="grid grid-cols-2 gap-2">
            {categories.map(cat => (
              <button 
                key={cat.id} 
                onClick={() => handleToggleCat(cat.id)}
                className={`text-[11px] p-3 rounded-xl border-2 transition-all font-bold flex flex-col items-center gap-1.5 ${
                  selectedCats.includes(cat.id) 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-[1.03]' 
                  : 'bg-white border-slate-100 text-slate-600 hover:border-blue-200'
                }`}
              >
                <span className="text-xl">{cat.label.split(' ')[0]}</span>
                <span className="uppercase tracking-tight">{cat.label.split(' ')[1]}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Spacer extra di bawah agar tidak tertutup footer */}
        <div className="h-10" />
      </div>

      {/* --- 3. FOOTER (STAY ON BOTTOM) --- */}
      <div className="p-5 border-t border-slate-100 bg-slate-50/80 backdrop-blur-sm shrink-0">
        {!tempResults ? (
          <div className="space-y-3">
            {zoomLevel < 18 && (
              <div className="text-[10px] bg-amber-50 text-amber-700 p-3 rounded-xl border border-amber-200 font-bold flex items-center justify-center gap-2">
                 ⚠️ Level Zoom Saat Ini: {zoomLevel} (Butuh 18+)
              </div>
            )}
            <button 
              onClick={handleDetect} 
              disabled={loading || zoomLevel < 18}
              className={`w-full py-4 rounded-2xl text-sm font-black shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95
                ${zoomLevel >= 18 
                  ? 'bg-slate-900 text-white hover:bg-black' 
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
              `}
            >
              {loading ? "MENGEKSTRAKSI DATA..." : "JALANKAN DETEKSI"}
            </button>
          </div>
        ) : (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
            <div className="text-center p-3 bg-green-50 rounded-xl border border-green-100">
              <span className="block text-[10px] text-green-600 font-bold uppercase tracking-widest">Temuan Baru</span>
              <span className="text-xl font-black text-green-700">{tempResults.length} Objek</span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleSave} 
                className="flex-[2] bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl text-xs font-bold shadow-lg flex items-center justify-center gap-2 uppercase transition-all"
              >
                <Save size={16}/> Simpan Data
              </button>
              <button 
                onClick={() => { setTempResults(null); onClearPreview(); }} 
                className="flex-1 bg-white text-red-500 border border-red-200 py-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 uppercase hover:bg-red-50 transition-all"
              >
                <Trash2 size={16}/>
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}