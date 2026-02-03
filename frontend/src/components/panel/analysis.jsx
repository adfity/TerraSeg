"use client";
import { useState, useRef } from 'react';
import axios from 'axios';
import { 
  Upload, BarChart3, X, Download, 
  AlertTriangle, School, FileText,
  MapPin, CheckCircle, Info,
  Filter
} from 'lucide-react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';

export default function AnalysisPanel() {
  const [csvFile, setCsvFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const fileInputRef = useRef(null);
  const map = useMap();

  // 3 Kategori dengan warna
  const CATEGORIES = {
    RENDAH: { 
      color: "#d73027", 
      label: "RENDAH (Perlu Intervensi)",
      icon: "🔴"
    },
    SEDANG: { 
      color: "#fee08b", 
      label: "SEDANG (Butuh Penguatan)",
      icon: "🟡"
    },
    TINGGI: { 
      color: "#1a9850", 
      label: "TINGGI (Pertahankan)",
      icon: "🟢"
    }
  };

  const resetAll = () => {
    // Hapus semua layer dari peta
    map.eachLayer((layer) => {
      if (layer instanceof L.GeoJSON) {
        map.removeLayer(layer);
      }
    });
    
    setAnalysisResults(null);
    setCsvFile(null);
    setSelectedCategory('all');
    setIsAnalyzing(false); // TAMBAHKAN INI
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.success('Analisis direset');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith('.csv')) {
      setCsvFile(file);
      toast.success(`File "${file.name}" siap dianalisis`);
    }
  };

  const runAnalysis = async () => {
    if (!csvFile) {
      toast.error('Pilih file CSV terlebih dahulu');
      return;
    }

    setIsAnalyzing(true);
    // PERUBAHAN DI SINI: Simpan toast ID untuk bisa di-dismiss nanti
    const loadingToast = toast.loading('Menganalisis data pendidikan...');
    
    const formData = new FormData();
    formData.append('csv_file', csvFile);

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/analyze-aps/', formData);
      
      // Hapus toast loading sebelum menampilkan hasil
      toast.dismiss(loadingToast);
      
      if (response.data.status === 'success') {
        setAnalysisResults(response.data);
        renderMap(response.data.matched_features.features);
        
        toast.success(
          `✅ ${response.data.total_matched} provinsi berhasil dianalisis`
        );
      } else {
        toast.error(response.data.error || 'Gagal analisis');
      }
      
    } catch (error) {
      console.error('Analysis error:', error);
      // Hapus toast loading jika error
      toast.dismiss(loadingToast);
      toast.error(error.response?.data?.error || 'Terjadi kesalahan');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderMap = (features) => {
    // Hapus layer sebelumnya
    map.eachLayer((layer) => {
      if (layer instanceof L.GeoJSON) {
        map.removeLayer(layer);
      }
    });

    // Filter berdasarkan kategori yang dipilih
    const filteredFeatures = selectedCategory === 'all' 
      ? features 
      : features.filter(f => f.properties?.analysis?.kategori === selectedCategory);

    const geoJsonLayer = L.geoJSON(filteredFeatures, {
      style: (feature) => {
        const analysis = feature.properties?.analysis || {};
        const warna = analysis.warna || CATEGORIES.SEDANG.color;
        
        return {
          fillColor: warna,
          color: '#ffffff',
          weight: 2,
          fillOpacity: 0.6,
          opacity: 0.8
        };
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties;
        const analysis = props.analysis || {};
        
        // Popup content yang sederhana dan informatif
        const popupContent = `
          <div style="font-family: sans-serif; min-width: 250px; max-width: 300px;">
            <!-- Header -->
            <div style="background: ${analysis.warna || '#ccc'}; color: white; padding: 10px; border-radius: 6px 6px 0 0;">
              <div style="font-weight: bold; font-size: 16px;">${analysis.nama_provinsi || 'Unknown'}</div>
              <div style="font-size: 12px; margin-top: 4px;">Kategori: ${analysis.kategori || 'N/A'}</div>
            </div>
            
            <!-- Metrics -->
            <div style="padding: 12px; background: #f8fafc;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
                <div style="text-align: center;">
                  <div style="font-weight: 600; color: #475569;">Rata² APS</div>
                  <div style="font-size: 18px; font-weight: bold; color: ${analysis.warna || '#475569'};">${analysis.rata_aps?.toFixed(1) || '0.0'}%</div>
                </div>
                <div style="text-align: center;">
                  <div style="font-weight: 600; color: #475569;">WERI</div>
                  <div style="font-size: 18px; font-weight: bold; color: ${analysis.weri > 30 ? '#ef4444' : analysis.weri > 20 ? '#f59e0b' : '#10b981'};">${analysis.weri?.toFixed(1) || '0.0'}</div>
                </div>
              </div>
            </div>
            
            <!-- Insights -->
            <div style="padding: 12px; border-top: 1px solid #e5e7eb;">
              <div style="font-weight: 600; color: #475569; margin-bottom: 8px; font-size: 13px;">
                Insight:
              </div>
              <div style="font-size: 12px; color: #4b5563; max-height: 120px; overflow-y: auto;">
                ${analysis.insights ? 
                  analysis.insights.slice(0, 3).map(insight => 
                    `<div style="margin-bottom: 6px; padding-left: 8px; border-left: 2px solid ${analysis.warna || '#ccc'};">
                      ${insight}
                    </div>`
                  ).join('') : 
                  'Tidak ada insight tersedia'
                }
              </div>
            </div>
            
            <!-- APS Data -->
            <div style="padding: 12px; background: #f1f5f9; border-top: 1px solid #e5e7eb; font-size: 11px;">
              <div style="font-weight: 600; color: #475569; margin-bottom: 6px;">Data APS:</div>
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; text-align: center;">
                ${analysis.aps_data?.APS_7_12 !== undefined ? 
                  `<div>
                    <div style="font-weight: 500; color: #0369a1;">SD</div>
                    <div>${analysis.aps_data.APS_7_12.toFixed(1)}%</div>
                  </div>` : ''
                }
                ${analysis.aps_data?.APS_13_15 !== undefined ? 
                  `<div>
                    <div style="font-weight: 500; color: #a16207;">SMP</div>
                    <div>${analysis.aps_data.APS_13_15.toFixed(1)}%</div>
                  </div>` : ''
                }
                ${analysis.aps_data?.APS_16_18 !== undefined ? 
                  `<div>
                    <div style="font-weight: 500; color: #15803d;">SMA</div>
                    <div>${analysis.aps_data.APS_16_18.toFixed(1)}%</div>
                  </div>` : ''
                }
                ${analysis.aps_data?.APS_19_23 !== undefined ? 
                  `<div>
                    <div style="font-weight: 500; color: #7c3aed;">PT</div>
                    <div>${analysis.aps_data.APS_19_23.toFixed(1)}%</div>
                  </div>` : ''
                }
              </div>
            </div>
          </div>
        `;
        
        layer.bindPopup(popupContent);
      }
    }).addTo(map);

    // Fit bounds
    if (geoJsonLayer.getBounds().isValid()) {
      map.fitBounds(geoJsonLayer.getBounds().pad(0.1));
    }
  };

  const filterByCategory = (category) => {
    setSelectedCategory(category);
    if (analysisResults?.matched_features?.features) {
      renderMap(analysisResults.matched_features.features);
    }
    toast.success(`Menampilkan: ${category === 'all' ? 'Semua' : category}`, {
      duration: 1500 // Toast hanya muncul 1.5 detik
    });
  };

  const downloadTemplate = () => {
    window.open('http://127.0.0.1:8000/api/template/aps/', '_blank');
    toast.success('Membuka template CSV');
  };

  const downloadReport = () => {
    if (!analysisResults) return;
    
    const report = {
      title: 'Laporan Analisis Pendidikan',
      date: new Date().toISOString(),
      summary: {
        total_provinces: analysisResults.total_data,
        matched_provinces: analysisResults.total_matched,
        categories: analysisResults.kategori_distribusi
      },
      top_risky: analysisResults.top_risky || [],
      recommendations: analysisResults.national_recommendations || []
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `laporan-pendidikan-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Laporan diunduh');
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <School className="text-blue-600" size={24} />
            <div>
              <h3 className="text-lg font-bold text-gray-900">Analisis Pendidikan</h3>
              <p className="text-sm text-gray-600">Sistem 3 Kategori Sederhana</p>
            </div>
          </div>
          {analysisResults && (
            <button
              onClick={resetAll}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {!analysisResults ? (
          /* UPLOAD VIEW */
          <div className="space-y-4">
            {/* Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <Upload className="mx-auto text-gray-400 mb-3" size={36} />
              <p className="text-sm text-gray-700 mb-2">Upload file CSV data APS</p>
              <p className="text-xs text-gray-500 mb-4">Format: Provinsi, APS SD, APS SMP, APS SMA, APS PT</p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              
              {csvFile && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-green-600" />
                      <span className="text-sm font-medium">{csvFile.name}</span>
                    </div>
                    <button
                      onClick={() => {
                        setCsvFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Info Panel */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Info size={16} className="text-blue-600" />
                <p className="font-medium text-blue-800">Metode Analisis</p>
              </div>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 3 Kategori: RENDAH, SEDANG, TINGGI</li>
                <li>• Hitung WERI (Weighted Education Risk Index)</li>
                <li>• Insight otomatis per provinsi</li>
                <li>• Rekomendasi kebijakan spesifik</li>
              </ul>
            </div>

            {/* Action Button */}
            <button
              onClick={runAnalysis}
              disabled={!csvFile || isAnalyzing}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Menganalisis...
                </>
              ) : (
                <>
                  <BarChart3 size={18} />
                  Mulai Analisis
                </>
              )}
            </button>

            {/* Template Download */}
            <button
              onClick={downloadTemplate}
              className="w-full text-blue-600 hover:text-blue-800 text-sm flex items-center justify-center gap-2 py-2"
            >
              <FileText size={14} />
              Download Template CSV
            </button>
          </div>
        ) : (
          /* RESULTS VIEW */
          <div className="space-y-4">
            {/* Summary Card */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle size={20} className="text-green-300" />
                  <span className="font-medium">Analisis Selesai</span>
                </div>
                <span className="text-sm bg-white/20 px-2 py-1 rounded">
                  {analysisResults.match_rate}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-2xl font-bold">{analysisResults.total_matched}</div>
                  <div className="text-xs opacity-90">Provinsi</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {analysisResults.kategori_distribusi?.RENDAH || 0}
                  </div>
                  <div className="text-xs opacity-90">RENDAH</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {analysisResults.kategori_distribusi?.TINGGI || 0}
                  </div>
                  <div className="text-xs opacity-90">TINGGI</div>
                </div>
              </div>
            </div>

            {/* Category Filter */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter size={16} className="text-gray-600" />
                <span className="font-medium text-gray-800">Filter Kategori</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => filterByCategory('all')}
                  className={`py-2 rounded text-sm font-medium ${selectedCategory === 'all' 
                    ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Semua
                </button>
                {Object.entries(CATEGORIES).map(([key, cat]) => (
                  <button
                    key={key}
                    onClick={() => filterByCategory(key)}
                    className={`py-2 rounded text-sm font-medium flex items-center justify-center gap-1 ${selectedCategory === key 
                      ? 'border-2' 
                      : 'border hover:bg-gray-50'}`}
                    style={{
                      backgroundColor: selectedCategory === key ? `${cat.color}20` : 'white',
                      borderColor: selectedCategory === key ? cat.color : '#e5e7eb'
                    }}
                  >
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: cat.color }}
                    ></div>
                    <span>{key}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Category Distribution */}
            <div className="border rounded-lg p-4">
              <p className="font-medium text-gray-800 mb-3">Distribusi Kategori</p>
              <div className="space-y-3">
                {analysisResults.kategori_distribusi && Object.entries(analysisResults.kategori_distribusi).map(([kategori, count]) => (
                  <div key={kategori} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span style={{ color: CATEGORIES[kategori]?.color || '#999' }}>
                        {CATEGORIES[kategori]?.icon || '⚫'}
                      </span>
                      <span className="text-sm">{kategori}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full"
                          style={{
                            width: `${(count / analysisResults.total_matched) * 100}%`,
                            backgroundColor: CATEGORIES[kategori]?.color || '#999'
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Risky Provinces */}
            {analysisResults.top_risky && analysisResults.top_risky.length > 0 && (
              <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={16} className="text-red-600" />
                  <span className="font-medium text-red-800">Provinsi Berisiko Tinggi</span>
                </div>
                <div className="space-y-2">
                  {analysisResults.top_risky.slice(0, 3).map((prov, idx) => (
                    <div key={idx} className="bg-white p-2 rounded border">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{prov.provinsi}</span>
                        <div className="text-right">
                          <div className="text-sm font-bold text-red-600">WERI: {prov.weri?.toFixed(1)}</div>
                          <div className="text-xs text-gray-500">{prov.kategori}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* National Recommendations */}
            {analysisResults.national_recommendations && analysisResults.national_recommendations.length > 0 && (
              <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 size={16} className="text-blue-600" />
                  <span className="font-medium text-blue-800">Rekomendasi Nasional</span>
                </div>
                <div className="space-y-2">
                  {analysisResults.national_recommendations.slice(0, 2).map((rec, idx) => (
                    <div key={idx} className="bg-white p-3 rounded border">
                      <div className="flex items-start gap-2">
                        <div 
                          className="w-1 h-full rounded"
                          style={{ 
                            backgroundColor: rec.priority === 'Tinggi' ? '#ef4444' : 
                                           rec.priority === 'Sedang' ? '#f59e0b' : '#10b981'
                          }}
                        ></div>
                        <div>
                          <p className="font-medium text-sm">{rec.title}</p>
                          <p className="text-xs text-gray-600 mt-1">{rec.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={downloadReport}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
              >
                <Download size={16} />
                Download Laporan
              </button>
              
              <button
                onClick={resetAll}
                className="w-full border border-gray-300 hover:bg-gray-50 py-3 rounded-lg text-gray-700"
              >
                Analisis Baru
              </button>
            </div>

            {/* Legend */}
            <div className="border rounded-lg p-4">
              <p className="font-medium text-gray-800 mb-3">Legenda</p>
              <div className="space-y-2">
                {Object.entries(CATEGORIES).map(([key, cat]) => (
                  <div key={key} className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded" 
                      style={{ backgroundColor: cat.color }}
                    ></div>
                    <div>
                      <p className="text-sm font-medium">{key}</p>
                      <p className="text-xs text-gray-500">{cat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t p-3 text-center">
        <div className="text-xs text-gray-500">
          {analysisResults 
            ? `🎯 ${analysisResults.total_matched} provinsi dianalisis`
            : '📊 Analisis Pendidikan 3 Kategori'
          }
        </div>
      </div>
    </div>
  );
}