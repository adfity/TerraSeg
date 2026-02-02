'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod'; // Import zod langsung
import toast from 'react-hot-toast'

// Buat skema sederhana di sini
const forgotPasswordSchema = z.object({
  email: z.string().email("Email tidak valid"),
});

export default function ForgotPasswordForm({ invalidToken }) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    resolver: zodResolver(forgotPasswordSchema), // Gunakan skema lokal
    defaultValues: { email: '' },
  });

  useEffect(() => {
    if (invalidToken) {
      toast.error('Invalid or expired reset link. Please request a new one.');
    }
  }, [invalidToken]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      toast.success('Reset link sent to your email!');
      form.reset();
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Forgot Password?</h1>
        <p className="text-slate-600 dark:text-slate-400 text-base mt-2">
          Enter your email and we'll send you a link to reset your password.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="text-sm font-medium ml-1 text-slate-700 dark:text-slate-300">Email Address</label>
          <div className="relative mt-2">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" size={20} />
            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <>
                  <input
                    {...field}
                    type="email"
                    disabled={isLoading}
                    placeholder="name@example.com"
                    className={`w-full rounded-xl py-3.5 pl-12 pr-4 transition bg-white border text-slate-900 dark:bg-slate-800/60 dark:text-white focus:ring-2 focus:ring-[#1378b7] outline-none ${
                      fieldState.error ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'
                    }`}
                  />
                  {fieldState.error && <p className="text-red-500 text-xs mt-1 ml-1">{fieldState.error.message}</p>}
                </>
              )}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 rounded-xl bg-[#1378b7] hover:bg-[#11669c] transition-all font-bold text-white shadow-lg shadow-[#1378b7]/20 active:scale-[0.99] disabled:opacity-70"
        >
          {isLoading ? 'Waitt Bruh...' : 'Send Reset Link'}
        </button>
      </form>

      <div className="mt-8 text-center">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm font-bold text-[#1378b7] hover:underline">
          <ArrowLeft size={16} />
          Back to Sign In
        </Link>
      </div>
    </>
  );
}