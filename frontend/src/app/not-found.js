'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-orange-50 via-white to-yellow-50 px-4">
      <div className="text-center">
        {/* Cat GIF */}
        <div className="mb-6">
          <Image
            src="/wuuu.gif"
            alt="404"
            width={250}
            height={250}
            unoptimized
            className="mx-auto rounded-full shadow-2xl"
          />
        </div>
        
        {/* 404 Text */}
        <h1 className="mb-2 text-8xl font-bold text-orange-600">404</h1>
        <h2 className="mb-4 text-2xl font-semibold text-gray-800">Halaman Tidak Ditemukan</h2>
        <p className="mb-8 text-gray-600">
          Sepertinya PRIA OSLO ini menyembunyikan halaman yang Anda cari
        </p>
        
        {/* Navigation Links */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => router.back()}
            className="rounded-lg bg-gray-700 px-6 py-3 text-white transition hover:bg-gray-800"
          >
            ← Kembali ke Halaman Sebelumnya
          </button>
          
          <Link 
            href="/"
            className="rounded-lg bg-orange-600 px-6 py-3 text-white transition hover:bg-orange-700"
          >
            🏠 Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}