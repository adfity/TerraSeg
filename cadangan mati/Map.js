"use client";
import { useEffect, useState } from 'react';
import { User, Home, Map as MapIcon, Layers, LocateFixed, Plus, Minus } from 'lucide-react';
import axios from 'axios'; 
import L from 'leaflet';
import GeoDetectionPanel from './panel/geoai';
import BasemapPanel, { BASEMAP_OPTIONS } from './panel/basemap';
import LayersPanel from './panel/layers';
import 'leaflet/dist/leaflet.css';
import { 
  MapContainer, 
  TileLayer, 
  GeoJSON, 
  ScaleControl, 
  useMap,
  useMapEvents,
  Polygon,
  Popup 
} from 'react-leaflet';

function PreviewLayer({ previewData, setPreviewData, getCategoryColor }) {
  const map = useMap();
  
  useMapEvents({
    move: () => {},
    zoom: () => {},
  });

  const removeObject = (idx) => {
    const newData = [...previewData];
    newData.splice(idx, 1);
    setPreviewData(newData);
  };

  if (!previewData || previewData.length === 0) return null;

  return (
    <>
      {previewData.map((obj, idx) => {
        if (!obj.segmentation || obj.segmentation.length === 0) return null;

        const scanCenterPixel = map.latLngToContainerPoint([obj.lat, obj.lng]);

        const polygonCoords = obj.segmentation.map(point => {
          const latLng = map.containerPointToLatLng([
            scanCenterPixel.x + (point[0] - 320),
            scanCenterPixel.y + (point[1] - 320)
          ]);
          return [latLng.lat, latLng.lng];
        });

        return (
          <Polygon 
            key={`preview-${idx}`} 
            positions={polygonCoords}
            pathOptions={{ 
              color: getCategoryColor(obj.kategori),
              fillColor: getCategoryColor(obj.kategori),
              fillOpacity: 0.5,
              dashArray: '5, 10' 
            }}
          >
            <Popup>
              <div className="p-1">
                <p className="font-bold text-sm uppercase">{obj.kategori}</p>
                <button 
                  onClick={() => removeObject(idx)}
                  className="mt-2 w-full bg-red-500 text-white text-[10px] py-1 rounded"
                >
                  Batalkan
                </button>
              </div>
            </Popup>
          </Polygon>
        );
      })}
    </>
  );
}

function SavedDataLayer({ data, fetchSavedData, getCategoryColor }) {
  const handleDelete = async (feature_id) => {
    if (!window.confirm("Hapus data ini secara permanen dari NoSQL?")) return;
    try {
      await axios.delete(`http://127.0.0.1:8000/api/features/${feature_id}/`);
      fetchSavedData(); 
    } catch (err) {
      alert("Gagal menghapus data di MongoDB");
    }
  };

  if (!data || !Array.isArray(data)) return null;

  return (
    <>
      {data.map((item, idx) => (
        <GeoJSON 
          key={item.feature_id || idx}
          data={item.location}
          style={() => ({
            color: getCategoryColor(item.kategori),
            fillColor: getCategoryColor(item.kategori),
            fillOpacity: 0.4,
            opacity: 1,
            weight: 2
          })}
        >
          <Popup>
            <div className="p-1 text-center">
              <p className="font-bold text-sm uppercase text-blue-700">{item.kategori}</p>
              <hr className="my-1" />
              <button 
                onClick={() => handleDelete(item.feature_id)} 
                className="text-red-500 text-[10px] font-bold"
              >
                HAPUS
              </button>
            </div>
          </Popup>
        </GeoJSON>
      ))}
    </>
  );
}

