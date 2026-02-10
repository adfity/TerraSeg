"use client";
import { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Plus, Eye, EyeOff, Calendar, FileText, Trash2, BarChart3 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function AnalysisPanel({ onClose, activeAnalysisId, setActiveAnalysisId }) {
  const router = useRouter();
  const [analysisList, setAnalysisList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

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
      setActiveAnalysisId(null);
      toast.success('Layer analisis dinonaktifkan');
    } else {
      setActiveAnalysisId(analysisId);
      toast.success('Layer analisis diaktifkan');
    }
  };

  const handleDelete = async (analysisId, analysisName) => {
    const confirmDelete = window.confirm(`Hapus analisis "${analysisName}"?`);
    if (!confirmDelete) return;

    setDeleting(analysisId);
    try {
      await axios.delete(`http://127.0.0.1:8000/api/analysis/${analysisId}/`);
      toast.success('Analisis berhasil dihapus');
      
      if (activeAnalysisId === analysisId) {
        setActiveAnalysisId(null);
      }
      
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
    <div 
      className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800"
      onWheel={(e) => e.stopPropagation()}
    >
      {/* HEADER */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-black text-lg uppercase tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <BarChart3 size={20}/>
              Analisis
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {analysisList.length} analisis tersimpan
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>
      </div>

      {/* LIST ANALISIS */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Memuat data...</p>
            </div>
          </div>
        ) : analysisList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <FileText size={60} className="text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-2">
              Belum ada analisis
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
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
                  className={`p-4 rounded-2xl border-2 transition-all ${
                    isActive 
                      ? 'border-cyan-500 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 shadow-lg shadow-cyan-500/20' 
                      : 'border-slate-200 dark:border-slate-700 hover:border-cyan-300 bg-white dark:bg-slate-800 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1">
                        {analysis.name}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <Calendar size={12} />
                        <span>{formatDate(analysis.timestamp)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleAnalysis(analysis.analysis_id)}
                        className={`p-2 rounded-lg transition-all ${
                          isActive 
                            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg hover:from-cyan-600 hover:to-blue-700' 
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                        title={isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      >
                        {isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      
                      <button
                        onClick={() => handleDelete(analysis.analysis_id, analysis.name)}
                        disabled={deleting === analysis.analysis_id}
                        className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all disabled:opacity-50"
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
                    <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-lg text-center border border-red-100 dark:border-red-900/30">
                      <div className="text-xs font-bold text-red-600 dark:text-red-400">RENDAH</div>
                      <div className="text-lg font-black text-red-700 dark:text-red-500">
                        {kategoriCount.RENDAH || 0}
                      </div>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-lg text-center border border-yellow-100 dark:border-yellow-900/30">
                      <div className="text-xs font-bold text-yellow-600 dark:text-yellow-400">SEDANG</div>
                      <div className="text-lg font-black text-yellow-700 dark:text-yellow-500">
                        {kategoriCount.SEDANG || 0}
                      </div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-lg text-center border border-green-100 dark:border-green-900/30">
                      <div className="text-xs font-bold text-green-600 dark:text-green-400">TINGGI</div>
                      <div className="text-lg font-black text-green-700 dark:text-green-500">
                        {kategoriCount.TINGGI || 0}
                      </div>
                    </div>
                  </div>

                  {/* Info Total */}
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400">Total Wilayah:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
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

      {/* FOOTER */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50">
        <button
          onClick={() => router.push('/analisis/pendidikan')}
          className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-2xl font-bold text-sm tracking-wide hover:from-cyan-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all uppercase active:scale-95 flex items-center justify-center gap-3"
        >
          <Plus size={20} />
          Buat Analisis Baru
        </button>
      </div>
    </div>
  );
}