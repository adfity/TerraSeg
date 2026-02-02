"use client";
import { useState } from 'react';
import html2canvas from 'html2canvas';
import { Scan, Save, Trash2, Box } from 'lucide-react';
import axios from 'axios';
import { useMap, useMapEvents } from 'react-leaflet';
import { toast } from 'react-hot-toast';

function ZoomHandler({ onZoomChange }) {
  useMapEvents({
    zoomend: (e) => onZoomChange(e.target.getZoom()),
  });
  return null;
}

export default function GeoDetectionPanel({ 
  onNewData, 
  onDetectionComplete, 
  onClearPreview, 
  previewData, 
  setPreviewData 
}) {
  const map = useMap();
  const [zoomLevel, setZoomLevel] = useState(map.getZoom());
  const [selectedCats, setSelectedCats] = useState([]);
  const [tempResults, setTempResults] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // State untuk mode seleksi - hanya bbox saja
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
      if (zoomLevel < 18) {
        toast.error('Harap zoom lebih dekat (Minimal Level 18)!');
        return;
      }
      
      if (selectedCats.length === 0) {
        toast.error('Silakan pilih minimal satu kategori!');
        return;
      }

      setLoading(true);
      if (onClearPreview) onClearPreview();

      // Tampilkan toast loading
      const detectToast = toast.loading('Memproses deteksi...');

      try {
        const center = map.getCenter();
        const scanLat = center.lat;
        const scanLng = center.lng;

        const mapElement = document.querySelector('.leaflet-container');
        const rect = mapElement.getBoundingClientRect();
        
        // Hanya gunakan mode bbox
        const startX = (rect.width - 640) / 2;
        const startY = (rect.height - 640) / 2;
        const captureWidth = 640;
        const captureHeight = 640;

        const canvas = await html2canvas(mapElement, {
          useCORS: true,
          allowTaint: true,
          x: startX,
          y: startY,
          width: captureWidth,
          height: captureHeight,
          scale: 1,
          logging: false,
          ignoreElements: (el) => (
            el.tagName === 'BUTTON' || 
            el.tagName === 'ASIDE' || 
            el.classList.contains('absolute') || 
            el.classList.contains('fixed') ||
            el.classList.contains('lucide')
          )
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
          
          toast.success(`Berhasil mendeteksi ${data.results.length} objek!`, {
            id: detectToast,
            duration: 3000,
          });
        } else {
          toast.error('Tidak ada objek ditemukan.', {
            id: detectToast,
          });
        }
      } catch (err) {
        console.error("Error:", err);
        toast.error(`Terjadi kesalahan: ${err.message}`, {
          id: detectToast,
        });
      } finally {
        setLoading(false);
      }
  };

  const handleSave = async () => {
    if (!previewData || previewData.length === 0) {
      toast.error('Tidak ada data untuk disimpan');
      return;
    }

    const saveToast = toast.loading('Menyimpan data...');

    try {
      const dataToSave = previewData.map(obj => {
        const scanCenterPixel = map.latLngToContainerPoint([obj.lat, obj.lng]);
        const wktPoints = obj.segmentation.map(pt => {
          const latLng = map.containerPointToLatLng([
            scanCenterPixel.x + (pt[0] - 320),
            scanCenterPixel.y + (pt[1] - 320)
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
            scan_mode: selectionMode,
            zoom_level: zoomLevel,
            timestamp: new Date().toISOString()
          }
        };
      });

      const res = await axios.post('http://127.0.0.1:8000/api/save-detection/', { 
        features: dataToSave 
      });

      if (res.status === 201) {
        toast.success('Berhasil menyimpan data!', {
          id: saveToast,
          duration: 3000,
        });
        setTempResults(null);
        setPreviewData([]);
        if (onNewData) onNewData();
      }
    } catch (err) {
      toast.error(`Gagal simpan: ${err.response?.data?.message || err.message}`, {
        id: saveToast,
      });
    }
  };

  const handleCancel = () => {
    toast.success('Deteksi dibatalkan', {
      duration: 2000,
    });
    setTempResults(null);
    if (onClearPreview) onClearPreview();
  };

  return (
    <div className="absolute top-0 right-0 z-[1000] h-full w-80 bg-white/95 backdrop-blur-md shadow-2xl border-l border-slate-200 p-6 flex flex-col overflow-y-auto">
      
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-xl flex items-center gap-2 text-blue-700">
          <Scan size={24}/> GeoAI Panel
        </h3>
      </div>

      <div className="space-y-6 flex-1">
        {/* Hapus section mode seleksi - hanya bbox saja */}
        
        {/* Section Kategori */}
        <section>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 block">
            Pilih Objek Deteksi
          </label>
          <div className="grid grid-cols-2 gap-2">
            {categories.map(cat => (
              <button 
                key={cat.id} 
                onClick={() => handleToggleCat(cat.id)}
                className={`text-xs p-3 rounded-xl border-2 transition-all font-bold flex flex-col items-center gap-1 ${
                  selectedCats.includes(cat.id) 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg' 
                  : 'bg-white border-slate-100 text-slate-600 hover:border-blue-200'
                }`}
              >
                <span className="text-lg">{cat.label.split(' ')[0]}</span>
                {cat.label.split(' ')[1]}
              </button>
            ))}
          </div>
        </section>

        {/* Section Zoom Info */}
        <section className="pt-4 border-t border-slate-100">
          <div className="text-xs text-slate-600 mb-4">
            <p className="font-semibold">Zoom Level: <span className={zoomLevel >= 18 ? "text-green-600" : "text-red-500"}>{zoomLevel}</span></p>
            <p className="text-slate-500 mt-1">Minimal zoom level 18 untuk deteksi optimal</p>
          </div>

          {!tempResults ? (
            <button 
              onClick={handleDetect} 
              disabled={loading || zoomLevel < 18}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl text-sm font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Menganalisis...
                </>
              ) : (
                'Jalankan Deteksi'
              )}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="text-xs bg-green-50 text-green-700 p-4 rounded-xl border border-green-200">
                <span className="font-bold text-lg">HASIL: {tempResults.length} Objek</span>
                <p className="text-green-600 mt-1">Klik Simpan untuk menyimpan ke database</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleSave} 
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-sm font-bold shadow-lg flex items-center justify-center gap-2"
                >
                  <Save size={16}/> Simpan
                </button>
                <button 
                  onClick={handleCancel} 
                  className="flex-1 bg-white hover:bg-slate-100 text-red-600 border border-red-200 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                >
                  <Trash2 size={16}/> Batal
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      <ZoomHandler onZoomChange={(z) => setZoomLevel(z)} />
    </div>
  );
}