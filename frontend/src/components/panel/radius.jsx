"use client";
import { useState, useRef } from 'react';
import { Circle, Marker, Popup, useMap } from 'react-leaflet';
import { Navigation, MapPin, Trash2, Target, Copy, Eye } from 'lucide-react';
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
  const clickHandlerRef = useRef(null);

  const radiusOptions = [
    { value: 500, label: '500m' },
    { value: 1000, label: '1km' },
    { value: 2000, label: '2km' },
    { value: 5000, label: '5km' },
    { value: 10000, label: '10km' }
  ];

  const handleStartDrawing = () => {
    if (drawing) {
      handleCancelDrawing();
      return;
    }
    
    setDrawing(true);
    map.dragging.disable();
    map.doubleClickZoom.disable();
    map.getContainer().style.cursor = 'crosshair';
    setCenter(null);
    
    const handleMapClick = (e) => {
      const clickedLatLng = e.latlng;
      setCenter(clickedLatLng);
      
      map.dragging.enable();
      map.doubleClickZoom.enable();
      map.getContainer().style.cursor = '';
      map.off('click', handleMapClick);
      setDrawing(false);
      
      map.flyTo(clickedLatLng, Math.max(map.getZoom(), 15), {
        animate: true,
        duration: 1.5
      });
    };
    
    clickHandlerRef.current = handleMapClick;
    map.on('click', handleMapClick);
  };

  const handleCancelDrawing = () => {
    if (clickHandlerRef.current) {
      map.off('click', clickHandlerRef.current);
      clickHandlerRef.current = null;
    }
    
    map.dragging.enable();
    map.doubleClickZoom.enable();
    map.getContainer().style.cursor = '';
    setDrawing(false);
  };

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
    toast.success(`Radius ${radius >= 1000 ? `${radius/1000}km` : `${radius}m`} dibuat!`);
  };

  const removeRadius = (id) => {
    setRadiusLayers(prev => prev.filter(r => r.id !== id));
    if (activeRadius === id) setActiveRadius(null);
    if (onRadiusCleared) onRadiusCleared(id);
  };

  const clearAll = () => {
    if (radiusLayers.length === 0) {
      toast.error('Tidak ada radius');
      return;
    }
    
    setRadiusLayers([]);
    setActiveRadius(null);
    if (onRadiusCleared) onRadiusCleared('all');
    toast.success('Semua radius dihapus');
  };

  const copyCoordinates = () => {
    if (!center) return;
    
    navigator.clipboard.writeText(`${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}`)
      .then(() => toast.success('Koordinat disalin!'))
      .catch(() => toast.error('Gagal menyalin'));
  };

  return (
    <>
      {/* Radius Circles */}
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
                className="w-full bg-blue-100 text-blue-700 text-xs py-1 rounded hover:bg-blue-200 mt-2 flex items-center justify-center gap-1"
              >
                <Copy size={12} /> Salin
              </button>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Panel UI */}
      <div 
        className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800"
        onWheel={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-lg uppercase tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Navigation size={22}/> Radius Tool
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {radiusLayers.length} radius aktif
              </p>
            </div>
            {radiusLayers.length > 0 && (
              <button 
                onClick={clearAll}
                className="text-red-500 text-xs flex items-center gap-1 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all"
              >
                <Trash2 size={14}/> Hapus
              </button>
            )}
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Status */}
          <div className={`p-4 rounded-2xl border-2 ${drawing 
            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-800' 
            : center 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-800' 
              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
          }`}>
            <div className="flex items-center gap-3">
              <Target size={18} className={drawing ? 'text-yellow-600' : center ? 'text-green-600' : 'text-slate-400'} />
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {drawing ? '📍 Klik peta untuk pilih titik' : center ? '✓ Titik terpilih' : 'Belum ada titik'}
                </p>
              </div>
            </div>
          </div>

          {/* Tombol Pilih Titik */}
          {!drawing ? (
            <button
              onClick={handleStartDrawing}
              className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700 shadow-lg transition-all"
            >
              <MapPin size={16}/>
              PILIH TITIK PUSAT
            </button>
          ) : (
            <button
              onClick={handleCancelDrawing}
              className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-200 transition-all"
            >
              BATALKAN
            </button>
          )}

          {/* Pilihan Radius */}
          {center && !drawing && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                📏 Jarak Radius
              </label>
              <div className="grid grid-cols-3 gap-2">
                {radiusOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setRadius(opt.value)}
                    className={`p-2.5 rounded-xl text-xs font-bold transition-all ${
                      radius === opt.value
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <button
                onClick={createRadius}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl text-sm font-bold hover:from-green-600 hover:to-green-700 shadow-lg transition-all"
              >
                BUAT RADIUS {radius >= 1000 ? `${radius/1000}km` : `${radius}m`}
              </button>
            </div>
          )}

          {/* Daftar Radius */}
          {radiusLayers.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-3 block uppercase tracking-wide">
                📍 Radius Aktif
              </label>
              <div className="space-y-2">
                {radiusLayers.map(radiusLayer => (
                  <div 
                    key={radiusLayer.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex justify-between items-center hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer transition-all"
                    onClick={() => {
                      setActiveRadius(radiusLayer.id);
                      map.flyTo(radiusLayer.center, Math.max(map.getZoom(), 13), {
                        animate: true,
                        duration: 1
                      });
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Eye size={14} className="text-blue-500"/>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {radiusLayer.radius >= 1000 
                          ? `${(radiusLayer.radius/1000).toFixed(1)}km` 
                          : `${radiusLayer.radius}m`}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRadius(radiusLayer.id);
                      }}
                      className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all"
                    >
                      <Trash2 size={14}/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}