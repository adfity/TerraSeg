"use client";
import { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Plus, Eye, EyeOff, Calendar, FileText, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function AnalysisPanel({ onClose, activeAnalysisId, setActiveAnalysisId }) {
  const router = useRouter();
  const [analysisList, setAnalysisList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  // Fetch daftar analisis dari database
  useEffect(() => {
    fetchAnalysisList();
  }, []);

  const fetchAnalysisList = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/analysis/list/');
      setAnalysisList(response.data.results || []);
    } catch (error) {
      console.error('Error fetching analysis list:', error);
      toast.error('Gagal memuat daftar analisis');
    } finally {
      setLoading(false);
    }
  };

  const toggleAnalysis = (analysisId) => {
    if (activeAnalysisId === analysisId) {
      // Jika sudah aktif, matikan
      setActiveAnalysisId(null);
      toast.success('Layer analisis dinonaktifkan');
    } else {
      // Aktifkan yang baru
      setActiveAnalysisId(analysisId);
      toast.success('Layer analisis diaktifkan');
    }
  };

  const handleDelete = async (analysisId, analysisName) => {
    // Konfirmasi delete
    const confirmDelete = window.confirm(`Hapus analisis "${analysisName}"?`);
    if (!confirmDelete) return;

    setDeleting(analysisId);
    try {
      await axios.delete(`http://127.0.0.1:8000/api/analysis/${analysisId}/`);
      toast.success('Analisis berhasil dihapus');
      
      // Jika yang dihapus sedang aktif, matikan
      if (activeAnalysisId === analysisId) {
        setActiveAnalysisId(null);
      }
      
      // Refresh list
      fetchAnalysisList();
    } catch (error) {
      console.error('Error deleting analysis:', error);
      toast.error('Gagal menghapus analisis');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* HEADER */}
      <div className="flex items-center justify-between p-6 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
            Analisis Tersimpan
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {analysisList.length} analisis ditemukan
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X size={20} className="text-slate-500" />
        </button>
      </div>

      {/* LIST ANALISIS */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-sm text-slate-500">Memuat data...</p>
            </div>
          </div>
        ) : analysisList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <FileText size={60} className="text-slate-300 mb-4" />
            <p className="text-sm font-bold text-slate-600 mb-2">
              Belum ada analisis tersimpan
            </p>
            <p className="text-xs text-slate-400">
              Buat analisis baru untuk memulai
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {analysisList.map((analysis) => {
              const isActive = activeAnalysisId === analysis.analysis_id;
              const kategoriCount = analysis.kategori_distribusi || {};
              
              return (
                <div
                  key={analysis.analysis_id}
                  className={`
                    p-4 rounded-2xl border-2 transition-all cursor-pointer
                    ${isActive 
                      ? 'border-blue-500 bg-blue-50 shadow-lg' 
                      : 'border-slate-200 hover:border-blue-300 bg-white'
                    }
                  `}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-black text-sm text-slate-900 mb-1">
                        {analysis.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Calendar size={12} />
                        <span>{formatDate(analysis.timestamp)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {/* Toggle Button */}
                      <button
                        onClick={() => toggleAnalysis(analysis.analysis_id)}
                        className={`
                          p-2 rounded-lg transition-all
                          ${isActive 
                            ? 'bg-blue-500 text-white hover:bg-blue-600' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }
                        `}
                        title={isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      >
                        {isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      
                      {/* Delete Button */}
                      <button
                        onClick={() => handleDelete(analysis.analysis_id, analysis.name)}
                        disabled={deleting === analysis.analysis_id}
                        className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all disabled:opacity-50"
                        title="Hapus"
                      >
                        {deleting === analysis.analysis_id ? (
                          <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-red-50 p-2 rounded-lg text-center">
                      <div className="text-xs font-bold text-red-600">RENDAH</div>
                      <div className="text-lg font-black text-red-700">
                        {kategoriCount.RENDAH || 0}
                      </div>
                    </div>
                    <div className="bg-yellow-50 p-2 rounded-lg text-center">
                      <div className="text-xs font-bold text-yellow-600">SEDANG</div>
                      <div className="text-lg font-black text-yellow-700">
                        {kategoriCount.SEDANG || 0}
                      </div>
                    </div>
                    <div className="bg-green-50 p-2 rounded-lg text-center">
                      <div className="text-xs font-bold text-green-600">TINGGI</div>
                      <div className="text-lg font-black text-green-700">
                        {kategoriCount.TINGGI || 0}
                      </div>
                    </div>
                  </div>

                  {/* Info Total */}
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600">Total Wilayah:</span>
                      <span className="font-bold text-slate-900">
                        {analysis.total_matched || 0}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FOOTER - Tombol Buat Analisis Baru */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <button
          onClick={() => router.push('/analysis/pendidikan')}
          className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-2xl font-black text-sm tracking-wider hover:shadow-xl hover:shadow-blue-500/30 transition-all uppercase active:scale-95 flex items-center justify-center gap-3"
        >
          <Plus size={20} />
          Buat Analisis Baru
        </button>
      </div>
    </div>
  );
}