import ForgotPasswordForm from "./_components/forgot-password";
import ResetPasswordForm from "./_components/reset-password";
import HeaderBar from "@/components/layout/HeaderBar";
import Footerauth from "@/components/layout/footerauth";

export const metadata = {
  title: "Reset Password",
};

// Tambahkan async di sini
export default async function ResetPasswordPage({ searchParams }) {
  // Tunggu searchParams-nya
  const params = await searchParams;
  const token = params.token;
  
  // Jika ada token di URL, tampilkan form Reset (Ganti Password Baru)
  // Jika tidak ada, tampilkan form Forgot (Minta Link Email)
  let tokenVerified = !!token; 

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-white">
      <HeaderBar />

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#1378b7]/20 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-600/20 rounded-full blur-[160px]" />
      </div>

      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] relative z-10 px-4 pt-20 pb-10">
        <div className="w-full max-w-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 backdrop-blur-xl rounded-3xl px-10 py-10 shadow-2xl transition-all">
          {tokenVerified ? (
            <ResetPasswordForm resetToken={token} />
          ) : (
            <ForgotPasswordForm invalidToken={false} />
          )}
        </div>
      </div>
      <Footerauth />
    </div>
  );
}