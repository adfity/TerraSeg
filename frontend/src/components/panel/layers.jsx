"use client";
import { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { GeoJSON } from 'react-leaflet';
import { 
  ChevronDown, ChevronRight, School, 
  CheckCircle2, 
  Stethoscope, MapPin,
  Map,
  Globe,
  Layers as LayersIcon
} from 'lucide-react';

const CATEGORIES = [
  {
    id: 'batas_wilayah',
    label: 'Batas Wilayah',
    icon: <Map size={18} />,
    color: 'blue',
    type: 'boundary', // Tipe khusus untuk batas wilayah
    layers: [
      {
        id: 'batas_provinsi',
        label: 'Batas Provinsi',
        description: 'Garis batas antar provinsi',
        icon: <Globe size={14} />,
        color: 'blue',
        endpoint: '/api/batas-provinsi/'
      },
      {
        id: 'batas_kabupaten',
        label: 'Batas Kabupaten',
        description: 'Garis batas kabupaten/kota',
        icon: <MapPin size={14} />,
        color: 'blue',
        endpoint: '/api/batas-kabupaten/'
      }
    ]
  },
  {
    id: 'pendidikan',
    label: 'Sarana Pendidikan',
    icon: <School size={18} />,
    color: 'blue',
    endpoint: '/api/rbi-pendidikan/',
    provinsi: [
      { nama: "JAWA BARAT", cities: ["KOTA BANDUNG", "KAB BOGOR"] },
      { nama: "JAWA TENGAH", cities: ["KOTA SEMARANG", "KOTA SURAKARTA"] },
      { nama: "JAWA TIMUR", cities: ["KOTA MALANG", "KOTA SURABAYA"] }
    ]
  },
  {
    id: 'kesehatan',
    label: 'Sarana Kesehatan',
    icon: <Stethoscope size={18} />,
    color: 'blue',
    endpoint: '/api/rbi-kesehatan/',
    provinsi: [
      { nama: "JAWA BARAT", cities: ["KOTA BANDUNG", "KAB BOGOR"] },
      { nama: "JAWA TENGAH", cities: ["KOTA SEMARANG", "KOTA SURAKARTA"] },
      { nama: "JAWA TIMUR", cities: ["KOTA MALANG", "KOTA SURABAYA"] }
    ]
  }
];

// Komponen untuk render batas wilayah
export function BoundaryLayer({ activeLayers, boundaryData, getBoundaryStyle, onEachBoundary }) {
  if (!boundaryData) return null;

  return (
    <>
      {/* Layer Batas Provinsi */}
      {activeLayers.includes('batas_provinsi') && boundaryData.provinsi && (
        <GeoJSON 
          key="batas-provinsi"
          data={boundaryData.provinsi}
          style={getBoundaryStyle('provinsi')}
          onEachFeature={(feature, layer) => onEachBoundary(feature, layer, 'provinsi')}
        />
      )}

      {/* Layer Batas Kabupaten */}
      {activeLayers.includes('batas_kabupaten') && boundaryData.kabupaten && (
        <GeoJSON 
          key="batas-kabupaten"
          data={boundaryData.kabupaten}
          style={getBoundaryStyle('kabupaten')}
          onEachFeature={(feature, layer) => onEachBoundary(feature, layer, 'kabupaten')}
        />
      )}
    </>
  );
}

// Hook untuk mengelola data batas wilayah
export function useBoundaryData(activeLayers) {
  const [boundaryData, setBoundaryData] = useState({
    provinsi: null,
    kabupaten: null
  });

  const fetchBoundaryData = async (type) => {
    try {
      const endpoint = type === 'provinsi' ? '/api/batas-provinsi/' : '/api/batas-kabupaten/';
      const response = await axios.get(`http://127.0.0.1:8000${endpoint}`);
      
      // Debug: Lihat struktur data
      console.log(`Data ${type}:`, response.data);
      if (response.data.features && response.data.features.length > 0) {
        console.log(`Contoh properti ${type}:`, response.data.features[0].properties);
      }
      
      setBoundaryData(prev => ({
        ...prev,
        [type]: response.data
      }));
    } catch (error) {
      console.error(`Gagal mengambil data batas ${type}:`, error);
    }
  };

  useEffect(() => {
    if (activeLayers.includes('batas_provinsi') && !boundaryData.provinsi) {
      fetchBoundaryData('provinsi');
    }
    if (activeLayers.includes('batas_kabupaten') && !boundaryData.kabupaten) {
      fetchBoundaryData('kabupaten');
    }
  }, [activeLayers, boundaryData]);

  // Fungsi styling
  const getBoundaryStyle = (type) => {
    if (type === 'provinsi') {
      return {
        color: "#006aff",
        weight: 2,
        fillColor: "transparent",
        fillOpacity: 0,
        dashArray: "8, 8",
        opacity: 0.7
      };
    } else {
      return {
        color: "#fffb00",
        weight: 2,
        fillColor: "transparent",
        fillOpacity: 0,
        dashArray: "4, 4",
        opacity: 0.6
      };
    }
  };

  // Event handler - TANPA efek hover warna
  const onEachBoundary = (feature, layer, type) => {
    const properties = feature.properties || {};
    const name = properties.name || properties.NAMOBJ || 'Tanpa Nama';
    const code = properties.code || properties.KODE || '';
    const level = properties.level || type;
    
    layer.bindPopup(`
      <div style="font-size:12px; min-width:180px">
        <b>${level === 'province' ? 'Provinsi' : 'Kabupaten/Kota'}</b><br/>
        <strong>${name}</strong><br/>
        ${code ? `<small>Kode: ${code}</small><br/>` : ''}
        ${properties.latitude ? `<small>Lat: ${properties.latitude.toFixed(4)}</small><br/>` : ''}
        ${properties.longitude ? `<small>Lon: ${properties.longitude.toFixed(4)}</small>` : ''}
      </div>
    `);
    
    // Efek hover SEDERHANA tanpa perubahan warna
    layer.on({
      mouseover: (e) => {
        const l = e.target;
        l.setStyle({
          weight: type === 'provinsi' ? 3 : 2, // Sedikit lebih tebal saat hover
          dashArray: "0", // Garis solid saat hover
          opacity: 1
        });
      },
      mouseout: (e) => {
        const l = e.target;
        l.setStyle(getBoundaryStyle(type));
      }
    });
  };

  return {
    boundaryData,
    getBoundaryStyle,
    onEachBoundary,
    fetchBoundaryData
  };
}

// Main Panel Component
export default function LayersPanel({ activeLayers, onToggleLayer, rbiData, onToggleProvinsi, fetchRbiData }) {
  const [activeTab, setActiveTab] = useState('pendidikan');
  const [expandedProv, setExpandedProv] = useState(["JAWA BARAT"]);

  const currentCat = CATEGORIES.find(c => c.id === activeTab);
  const isBoundaryTab = currentCat?.type === 'boundary';

  // Hitung statistik berdasarkan kategori aktif
  const stats = useMemo(() => {
    if (isBoundaryTab) return {};
    
    const counts = {};
    currentCat?.provinsi?.forEach(prov => {
      prov.cities.forEach(city => {
        const cacheKey = `${activeTab}_${city}`;
        counts[city] = rbiData[cacheKey]?.features?.length || 0;
      });
    });
    return counts;
  }, [rbiData, activeTab, currentCat, isBoundaryTab]);

  return (
    <div className="flex flex-col h-full bg-white select-none">
      {/* HEADER */}
      <div className="p-4 bg-slate-900 text-white">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3">Layer Kontrol</p>
        <div className="flex gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`p-3 rounded-xl transition-all ${
                activeTab === cat.id 
                ? `bg-${cat.color}-600 text-white shadow-lg shadow-${cat.color}-900/20 scale-105` 
                : 'bg-white/10 text-slate-400 hover:bg-white/20'
              }`}
              title={cat.label}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 space-y-4">
        {isBoundaryTab ? (
          /* CONTENT UNTUK BATAS WILAYAH */
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                Batas Administratif
              </h4>
              <span className="text-[10px] text-slate-400 font-medium">Data Vektor</span>
            </div>

            <div className="space-y-3">
              {currentCat.layers.map(layer => {
                const isActive = activeLayers.includes(layer.id);
                
                return (
                  <button
                    key={layer.id}
                    onClick={() => onToggleLayer(layer.id)}
                    className={`group w-full p-4 rounded-2xl border-2 transition-all flex items-start gap-3 text-left ${
                      isActive
                        ? `border-${layer.color}-500 bg-${layer.color}-50/50`
                        : 'border-transparent bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      isActive ? `bg-${layer.color}-100 text-${layer.color}-600` : 'bg-slate-100 text-slate-400'
                    }`}>
                      {layer.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-bold ${
                          isActive ? `text-${layer.color}-700` : 'text-slate-700'
                        }`}>
                          {layer.label}
                        </p>
                        <div className={`h-2 w-2 rounded-full ${
                          isActive ? `bg-${layer.color}-500` : 'bg-slate-300'
                        }`} />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {layer.description}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          isActive 
                            ? `bg-${layer.color}-100 text-${layer.color}-700`
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {layer.id.includes('provinsi') ? 'Line Feature' : 'Polygon Feature'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          • Sumber: BPS
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* Informasi tambahan */}
              <div className="mt-4 p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                <p className="text-xs text-blue-800 font-medium mb-1">Tips:</p>
                <p className="text-[10px] text-blue-600">
                  • Aktifkan kedua layer untuk melihat hierarki batas
                  <br/>
                  • Zoom in untuk melihat detail batas kabupaten
                  <br/>
                  • Klik pada garis untuk melihat informasi wilayah
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* CONTENT UNTUK RBI (PENDIDIKAN & KESEHATAN) */
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                {currentCat?.label}
              </h4>
              <span className="text-[10px] text-slate-400 font-medium">Data Terpusat</span>
            </div>

            {currentCat?.provinsi?.map((prov) => {
              const prefixedCities = prov.cities.map(city => `${activeTab}_${city}`);
              const isAllSelected = prefixedCities.every(city => activeLayers.includes(city));
              const totalProv = prov.cities.reduce((acc, city) => acc + (stats[city] || 0), 0);

              return (
                <div key={prov.nama} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Header Provinsi */}
                  <div className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div 
                      className="flex items-center gap-3 cursor-pointer flex-1"
                      onClick={() => setExpandedProv(prev => 
                        prev.includes(prov.nama) ? prev.filter(p => p !== prov.nama) : [...prev, prov.nama]
                      )}
                    >
                      <div className={`p-1.5 rounded-lg bg-${currentCat.color}-50 text-${currentCat.color}-600`}>
                        {expandedProv.includes(prov.nama) ? <ChevronDown size={14} strokeWidth={3}/> : <ChevronRight size={14} strokeWidth={3}/>}
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-slate-700 leading-none">{prov.nama}</p>
                        <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">{totalProv} Objek ditemukan</p>
                      </div>
                    </div>

                    <button 
                      onClick={() => onToggleProvinsi(prefixedCities, isAllSelected)}
                      className={`p-2 rounded-lg transition-all ${
                        isAllSelected 
                        ? `bg-${currentCat.color}-600 text-white` 
                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      <CheckCircle2 size={16} />
                    </button>
                  </div>

                  {/* Child Cities */}
                  {expandedProv.includes(prov.nama) && (
                    <div className="px-3 pb-3 pt-1 grid grid-cols-1 gap-1.5">
                      {prov.cities.map(city => {
                        const layerId = `${activeTab}_${city}`;
                        return (
                          <button
                            key={layerId}
                            onClick={() => onToggleLayer(layerId)}
                            className={`group flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                              activeLayers.includes(layerId)
                                ? `border-${currentCat.color}-500 bg-${currentCat.color}-50/30 text-${currentCat.color}-700`
                                : 'border-transparent bg-slate-50 text-slate-500 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <MapPin size={12} className={activeLayers.includes(layerId) ? `text-${currentCat.color}-500` : 'text-slate-300'} />
                              <span className="text-[11px] font-bold text-left leading-tight">{city}</span>
                            </div>
                            <div className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              activeLayers.includes(layerId) 
                              ? `bg-${currentCat.color}-600 text-white` 
                              : 'bg-white border border-slate-200 text-slate-400'
                            }`}>
                              {stats[city] || 0}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}