function ZoomButtons() {
  const map = useMap();

  return (
    <div className="fixed bottom-6 right-6 z-[1100]">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col">
        <button
          onClick={() => map.zoomIn()}
          className="w-12 h-12 flex items-center justify-center text-slate-900 hover:bg-slate-100 transition">
          <Plus size={24} strokeWidth={2.4} />
        </button>
        <div className="h-[2px] bg-slate-300" />
        <button
          onClick={() => map.zoomOut()}
          className="w-12 h-12 flex items-center justify-center text-slate-900 hover:bg-slate-100 transition">
          <Minus size={24} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}

function MapReset({ trigger, onDone }) {
  const map = useMap();

  useEffect(() => {
    if (!trigger) return;

    map.flyTo([-2.5, 118], 5, {
      animate: true,
      duration: 1,
    });

    onDone();
  }, [trigger]);

  return null;
}

const HOME_VIEW = {
  center: [-2.5, 118],
  zoom: 5,
};

// Konfigurasi Kategori untuk Map.js juga
const CATEGORIES_MAP = [
  {
    id: 'pendidikan',
    label: 'Sarana Pendidikan',
    color: 'blue',
    endpoint: '/api/rbi-pendidikan/'
  },
  {
    id: 'kesehatan',
    label: 'Sarana Kesehatan',
    color: 'emerald',
    endpoint: '/api/rbi-kesehatan/'
  }
];

export default function Map({ activePanel, setActivePanel }) {
  const [currentBasemap, setCurrentBasemap] = useState(BASEMAP_OPTIONS[0].url);
  const [currentAttribution, setCurrentAttribution] = useState(BASEMAP_OPTIONS[0].attribution);
  const [activeLayers, setActiveLayers] = useState([]); 
  const [rbiData, setRbiData] = useState({}); 
  const [data, setData] = useState(null);
  const [previewData, setPreviewData] = useState([]); 
  const [goHome, setGoHome] = useState(false);

  // Fungsi untuk fetch data berdasarkan kategori
  const fetchRbiData = (endpoint, wilayah, cacheKey) => {
    axios.get(`http://127.0.0.1:8000${endpoint}?wilayah=${wilayah}`)
      .then(res => {
        setRbiData(prev => ({ ...prev, [cacheKey]: res.data }));
      })
      .catch(err => console.error(`Gagal ambil data ${endpoint}`, err));
  };

  const toggleProvinsi = (cities, isSelected) => {
    if (isSelected) {
      setActiveLayers(prev => prev.filter(id => !cities.includes(id)));
    } else {
      setActiveLayers(prev => {
        const newLayers = [...prev];
        cities.forEach(city => {
          if (!newLayers.includes(city)) newLayers.push(city);
        });
        return newLayers;
      });
    }
  };

  const toggleLayer = (layerId) => {
    setActiveLayers(prev => 
      prev.includes(layerId) ? prev.filter(id => id !== layerId) : [...prev, layerId]
    );
  };

  // Fetch data saat activeLayers berubah
  useEffect(() => {
    activeLayers.forEach(layerId => {
      if (!rbiData[layerId]) {
        // Parse layerId untuk mendapatkan kategori dan wilayah
        const parts = layerId.split('_');
        const kategori = parts[0]; // 'pendidikan' atau 'kesehatan'
        const wilayah = parts.slice(1).join('_'); // 'KOTA_BANDUNG', dll
        
        const categoryConfig = CATEGORIES_MAP.find(cat => cat.id === kategori);
        if (categoryConfig) {
          fetchRbiData(categoryConfig.endpoint, wilayah, layerId);
        }
      }
    });
  }, [activeLayers]);

  const fetchData = () => {
    fetch('http://127.0.0.1:8000/api/features/')
      .then(res => res.json())
      .then(json => {
        setData(json); 
      })
      .catch(err => console.error("Error fetching MongoDB data:", err));
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  const getCategoryColor = (cat) => {
    switch (cat.toLowerCase()) {
      case 'bangunan':
        return '#f59e0b';
      case 'pepohonan':
        return '#16a34a';
      case 'perairan':
        return '#2563eb';
      case 'jalan':
        return '#64748b';
      default:
        return '#ef4444';
    }
  };

  const getRbiColor = (kategori) => {
    switch (kategori) {
      case 'pendidikan':
        return '#3b82f6'; // Biru
      case 'kesehatan':
        return '#10b981'; // Hijau
      default:
        return '#ef4444';
    }
  };

  const buttons = [
    { id: 'home', icon: <Home size={20} />, label: 'Default View' },
    { id: 'basemap', icon: <MapIcon size={20} />, label: 'Basemap' },
    { id: 'layers', icon: <Layers size={20} />, label: 'Layers' },
    {
      id: 'radius',
      icon: (
        <div className="w-6 h-6 flex items-center justify-center">
          <img
            src="/icons/bradius570-536.png"
            alt="Radius"
            className="w-full h-full object-contain scale-125"
          />
        </div>
      ),
      label: 'Radius'
    },
    {
      id: 'geoai',
      icon: (
        <div className="w-6 h-6 flex items-center justify-center">
          <img
            src="/icons/geo2.png"
            alt="GeoAI"
            className="w-full h-full object-contain scale-125"
          />
        </div>
      ),
      label: 'GeoAI'
    },
    { id: 'share', icon: <LocateFixed size={20} />, label: 'Lokasi Saya' },
  ];

  return (
    <div className="h-screen w-full relative overflow-hidden bg-slate-900">
      {/* Panel Basemap */}
      {activePanel === 'basemap' && (
        <aside className="fixed top-20 bottom-20 right-20 w-80 rounded-2xl shadow-2xl z-[1050] bg-white flex flex-col overflow-hidden border border-slate-100">
          <BasemapPanel 
            activeUrl={currentBasemap}
            onSelect={(url, attr) => {
              setCurrentBasemap(url);
              setCurrentAttribution(attr);
            }}
          />
        </aside>
      )}

      {/* Panel Layers */}
      {activePanel === 'layers' && (
        <aside className="fixed top-20 bottom-20 right-20 w-80 rounded-2xl shadow-2xl z-[1050] bg-white flex flex-col overflow-hidden border border-slate-100">
          <LayersPanel 
            activeLayers={activeLayers} 
            onToggleLayer={toggleLayer} 
            rbiData={rbiData}
            onToggleProvinsi={toggleProvinsi}
            fetchRbiData={fetchRbiData}
          />
        </aside>
      )}

      {/* Sidebar */}
      <div className="fixed right-4 top-1/2 -translate-y-1/2 z-[1100]">
        <div className="flex flex-col space-y-3 bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-xl">
          {buttons.map(btn => (
            <button
              key={btn.id}
              onClick={() => {
                if (btn.id === 'home') {
                  setGoHome(true);
                  setActivePanel(null);
                } else {
                  setActivePanel(activePanel === btn.id ? null : btn.id);
                }
              }}
              className={`
                group relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300
                ${activePanel === btn.id 
                  ? 'bg-cyan-500 text-white shadow-cyan-500/50 scale-110' 
                  : 'bg-white text-slate-700 hover:bg-slate-100 shadow-md'}
              `}
            >
              <div className="transition-transform duration-300 group-hover:scale-110">
                {activePanel === btn.id ? <span className="text-xl font-bold">≫</span> : btn.icon}
              </div>
              <span className="absolute right-16 top-1/2 -translate-y-1/2 whitespace-nowrap bg-slate-800 text-white text-[11px] px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none shadow-xl border border-slate-700">
                {btn.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <MapContainer
        zoomControl={false}
        center={[-2.5, 118]} 
        zoom={5} 
        minZoom={3}
        maxZoom={22}
        maxBounds={[[-11.5, 94.5], [6.5, 141.5]]}
        maxBoundsViscosity={1.0}
        doubleClickZoom={false}
        className="h-full w-full z-0"
      >
        <MapReset trigger={goHome} onDone={() => setGoHome(false)} />
          
        <TileLayer
          key={currentBasemap}
          url={currentBasemap}
          attribution={currentAttribution}
          maxZoom={22}
          maxNativeZoom={18}
          detectRetina
        />
          
        {/* Render Layer RBI (Pendidikan & Kesehatan) */}
        {Object.keys(rbiData).map(layerKey => {
          if (!activeLayers.includes(layerKey)) return null;
          
          // Parse kategori dari layerKey
          const parts = layerKey.split('_');
          const kategori = parts[0]; // 'pendidikan' atau 'kesehatan'
          const wilayah = parts.slice(1).join('_');
          const categoryConfig = CATEGORIES_MAP.find(cat => cat.id === kategori);
          
          return (
            <GeoJSON 
              key={`rbi-${layerKey}`}
              data={rbiData[layerKey]}
              pointToLayer={(f, latlng) => L.circleMarker(latlng, {
                radius: kategori === 'pendidikan' ? 4 : 5, // Lebih besar untuk kesehatan
                fillColor: getRbiColor(kategori),
                color: "#ffffff",
                weight: kategori === 'kesehatan' ? 2 : 1,
                fillOpacity: 0.9
              })}
              onEachFeature={(feature, layer) => {
                const properties = feature.properties || {};
                layer.bindPopup(`
                  <div style="font-size:12px; min-width:180px">
                    <b style="color:${getRbiColor(kategori)}">${properties.NAMOBJ || properties.nama || 'Tanpa Nama'}</b><br/>
                    <span>${properties.REMARK || properties.jenis || (kategori === 'pendidikan' ? 'Sekolah' : 'Fasilitas Kesehatan')}</span><br/>
                    <hr style="margin:4px 0"/>
                    <small style="color:#666">Wilayah: ${wilayah}</small><br/>
                    <small style="color:${getRbiColor(kategori)}; font-weight:bold">${categoryConfig?.label || kategori.toUpperCase()}</small>
                  </div>
                `);
              }}
            />
          );
        })}

        {/* Panel GeoAI */}
        {activePanel === 'geoai' && (
          <div className="leaflet-top leaflet-right !static">
            <aside className="fixed top-20 bottom-20 right-20 w-80 rounded-2xl shadow-2xl z-[1050] bg-white flex flex-col overflow-hidden border border-slate-100 pointer-events-auto">
              <GeoDetectionPanel 
                onNewData={fetchData}
                onDetectionComplete={(res) => setPreviewData(res)}
                onClearPreview={() => setPreviewData([])}
                previewData={previewData}
                setPreviewData={setPreviewData}
              />
            </aside>
            <div className="detection-frame"></div>
          </div>
        )}

        <PreviewLayer 
          previewData={previewData} 
          setPreviewData={setPreviewData} 
          getCategoryColor={getCategoryColor} 
        />
        <SavedDataLayer 
          data={data} 
          fetchSavedData={fetchData} 
          getCategoryColor={getCategoryColor} 
        />
        <ZoomButtons />
        <ScaleControl position="bottomleft" />
      </MapContainer>
    </div>
  );
}