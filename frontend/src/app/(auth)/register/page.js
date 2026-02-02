"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Lock, Mail } from "lucide-react";
import HeaderBar from "@/components/layout/HeaderBar";
import Footerauth from "@/components/layout/footerauth";
import { FcGoogle } from "react-icons/fc";
import { SiGithub } from "react-icons/si";
import toast from 'react-hot-toast';

export default function SignupPage() {
    const router = useRouter();
    
    // State untuk form
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: ""
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validasi Password Match
        if (formData.password !== formData.confirmPassword) {
            toast.error("Passwords do not match!");
            return;
        }

        // Validasi panjang password (contoh: minimal 8 karakter)
        if (formData.password.length < 8) {
            toast.error("Password must be at least 8 characters long!");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch("http://127.0.0.1:8000/api/accounts/register/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    first_name: formData.firstName,
                    last_name: formData.lastName,
                    email: formData.email,
                    password: formData.password
                }),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success("Registration Successful! Please check your email to verify your account.");
                
                // Tunggu sebentar sebelum redirect
                setTimeout(() => {
                    router.push("/login");
                }, 2000);
            } else {
                // Menampilkan error dari Django
                if (data.email) {
                    toast.error(`Email: ${data.email[0]}`);
                } else if (data.password) {
                    toast.error(`Password: ${data.password[0]}`);
                } else if (data.non_field_errors) {
                    toast.error(data.non_field_errors[0]);
                } else {
                    toast.error("Registration failed. Please try again.");
                }
            }
        } catch (error) {
            console.error("Error:", error);
            toast.error("Connection to server failed. Please check your internet connection.");
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = (provider) => {
        toast.loading(`Redirecting to ${provider}...`);
        window.location.href = `http://127.0.0.1:8000/accounts/${provider}/login/`;
    };

    return (
        <div className="
            min-h-screen relative overflow-hidden
            bg-slate-100 text-slate-900
            dark:bg-slate-950 dark:text-white
        ">
            <HeaderBar />

            {/* cahaya ilahi blue */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#1378b7]/20 rounded-full blur-[140px]" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-600/20 rounded-full blur-[160px]" />
            </div>

            <div className="flex items-start justify-center min-h-[calc(100vh-80px)] relative z-10 px-4 pt-26">
                <div className="w-full max-w-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 backdrop-blur-xl rounded-3xl px-10 py-6 shadow-2xl transition-all">

                    {/* title */}
                    <div className="text-center mb-5">
                        <h1 className="text-3xl font-bold">Sign Up</h1>
                        <p className="text-slate-600 dark:text-slate-400 text-base mt-2">
                            Fill the form below to create your account
                        </p>
                    </div>

                    {/* sosial login */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-5">
                        <button 
                            onClick={() => handleSocialLogin('google')}
                            className="
                                flex items-center justify-center gap-3 w-full py-3 rounded-xl
                                bg-slate-200 hover:bg-slate-300 text-slate-900 border border-slate-300
                                dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white dark:border-white/5
                                transition
                            "
                        >
                            <FcGoogle className="w-5 h-5" />
                            <span className="text-sm font-medium">Sign up with Google</span>
                        </button>

                        <button 
                            onClick={() => toast.error("GitHub registration coming soon!")}
                            className="
                                flex items-center justify-center gap-3 w-full py-3 rounded-xl
                                bg-slate-200 hover:bg-slate-300 text-slate-900 border border-slate-300
                                dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white dark:border-white/5
                                transition
                            "
                        >
                            <SiGithub className="w-5 h-5" />
                            <span className="text-sm font-medium">Sign up with Github</span>
                        </button>
                    </div>

                    {/* garis or */}
                    <div className="flex items-center gap-4 mb-5">
                        <div className="flex-1 h-px bg-slate-300 dark:bg-slate-700/50" />
                        <span className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-widest">Or</span>
                        <div className="flex-1 h-px bg-slate-300 dark:bg-slate-700/50" />
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* first last name */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium ml-1 text-slate-700 dark:text-slate-300">First Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                                    placeholder="First name"
                                    className="
                                        mt-1.5 w-full rounded-xl py-3 px-4 transition
                                        bg-white border border-slate-300 text-slate-900
                                        dark:bg-slate-800/60 dark:border-slate-700 dark:text-white
                                        focus:ring-2 focus:ring-[#1378b7] outline-none
                                    "
                                    suppressHydrationWarning
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium ml-1 text-slate-700 dark:text-slate-300">Last Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                                    placeholder="Last name"
                                    className="
                                        mt-1.5 w-full rounded-xl py-3 px-4 transition
                                        bg-white border border-slate-300 text-slate-900
                                        dark:bg-slate-800/60 dark:border-slate-700 dark:text-white
                                        focus:ring-2 focus:ring-[#1378b7] outline-none
                                    "
                                    suppressHydrationWarning
                                />
                            </div>
                        </div>

                        {/* email */}
                        <div>
                            <label className="text-sm font-medium ml-1 text-slate-700 dark:text-slate-300">Email address</label>
                            <div className="relative mt-1.5">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" size={18} />
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    placeholder="Your email address"
                                    className="
                                        w-full rounded-xl py-3 pl-12 pr-4 transition
                                        bg-white border border-slate-300 text-slate-900
                                        dark:bg-slate-800/60 dark:border-slate-700 dark:text-white
                                        focus:ring-2 focus:ring-[#1378b7] outline-none
                                    "
                                    suppressHydrationWarning
                                />
                            </div>
                        </div>

                        {/* password */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium ml-1 text-slate-700 dark:text-slate-300">Password</label>
                                <div className="relative mt-1.5">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" size={18} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={formData.password}
                                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                                        placeholder="Create password"
                                        className="
                                            w-full rounded-xl py-3 pl-12 pr-12 transition
                                            bg-white border border-slate-300 text-slate-900
                                            dark:bg-slate-800/60 dark:border-slate-700 dark:text-white
                                            focus:ring-2 focus:ring-[#1378b7] outline-none
                                        "
                                        suppressHydrationWarning
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#1378b7] hover:text-[#11669c]"
                                    >
                                        {showPassword ? "HIDE" : "SHOW"}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium ml-1 text-slate-700 dark:text-slate-300">Confirm Password</label>
                                <div className="relative mt-1.5">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" size={18} />
                                    <input
                                        type={showConfirm ? "text" : "password"}
                                        required
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                                        placeholder="Repeat password"
                                        className="
                                            w-full rounded-xl py-3 pl-12 pr-12 transition
                                            bg-white border border-slate-300 text-slate-900
                                            dark:bg-slate-800/60 dark:border-slate-700 dark:text-white
                                            focus:ring-2 focus:ring-[#1378b7] outline-none
                                        "
                                        suppressHydrationWarning
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirm(!showConfirm)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#1378b7] hover:text-[#11669c]"
                                    >
                                        {showConfirm ? "HIDE" : "SHOW"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 mt-4 rounded-xl bg-[#1378b7] hover:bg-[#11669c] transition-all font-bold text-white shadow-lg shadow-[#1378b7]/20 active:scale-[0.99] disabled:opacity-70"
                        >
                            {loading ? 'Wait Bruh...' : 'Create Account'}
                        </button>
                    </form>

                    {/* Sign in */}
                    <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-8">
                        Already have an account?{" "}
                        <Link href="/login" className="text-[#1378b7] font-bold hover:underline">
                            Sign In
                        </Link>
                    </p>
                </div>
            </div>
            <Footerauth />
        </div>
    );
}