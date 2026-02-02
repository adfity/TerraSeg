"use client";
import { useState, useRef } from 'react';
import { Circle, Marker, Popup, useMap } from 'react-leaflet';
import { Navigation, MapPin, Trash2, Target, Copy } from 'lucide-react';
import L from 'leaflet';
import { toast } from 'react-hot-toast';

const createCenterIcon = () => L.divIcon({
  html: `
    <div style="
      width: 20px;
      height: 20px;
      background: #3b82f6;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 0 10px rgba(59, 130, 246, 0.8);
    "></div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export default function RadiusPanel({ 
  onRadiusCreated, 
  onRadiusCleared,
  activeRadius,
  setActiveRadius 
}) {
  const map = useMap();
  const [center, setCenter] = useState(null);
  const [radius, setRadius] = useState(1000);
  const [drawing, setDrawing] = useState(false);
  const [radiusLayers, setRadiusLayers] = useState([]);

  const radiusOptions = [
    { value: 500, label: '500m' },
    { value: 1000, label: '1km' },
    { value: 2000, label: '2km' },
    { value: 5000, label: '5km' },
    { value: 10000, label: '10km' },
    { value: 20000, label: '20km' },
    { value: 50000, label: '50km' },
    { value: 100000, label: '100km' }
  ];

  const clickHandlerRef = useRef(null);

  // PERBAIKAN: Fungsi yang benar untuk start drawing
  const handleStartDrawing = () => {
    // Jika sedang drawing, batalkan
    if (drawing) {
      handleCancelDrawing();
      return;
    }
    
    // Mulai drawing mode
    setDrawing(true);
    map.dragging.disable();
    map.doubleClickZoom.disable();
    map.getContainer().style.cursor = 'crosshair';
    setCenter(null);
    
    // Buat event handler untuk klik peta
    const handleMapClick = (e) => {
      const clickedLatLng = e.latlng;
      setCenter(clickedLatLng);
      
      // Hentikan drawing mode
      map.dragging.enable();
      map.doubleClickZoom.enable();
      map.getContainer().style.cursor = '';
      map.off('click', handleMapClick);
      setDrawing(false);
      
      // Zoom ke titik yang dipilih
      map.flyTo(clickedLatLng, Math.max(map.getZoom(), 15), {
        animate: true,
        duration: 1.5
      });
    };
    
    // Attach event listener
    clickHandlerRef.current = handleMapClick;
    map.on('click', handleMapClick);
  };

  // PERBAIKAN: Fungsi yang benar untuk cancel drawing
  const handleCancelDrawing = () => {
    // Hapus event listener jika ada
    if (clickHandlerRef.current) {
      map.off('click', clickHandlerRef.current);
      clickHandlerRef.current = null;
    }
    
    // Kembalikan kontrol peta
    map.dragging.enable();
    map.doubleClickZoom.enable();
    map.getContainer().style.cursor = '';
    
    // Update state
    setDrawing(false);
  };

  // Buat radius
  const createRadius = () => {
    if (!center) {
      toast.error('Pilih titik pusat terlebih dahulu!');
      return;
    }

    const newRadius = {
      id: Date.now(),
      center: [center.lat, center.lng],
      radius: radius,
      color: '#3b82f6',
      fillOpacity: 0.15,
      weight: 3,
    };

    setRadiusLayers(prev => [...prev, newRadius]);
    setActiveRadius(newRadius.id);
    
    if (onRadiusCreated) onRadiusCreated(newRadius);
    toast.success(`Radius ${radius.toLocaleString()}m berhasil dibuat!`);
  };

  // Hapus radius
  const removeRadius = (id) => {
    setRadiusLayers(prev => prev.filter(r => r.id !== id));
    if (activeRadius === id) setActiveRadius(null);
    if (onRadiusCleared) onRadiusCleared(id);
  };

  // Hapus semua radius
  const clearAll = () => {
    if (radiusLayers.length === 0) {
      toast.error('Tidak ada radius untuk dihapus');
      return;
    }
    
    toast.custom((t) => (
      <div className="bg-white rounded-xl shadow-xl p-4 min-w-[300px]">
        <p className="font-semibold text-slate-800 mb-3">
          Hapus semua radius? ({radiusLayers.length} radius)
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Batal
          </button>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              setRadiusLayers([]);
              setActiveRadius(null);
              if (onRadiusCleared) onRadiusCleared('all');
              toast.success('Semua radius berhasil dihapus');
            }}
            className="px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded-lg"
          >
            Hapus Semua
          </button>
        </div>
      </div>
    ));
  };

  // Copy koordinat
  const copyCoordinates = () => {
    if (!center) return;
    
    navigator.clipboard.writeText(`${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}`)
      .then(() => toast.success('Koordinat disalin!'))
      .catch(() => toast.error('Gagal menyalin koordinat'));
  };

  // Handle custom radius input
  const handleCustomRadiusChange = (e) => {
    let value = parseInt(e.target.value) || 1000;
    
    if (value > 1000000) value = 1000000;
    if (value < 100) value = 100;
    
    setRadius(value);
  };

  return (
    <>
      {/* Radius Circles di peta */}
      {radiusLayers.map(radiusLayer => (
        <Circle
          key={radiusLayer.id}
          center={radiusLayer.center}
          radius={radiusLayer.radius}
          pathOptions={{
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.15,
            weight: 3,
          }}
        >
          <Popup>
            <div className="p-2">
              <p className="font-bold text-blue-700">RADIUS</p>
              <p className="text-sm">Jarak: {radiusLayer.radius.toLocaleString()}m</p>
              <button 
                onClick={() => removeRadius(radiusLayer.id)}
                className="mt-2 w-full bg-red-100 text-red-700 text-xs py-1 rounded hover:bg-red-200"
              >
                Hapus
              </button>
            </div>
          </Popup>
        </Circle>
      ))}

      {/* Center Marker */}
      {center && (
        <Marker position={center} icon={createCenterIcon()}>
          <Popup>
            <div className="p-2">
              <p className="font-bold text-blue-700">TITIK PUSAT</p>
              <p className="text-sm">Lat: {center.lat.toFixed(6)}</p>
              <p className="text-sm">Lng: {center.lng.toFixed(6)}</p>
              <button 
                onClick={copyCoordinates}
                className="w-full bg-blue-100 text-blue-700 text-xs py-1 rounded hover:bg-blue-200 mt-2"
              >
                <Copy size={12} /> Salin Koordinat
              </button>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Panel UI */}
      <div className="absolute top-0 right-0 z-[1000] h-full w-80 bg-white/95 backdrop-blur-md shadow-2xl border-l border-slate-200 p-6 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-xl flex items-center gap-2 text-blue-700">
            <Navigation size={24}/> Radius
          </h3>
          {radiusLayers.length > 0 && (
            <button 
              onClick={clearAll}
              className="text-red-500 text-xs flex items-center gap-1 hover:text-red-700 hover:bg-red-50 p-1 rounded"
            >
              <Trash2 size={14}/> Hapus Semua
            </button>
          )}
        </div>

        {/* Status */}
        <div className={`p-3 rounded-xl border ${drawing 
          ? 'bg-yellow-50 border-yellow-300' 
          : center 
            ? 'bg-green-50 border-green-300' 
            : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <Target size={18} className={drawing ? 'text-yellow-600' : center ? 'text-green-600' : 'text-slate-400'} />
            <div>
              <p className="text-xs font-bold">
                {drawing 
                  ? 'Klik di peta untuk pilih titik pusat' 
                  : center 
                    ? 'Titik pusat terpilih' 
                    : 'Belum ada titik pusat'}
              </p>
            </div>
          </div>
        </div>

        {/* PERBAIKAN: Tombol yang terpisah dan jelas */}
        {!drawing ? (
          <button
            onClick={handleStartDrawing}
            className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 mt-4 bg-blue-600 text-white hover:bg-blue-700"
          >
            <MapPin size={16}/>
            PILIH TITIK PUSAT
          </button>
        ) : (
          <button
            onClick={handleCancelDrawing}
            className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 mt-4 bg-red-100 text-red-700 hover:bg-red-200"
          >
            BATALKAN PEMILIHAN
          </button>
        )}

        {/* Pilihan Radius */}
        {center && !drawing && (
          <div className="mt-4">
            <label className="text-xs font-bold text-slate-700 mb-2 block">Jarak Radius</label>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {radiusOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setRadius(opt.value)}
                  className={`p-2 rounded-lg text-xs font-bold ${
                    radius === opt.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="mb-4">
              <label className="text-xs text-slate-600 mb-2 block">Custom (meter)</label>
              <input
                type="number"
                min="100"
                max="1000000"
                value={radius}
                onChange={handleCustomRadiusChange}
                className="w-full p-2 border border-slate-300 rounded-lg text-sm"
              />
              <p className="text-xs text-slate-500 mt-1">
                100m - 1,000,000m (1000km)
              </p>
            </div>

            <button
              onClick={createRadius}
              className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-blue-700"
            >
              BUAT RADIUS {radius >= 1000 ? `(${radius/1000}km)` : `(${radius}m)`}
            </button>
          </div>
        )}

        {/* Daftar Radius */}
        {radiusLayers.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-200">
            <label className="text-xs font-bold text-slate-700 mb-2 block">
              Radius Aktif ({radiusLayers.length})
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {radiusLayers.map(radiusLayer => (
                <div 
                  key={radiusLayer.id}
                  className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center hover:bg-slate-100 cursor-pointer"
                  onClick={() => {
                    setActiveRadius(radiusLayer.id);
                    map.flyTo(radiusLayer.center, Math.max(map.getZoom(), 13), {
                      animate: true,
                      duration: 1
                    });
                  }}
                >
                  <div>
                    <p className="text-xs font-bold">
                      Radius {radiusLayer.radius >= 1000 
                        ? `${(radiusLayer.radius/1000).toFixed(1)}km` 
                        : `${radiusLayer.radius}m`}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRadius(radiusLayer.id);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={14}/>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}