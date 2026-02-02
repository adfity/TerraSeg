'use client';

import { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod'; // Import zod langsung
import toast from 'react-hot-toast'

// Skema lokal untuk Reset Password
const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, "Password minimal 8 karakter"),
  confirmNewPassword: z.string()
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "Password tidak cocok",
  path: ["confirmNewPassword"],
});

export default function ResetPasswordForm({ resetToken }) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const form = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmNewPassword: '' },
  });

  // ... (sisanya sama dengan kode sebelumnya)
  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      toast.success('Password updated successfully!');
      form.reset();
    } catch (error) {
      toast.error('Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Change Password</h1>
        <p className="text-slate-600 dark:text-slate-400 text-base mt-2">
          Make sure to create a strong password to mark your projects.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="text-sm font-medium ml-1 text-slate-700 dark:text-slate-300">New Password</label>
          <div className="relative mt-2">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" size={20} />
            <Controller
              control={form.control}
              name="newPassword"
              render={({ field, fieldState }) => (
                <div className="space-y-1">
                  <input
                    {...field}
                    type={showPass ? "text" : "password"}
                    disabled={isLoading}
                    // placeholder="••••••••"
                    className={`w-full rounded-xl py-3.5 pl-12 pr-12 transition bg-white border text-slate-900 dark:bg-slate-800/60 dark:text-white focus:ring-2 focus:ring-[#1378b7] outline-none ${
                        fieldState.error ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-[18px] text-[#1378b7] hover:text-[#11669c]"
                  >
                    {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                  {fieldState.error && <p className="text-red-500 text-xs ml-1">{fieldState.error.message}</p>}
                </div>
              )}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium ml-1 text-slate-700 dark:text-slate-300">Confirm Password</label>
          <div className="relative mt-2">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" size={20} />
            <Controller
              control={form.control}
              name="confirmNewPassword"
              render={({ field, fieldState }) => (
                <div className="space-y-1">
                  <input
                    {...field}
                    type={showPass ? "text" : "password"}
                    disabled={isLoading}
                    // placeholder="••••••••"
                    className={`w-full rounded-xl py-3.5 pl-12 pr-4 transition bg-white border text-slate-900 dark:bg-slate-800/60 dark:text-white focus:ring-2 focus:ring-[#1378b7] outline-none ${
                        fieldState.error ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'
                      }`}
                  />
                  {fieldState.error && <p className="text-red-500 text-xs ml-1">{fieldState.error.message}</p>}
                </div>
              )}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 mt-4 rounded-xl bg-[#1378b7] hover:bg-[#11669c] transition-all font-bold text-white shadow-lg shadow-[#1378b7]/20 active:scale-[0.99] disabled:opacity-70"
        >
          {isLoading ? 'Waitt Bruh...' : 'Reset Password'}
        </button>
      </form>
    </>
  );
}