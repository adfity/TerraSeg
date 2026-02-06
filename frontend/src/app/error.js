'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Error({ error, reset }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-orange-50 via-white to-yellow-50 px-4">
      <div className="text-center max-w-2xl">
        {/* GIF Error */}
        <div className="mb-8">
          <Image
            src="/yuuuu.gif"
            alt="Error"
            width={350}
            height={350}
            unoptimized
            className="mx-auto rounded-2xl shadow-2xl"
          />
        </div>
        
        {/* Error Message */}
        <h1 className="mb-4 text-5xl font-bold text-red-600">Oops, Ada Masalah!</h1>
        <p className="mb-4 text-xl text-gray-700">
          PRIA OSLO SEDANG BERPIKIR... 🤔
        </p>
        
        {/* Error Detail */}
        <div className="mb-8 rounded-lg bg-red-50 border border-red-200 px-6 py-4 text-left">
          <p className="font-semibold text-red-700 mb-2">Detail Error:</p>
          <p className="font-mono text-sm text-red-600">
            {error?.message || 'Terjadi kesalahan yang tidak diketahui'}
          </p>
        </div>
        
        {/* Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="rounded-lg bg-red-600 px-8 py-3 text-white font-semibold transition hover:bg-red-700"
          >
            🔄 Coba Lagi
          </button>
          
          <Link 
            href="/"
            className="rounded-lg border-2 border-gray-700 px-8 py-3 text-gray-700 font-semibold transition hover:bg-gray-700 hover:text-white"
          >
            🏠 Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}