"use client";
import { useEffect, useState } from 'react';
import axios from 'axios';
import L from 'leaflet';
import { 
  GeoJSON, Polygon, Popup, useMap
} from 'react-leaflet';
import { 
  Home, Map as MapIcon, Layers, LocateFixed, Plus, Minus 
} from 'lucide-react';
import { useBoundaryData, BoundaryLayer } from './panel/layers';
import { toast } from 'react-hot-toast';

// ZOOM BUTTONS - KANAN BAWAH
export function ZoomButtons() {
  const map = useMap();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-[1100]">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700">
        <button 
          onClick={() => map.zoomIn()} 
          className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors`}
        >
          <Plus size={isMobile ? 20 : 24} />
        </button>
        <div className="h-[2px] bg-slate-200 dark:bg-slate-700" />
        <button 
          onClick={() => map.zoomOut()} 
          className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors`}
        >
          <Minus size={isMobile ? 20 : 24} />
        </button>
      </div>
    </div>
  );
}

// MAP RESET
export function MapReset({ trigger, onDone }) {
  const map = useMap();
  useEffect(() => {
    if (!trigger) return;
    map.flyTo([-2.5, 118], 5, { animate: true, duration: 1 });
    onDone();
  }, [trigger]);
  return null;
}

// SIDEBAR BUTTONS - Dynamic icons untuk light/dark mode
export function SidebarButtons({ activePanel, setActivePanel, setGoHome }) {
  const [isMobile, setIsMobile] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme');
      setIsDark(theme === 'dark');
    };
    
    checkMobile();
    checkTheme();
    
    window.addEventListener('resize', checkMobile);
    
    // Observer untuk theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      observer.disconnect();
    };
  }, []);

  const buttons = [
    { id: 'home', icon: <Home size={18} />, label: 'Home' },
    { id: 'basemap', icon: <MapIcon size={18} />, label: 'Basemap' },
    { id: 'layers', icon: <Layers size={18} />, label: 'Layers' },
    { 
      id: 'radius', 
      icon: <div className="w-6 h-6">
        <img src={isDark ? "/icons/Wradius.png" : "/icons/bradius.png"} className="w-full h-full" alt="Radius" />
      </div>, 
      label: 'Radius' 
    },
    { 
      id: 'geoai', 
      icon: <div className="w-6 h-6">
        <img src={isDark ? "/icons/wgeo.png" : "/icons/bgeo.png"} className="w-full h-full" alt="GeoAI" />
      </div>, 
      label: 'GeoAI' 
    },
    { 
      id: 'analysis', 
      icon: <div className="w-6 h-6">
        <img src={isDark ? "/icons/wanalis.png" : "/icons/banalis.png"} className="w-full h-full" alt="Analisis" />
      </div>, 
      label: 'Analisis' 
    },
    { id: 'share', icon: <LocateFixed size={18} />, label: 'Lokasi' },
  ];

  const handleButtonClick = (btnId) => {
    if (btnId === 'home') {
      setGoHome(true);
      setActivePanel(null);
      toast.success('Kembali ke tampilan default');
    } else {
      setActivePanel(activePanel === btnId ? null : btnId);
    }
  };

  if (isMobile) {
    // MOBILE: Footer tengah horizontal
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1100]">
        <div className="flex flex-row items-center gap-2 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md px-3 py-2 rounded-full border border-slate-200 dark:border-slate-700 shadow-2xl">
          {buttons.map(btn => (
            <button 
              key={btn.id} 
              onClick={() => handleButtonClick(btn.id)} 
              className={`
                w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300
                ${activePanel === btn.id 
                  ? 'bg-cyan-500 text-white scale-110 shadow-lg' 
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                }
              `}
            >
              {activePanel === btn.id ? <span className="text-base font-bold">≫</span> : btn.icon}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // DESKTOP: Sidebar kanan vertikal
  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-[1100]">
      <div className="flex flex-col space-y-2 bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-xl">
        {buttons.map(btn => (
          <button 
            key={btn.id} 
            onClick={() => handleButtonClick(btn.id)} 
            className={`
              group relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300
              ${activePanel === btn.id 
                ? 'bg-cyan-500 text-white scale-110' 
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
              }
            `}
          >
            <div className="transition-transform duration-300 group-hover:scale-110">
              {activePanel === btn.id ? <span className="text-xl font-bold">≫</span> : btn.icon}
            </div>
            <span className="absolute right-16 top-1/2 -translate-y-1/2 whitespace-nowrap bg-slate-800 dark:bg-slate-700 text-white text-[11px] px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              {btn.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// PREVIEW LAYER - Popup dengan LUAS
export function PreviewLayer({ previewData, setPreviewData, getCategoryColor }) {
  const map = useMap();
  
  const removeObject = (idx) => {
    const newData = [...previewData];
    newData.splice(idx, 1);
    setPreviewData(newData);
    
    // Force close all popups
    map.closePopup();
    
    toast.success('Preview dihapus');
  };

  if (!previewData || previewData.length === 0) return null;

  return (
    <>
      {previewData.map((obj, idx) => {
        if (!obj.segmentation) return null;
        
        const scanCenterPixel = map.latLngToContainerPoint([obj.lat, obj.lng]);
        const halfSize = (obj.capture_size || 640) / 2;
        
        const polygonCoords = obj.segmentation.map(point => {
          const latLng = map.containerPointToLatLng([
            scanCenterPixel.x + (point[0] - halfSize),
            scanCenterPixel.y + (point[1] - halfSize)
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
                {obj.luas_m2 && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Luas: <span className="font-bold text-blue-600">{obj.luas_m2} m²</span>
                  </p>
                )}
                <button 
                  onClick={() => removeObject(idx)} 
                  className="mt-2 w-full bg-red-500 hover:bg-red-600 text-white text-[10px] py-1 rounded transition"
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

// SAVED DATA LAYER - Popup dengan LUAS
export function SavedDataLayer({ data, onRefreshData, getCategoryColor }) {
  const handleDelete = async (feature_id) => {
    toast.custom((t) => (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-4 min-w-[300px]">
        <p className="font-semibold text-slate-800 dark:text-slate-200 mb-3">Hapus data ini?</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => {
              toast.dismiss(t.id);
            }}
            className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
          >
            Batal
          </button>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              await performDelete(feature_id);
            }}
            className="px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded-lg"
          >
            Hapus
          </button>
        </div>
      </div>
    ));
  };

  const performDelete = async (feature_id) => {
    const deleteToast = toast.loading('Menghapus data...');
  
    try {
      await axios.delete(`http://127.0.0.1:8000/api/features/${feature_id}/`);
      toast.success('Data berhasil dihapus', { id: deleteToast });
      onRefreshData();
    } catch (err) {
      toast.error('Gagal menghapus data', { id: deleteToast });
    }
  };

  if (!data || !Array.isArray(data)) return null;

  return (
    <>
      {data.map((item, idx) => (
        <GeoJSON key={item.feature_id || idx} data={item.location}
          style={() => ({
            color: getCategoryColor(item.kategori),
            fillColor: getCategoryColor(item.kategori),
            fillOpacity: 0.4,
            weight: 2
          })}
        >
          <Popup>
            <div className="p-1 text-center">
              <p className="font-bold text-sm uppercase text-blue-700">{item.kategori}</p>
              {item.metadata?.luas_estimasi && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Luas: <span className="font-bold text-green-600">{item.metadata.luas_estimasi} m²</span>
                </p>
              )}
              <button 
                onClick={() => handleDelete(item.feature_id)} 
                className="mt-2 text-red-500 text-[10px] font-bold hover:text-red-700"
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

// RBI LAYER
export function RBILayer({ activeLayers, rbiData, getCategoryColor }) {
  return (
    <>
      {Object.keys(rbiData).map(layerKey => {
        if (!activeLayers.includes(layerKey)) return null;
        const parts = layerKey.split('_');
        const kategori = parts[0];
        const wilayah = parts.slice(1).join('_');
        
        return (
          <GeoJSON key={`rbi-${layerKey}`} data={rbiData[layerKey]}
            pointToLayer={(f, latlng) => L.circleMarker(latlng, {
              radius: kategori === 'pendidikan' ? 4 : 5,
              fillColor: getCategoryColor(kategori),
              color: "#ffffff",
              weight: kategori === 'kesehatan' ? 2 : 1,
              fillOpacity: 0.9
            })}
            onEachFeature={(feature, layer) => {
              const props = feature.properties || {};
              layer.bindPopup(`
                <div style="font-size:12px; min-width:180px">
                  <b style="color:${getCategoryColor(kategori)}">${props.NAMOBJ || 'Tanpa Nama'}</b><br/>
                  <span>${props.REMARK || (kategori === 'pendidikan' ? 'Sekolah' : 'Kesehatan')}</span><br/>
                  <small>Wilayah: ${wilayah}</small>
                </div>
              `);
            }}
          />
        );
      })}
    </>
  );
}

// ANALYSIS LAYER
export function AnalysisLayer({ activeAnalysisData }) {
  if (!activeAnalysisData?.matched_features?.features) return null;

  return (
    <GeoJSON
      key={activeAnalysisData.analysis_id}
      data={activeAnalysisData.matched_features}
      style={(feature) => {
        const analysis = feature.properties?.analysis || {};
        return {
          fillColor: analysis.warna || '#cbd5e1',
          weight: 2,
          opacity: 1,
          color: 'white',
          fillOpacity: 0.7
        };
      }}
      onEachFeature={(feature, layer) => {
        const analysis = feature.properties?.analysis || {};
        const dataAps = analysis.aps_data || {};
        
        layer.bindTooltip(`
          <div style="font-family: inherit; padding: 6px;">
            <div style="font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.1em;">
              ${analysis.nama_provinsi}
            </div>
            <div style="font-size: 10px; font-weight: 800; color: ${analysis.warna}; margin-top:2px;">
              STATUS: ${analysis.kategori}
            </div>
          </div>
        `, { sticky: true, opacity: 0.95 });

        const wawasan = analysis.insights?.map(i => 
          `<div style="margin-bottom:6px; padding-left:10px; border-left:3px solid ${analysis.warna}; font-weight: 600;">${i}</div>`
        ).join('') || '';

        layer.bindPopup(`
          <div style="font-family: inherit; min-width: 280px; color: #1e293b; padding: 5px;">
            <div style="background: ${analysis.warna}; color: white; padding: 15px; border-radius: 12px 12px 4px 4px; margin-bottom: 10px;">
              <div style="font-weight: 900; font-size: 16px; text-transform: uppercase; letter-spacing: 0.1em;">
                ${analysis.nama_provinsi}
              </div>
              <div style="font-size: 10px; font-weight: 800; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px;">
                Analisis Strategis Wilayah
              </div>
            </div>
            <div style="padding: 10px;">
              <div style="font-size: 10px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; border-bottom: 2px solid #f1f5f9; padding-bottom: 4px;">
                Wawasan Utama
              </div>
              <div style="font-size: 12px; color: #334155; line-height: 1.5; margin-bottom: 15px;">
                ${wawasan}
              </div>
              <div style="font-size: 10px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; border-bottom: 2px solid #f1f5f9; padding-bottom: 4px;">
                Matriks Partisipasi
              </div>
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
        `);
      }}
    />
  );
}

// MAIN COMPONENT
export default function MapStuff(props) {
  const { boundaryData, getBoundaryStyle, onEachBoundary } = useBoundaryData(props.activeLayers);
  
  return (
    <>
      <BoundaryLayer 
        activeLayers={props.activeLayers}
        boundaryData={boundaryData}
        getBoundaryStyle={getBoundaryStyle}
        onEachBoundary={onEachBoundary}
      />
      
      <AnalysisLayer activeAnalysisData={props.activeAnalysisData} />
      
      <RBILayer 
        activeLayers={props.activeLayers}
        rbiData={props.rbiData}
        getCategoryColor={props.getCategoryColor}
      />
      
      <PreviewLayer 
        previewData={props.previewData}
        setPreviewData={props.setPreviewData}
        getCategoryColor={props.getCategoryColor}
      />
      
      <SavedDataLayer 
        data={props.data}
        onRefreshData={props.onRefreshData}
        getCategoryColor={props.getCategoryColor}
      />
      
      <ZoomButtons />
      <MapReset trigger={props.goHome} onDone={() => props.setGoHome(false)} />
      <SidebarButtons 
        activePanel={props.activePanel}
        setActivePanel={props.setActivePanel}
        setGoHome={props.setGoHome}
      />
    </>
  );
}