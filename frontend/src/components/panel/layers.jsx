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
    type: 'boundary',
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
    label: 'Pendidikan',
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
    label: 'Kesehatan',
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

export function BoundaryLayer({ activeLayers, boundaryData, getBoundaryStyle, onEachBoundary }) {
  if (!boundaryData) return null;

  return (
    <>
      {activeLayers.includes('batas_provinsi') && boundaryData.provinsi && (
        <GeoJSON 
          key="batas-provinsi"
          data={boundaryData.provinsi}
          style={getBoundaryStyle('provinsi')}
          onEachFeature={(feature, layer) => onEachBoundary(feature, layer, 'provinsi')}
        />
      )}

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

export function useBoundaryData(activeLayers) {
  const [boundaryData, setBoundaryData] = useState({
    provinsi: null,
    kabupaten: null
  });

  const fetchBoundaryData = async (type) => {
    try {
      const endpoint = type === 'provinsi' ? '/api/batas-provinsi/' : '/api/batas-kabupaten/';
      const response = await axios.get(`http://127.0.0.1:8000${endpoint}`);
      
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
      </div>
    `);
    
    layer.on({
      mouseover: (e) => {
        const l = e.target;
        l.setStyle({
          weight: type === 'provinsi' ? 3 : 2,
          dashArray: "0",
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

export default function LayersPanel({ activeLayers, onToggleLayer, rbiData, onToggleProvinsi }) {
  const [activeTab, setActiveTab] = useState('batas_wilayah');
  const [expandedProv, setExpandedProv] = useState(["JAWA BARAT"]);

  const currentCat = CATEGORIES.find(c => c.id === activeTab);
  const isBoundaryTab = currentCat?.type === 'boundary';

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
    <div 
      className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800"
      onWheel={(e) => e.stopPropagation()}
    >
      {/* HEADER */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50">
        <h3 className="font-black text-lg uppercase tracking-tight text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
          <LayersIcon size={20}/>
          Layer Kontrol
        </h3>
        <div className="flex gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`p-2.5 rounded-xl transition-all ${
                activeTab === cat.id 
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg scale-105' 
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
              title={cat.label}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isBoundaryTab ? (
          /* BATAS WILAYAH */
          <div className="space-y-3">
            {currentCat.layers.map(layer => {
              const isActive = activeLayers.includes(layer.id);
              
              return (
                <button
                  key={layer.id}
                  onClick={() => onToggleLayer(layer.id)}
                  className={`w-full p-4 rounded-2xl border-2 transition-all flex items-start gap-3 text-left ${
                    isActive
                      ? 'border-cyan-500 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 shadow-lg'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${
                    isActive ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                  }`}>
                    {layer.icon}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-bold ${
                      isActive ? 'text-cyan-700 dark:text-cyan-400' : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      {layer.label}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {layer.description}
                    </p>
                  </div>
                  {isActive && (
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 shadow-lg animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          /* RBI (PENDIDIKAN & KESEHATAN) */
          <div className="space-y-3">
            {currentCat?.provinsi?.map((prov) => {
              const prefixedCities = prov.cities.map(city => `${activeTab}_${city}`);
              const isAllSelected = prefixedCities.every(city => activeLayers.includes(city));
              const totalProv = prov.cities.reduce((acc, city) => acc + (stats[city] || 0), 0);

              return (
                <div key={prov.nama} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    <div 
                      className="flex items-center gap-3 cursor-pointer flex-1"
                      onClick={() => setExpandedProv(prev => 
                        prev.includes(prov.nama) ? prev.filter(p => p !== prov.nama) : [...prev, prov.nama]
                      )}
                    >
                      <div className="p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400">
                        {expandedProv.includes(prov.nama) ? <ChevronDown size={14} strokeWidth={3}/> : <ChevronRight size={14} strokeWidth={3}/>}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{prov.nama}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{totalProv} objek</p>
                      </div>
                    </div>

                    <button 
                      onClick={() => onToggleProvinsi(prefixedCities, isAllSelected)}
                      className={`p-2 rounded-lg transition-all ${
                        isAllSelected 
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg' 
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      <CheckCircle2 size={16} />
                    </button>
                  </div>

                  {expandedProv.includes(prov.nama) && (
                    <div className="px-3 pb-3 pt-1 grid grid-cols-1 gap-2">
                      {prov.cities.map(city => {
                        const layerId = `${activeTab}_${city}`;
                        return (
                          <button
                            key={layerId}
                            onClick={() => onToggleLayer(layerId)}
                            className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                              activeLayers.includes(layerId)
                                ? 'border-cyan-500 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 text-cyan-700 dark:text-cyan-400'
                                : 'border-transparent bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <MapPin size={12} className={activeLayers.includes(layerId) ? 'text-cyan-500' : 'text-slate-300'} />
                              <span className="text-xs font-bold">{city}</span>
                            </div>
                            <div className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              activeLayers.includes(layerId) 
                              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg' 
                              : 'bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 text-slate-400'
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