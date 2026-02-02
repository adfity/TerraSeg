'use client';
import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

 // Di dalam useEffect file callback/page.js
  useEffect(() => {
      const accessToken = searchParams.get('access');
      const refreshToken = searchParams.get('refresh');
      const name = searchParams.get('name'); // Ambil nama dari URL

      if (accessToken) {
          localStorage.setItem('access_token', accessToken);
          localStorage.setItem('refresh_token', refreshToken);
          
          // Simpan nama asli dari Django, bukan tulisan "Google User" lagi
          if (name) {
              localStorage.setItem('user_name', name);
          }

          window.location.href = '/map'; 
      }
  }, [searchParams]);

  return (
    <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500 mx-auto mb-4"></div>
        <p>Menghubungkan akun...</p>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CallbackContent />
    </Suspense>
  );
}