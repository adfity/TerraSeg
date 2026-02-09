"use client";

import Link from "next/link";
import { BarChart3, School, Wallet, HeartPulse } from "lucide-react";

export default function AnalysisPanel() {
  return (
    <div className="bg-white rounded-xl p-6 max-w-md space-y-5">
      
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 bg-blue-600 text-white rounded-lg flex items-center justify-center">
          <BarChart3 size={22} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            Sistem Analisis Kebijakan
          </h3>
          
        </div>
      </div>

      {/* DESKRIPSI */}
      <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
        <div className="flex items-start gap-2">
          <Wallet className="text-blue-600 mt-1" size={16} />
          <p>
            <span className="font-semibold">Analisis Ekonomi</span> untuk melihat
            kondisi dan ketimpangan ekonomi wilayah.
          </p>
        </div>

        <div className="flex items-start gap-2">
          <School className="text-blue-600 mt-1" size={16} />
          <p>
            <span className="font-semibold">Analisis Pendidikan</span> untuk
            mengukur partisipasi sekolah dan risiko pendidikan.
          </p>
        </div>

        <div className="flex items-start gap-2">
          <HeartPulse className="text-blue-600 mt-1" size={16} />
          <p>
            <span className="font-semibold">Analisis Kesehatan</span> untuk
            mendukung kebijakan kesehatan masyarakat berbasis data.
          </p>
        </div>
      </div>

      {/* TOMBOL UTAMA */}
      <Link
      href="/analysis"
      className="w-full bg-blue-600 hover:bg-blue-700 
                !text-white py-4 rounded-2xl text-sm font-bold 
                shadow-lg flex items-center justify-center gap-2 transition-all"
    >
      MULAI ANALISIS
    </Link>


    </div>
  );
}
