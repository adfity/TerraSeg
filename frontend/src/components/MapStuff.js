"use client";
import { useEffect } from 'react';
import axios from 'axios';
import L from 'leaflet';
import { 
  GeoJSON, Polygon, Popup, useMap, useMapEvents
} from 'react-leaflet';
import { 
  BarChart3, Home, Map as MapIcon, Layers, LocateFixed, Plus, Minus 
} from 'lucide-react';
import { useBoundaryData, BoundaryLayer } from './panel/layers';
import { toast } from 'react-hot-toast'; // TAMBAHKAN DI SINI

// ZOOM BUTTONS
export function ZoomButtons() {
  const map = useMap();
  return (
    <div className="fixed bottom-6 right-6 z-[1100]">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col">
        <button onClick={() => map.zoomIn()} className="w-12 h-12 flex items-center justify-center hover:bg-slate-100">
          <Plus size={24} />
        </button>
        <div className="h-[2px] bg-slate-300" />
        <button onClick={() => map.zoomOut()} className="w-12 h-12 flex items-center justify-center hover:bg-slate-100">
          <Minus size={24} />
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

// SIDEBAR BUTTONS
export function SidebarButtons({ activePanel, setActivePanel, setGoHome }) {
  const buttons = [
    { id: 'home', icon: <Home size={20} />, label: 'Default View' },
    { id: 'basemap', icon: <MapIcon size={20} />, label: 'Basemap' },
    { id: 'layers', icon: <Layers size={20} />, label: 'Layers' },
    { id: 'radius', icon: <div className="w-6 h-6"><img src="/icons/bradius570-536.png" className="w-full h-full" /></div>, label: 'Radius' },
    { id: 'geoai', icon: <div className="w-6 h-6"><img src="/icons/geo2.png" className="w-full h-full" /></div>, label: 'GeoAI' },
    { id: 'analysis', icon: <BarChart3 size={20} />, label: 'Analisis' },
    { id: 'share', icon: <LocateFixed size={20} />, label: 'Lokasi Saya' },
  ];

  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-[1100]">
      <div className="flex flex-col space-y-3 bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-xl">
        {buttons.map(btn => (
          <button key={btn.id} onClick={() => {
            if (btn.id === 'home') {
              setGoHome(true);
              setActivePanel(null);
              toast.success('Kembali ke tampilan default'); // OPSIONAL: tambahkan feedback
            } else {
              setActivePanel(activePanel === btn.id ? null : btn.id);
            }
          }} className={`
            group relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300
            ${activePanel === btn.id ? 'bg-cyan-500 text-white scale-110' : 'bg-white text-slate-700 hover:bg-slate-100'}
          `}>
            <div className="transition-transform duration-300 group-hover:scale-110">
              {activePanel === btn.id ? <span className="text-xl font-bold">≫</span> : btn.icon}
            </div>
            <span className="absolute right-16 top-1/2 -translate-y-1/2 whitespace-nowrap bg-slate-800 text-white text-[11px] px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {btn.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// PREVIEW LAYER
export function PreviewLayer({ previewData, setPreviewData, getCategoryColor }) {
  const map = useMap();
  
  const removeObject = (idx) => {
    const newData = [...previewData];
    newData.splice(idx, 1);
    setPreviewData(newData);
    toast.success('Preview dihapus'); // TAMBAHKAN FEEDBACK
  };

  if (!previewData || previewData.length === 0) return null;

  return (
    <>
      {previewData.map((obj, idx) => {
        if (!obj.segmentation) return null;
        
        const scanCenterPixel = map.latLngToContainerPoint([obj.lat, obj.lng]);
        const polygonCoords = obj.segmentation.map(point => {
          const latLng = map.containerPointToLatLng([
            scanCenterPixel.x + (point[0] - 320),
            scanCenterPixel.y + (point[1] - 320)
          ]);
          return [latLng.lat, latLng.lng];
        });

        return (
          <Polygon key={`preview-${idx}`} positions={polygonCoords}
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
                <button onClick={() => removeObject(idx)} className="mt-2 w-full bg-red-500 text-white text-[10px] py-1 rounded">
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

// SAVED DATA LAYER
export function SavedDataLayer({ data, onRefreshData, getCategoryColor }) {
  const handleDelete = async (feature_id) => {
    // Tampilkan toast konfirmasi
    toast.custom((t) => (
      <div className="bg-white rounded-xl shadow-xl p-4 min-w-[300px]">
        <p className="font-semibold text-slate-800 mb-3">Hapus data ini?</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => {
              toast.dismiss(t.id);
            }}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
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
              <button 
                onClick={() => handleDelete(item.feature_id)} 
                className="text-red-500 text-[10px] font-bold hover:text-red-700"
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
  const map = useMap();
  
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

// MAIN COMPONENT
export default function MapStuff(props) {
  const { boundaryData, getBoundaryStyle, onEachBoundary } = useBoundaryData(props.activeLayers);
  
  return (
    <>
      {/* Boundary Layer */}
      <BoundaryLayer 
        activeLayers={props.activeLayers}
        boundaryData={boundaryData}
        getBoundaryStyle={getBoundaryStyle}
        onEachBoundary={onEachBoundary}
      />
      
      {/* RBI Layer */}
      <RBILayer 
        activeLayers={props.activeLayers}
        rbiData={props.rbiData}
        getCategoryColor={props.getCategoryColor}
      />
      
      {/* Preview Layer */}
      <PreviewLayer 
        previewData={props.previewData}
        setPreviewData={props.setPreviewData}
        getCategoryColor={props.getCategoryColor}
      />
      
      {/* Saved Data Layer */}
      <SavedDataLayer 
        data={props.data}
        onRefreshData={props.onRefreshData}
        getCategoryColor={props.getCategoryColor}
      />
      
      {/* Controls */}
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