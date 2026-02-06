"use client";
import { useEffect, useState } from "react";
import { Search, Sun, Moon, LogOut, User as UserIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import toast from 'react-hot-toast';

export default function HeaderBar() {
    const router = useRouter();
    const pathname = usePathname();
    const isMapPage = pathname === "/map";
    const isLandingPage = pathname === "/";
    const isAnalysisPage = pathname?.startsWith("/analysis");
    
    const [theme, setTheme] = useState("light");
    const [activeHash, setActiveHash] = useState("#home");
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userName, setUserName] = useState("");

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        const name = localStorage.getItem("user_name");
        setIsLoggedIn(!!token);
        setUserName(name || "User");
    }, [pathname]);

    useEffect(() => {
        if (isMapPage) {
            document.documentElement.setAttribute("data-theme", "dark");
            setTheme("dark");
            return;
        }
        const saved = localStorage.getItem("theme") || "light";
        document.documentElement.setAttribute("data-theme", saved);
        setTheme(saved);
    }, [pathname, isMapPage]);

    useEffect(() => {
        if (!isLandingPage) return;
        const sections = ["home", "features", "how-it-works", "cta"];
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveHash(`#${entry.target.id}`);
                    }
                });
            },
            { rootMargin: "-30% 0px -50% 0px", threshold: 0.05 }
        );
        sections.forEach((id) => {
            const el = document.getElementById(id);
            if (el) observer.observe(el);
        });
        return () => observer.disconnect();
    }, [isLandingPage]);

    const toggleTheme = () => {
        if (isMapPage) return;
        const next = theme === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        localStorage.setItem("theme", next);
        setTheme(next);
    };

    const handleSignOut = () => {
        const logoutToast = toast.loading('Signing out...');
        setTimeout(() => {
            localStorage.clear();
            setIsLoggedIn(false);
            toast.success(`Goodbye, ${userName}!`, { id: logoutToast, icon: '👋' });
            setTimeout(() => router.push("/"), 500);
        }, 800);
    };

    return (
        <header className="fixed top-0 left-0 right-0 h-16 z-[1200] flex items-center px-4 md:px-5 backdrop-blur-md bg-white/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
            
            <Link href="/" className="flex items-center hover:opacity-90 transition pl-2 md:pl-5">
                <Image src="/icons/terrablack.png" alt="TerraSeg" width={90} height={36} className="block dark:hidden" />
                <Image src="/icons/terrawhite2.png" alt="TerraSeg" width={90} height={36} className="hidden dark:block" />
            </Link>

            {isMapPage && (
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[400px] md:w-[420px]">
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search lokasi / koordinat / objek"
                            className="w-full h-10 pl-10 pr-4 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-cyan-400 focus:outline-none"
                        />
                    </div>
                </div>
            )}

            {isLandingPage && (
                <nav className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-sm">
                        <a href="#home" onClick={() => setActiveHash("#home")} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${activeHash === "#home" ? "bg-[#1378b7] text-white shadow-md shadow-[#1378b7]/40 scale-[1.05]" : "text-slate-600 dark:text-slate-300 hover:bg-white hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-white"}`}>Home</a>
                        <a href="#features" onClick={() => setActiveHash("#features")} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${activeHash === "#features" ? "bg-[#1378b7] text-white shadow-md shadow-[#1378b7]/40 scale-[1.05]" : "text-slate-600 dark:text-slate-300 hover:bg-white hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-white"}`}>Fitur</a>
                        <a href="#how-it-works" onClick={() => setActiveHash("#how-it-works")} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${activeHash === "#how-it-works" ? "bg-[#1378b7] text-white shadow-md shadow-[#1378b7]/40 scale-[1.05]" : "text-slate-600 dark:text-slate-300 hover:bg-white hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-white"}`}>Cara Kerja</a>
                        <a href="#cta" onClick={() => setActiveHash("#cta")} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${activeHash === "#cta" ? "bg-[#1378b7] text-white shadow-md shadow-[#1378b7]/40 scale-[1.05]" : "text-slate-600 dark:text-slate-300 hover:bg-white hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-white"}`}>Daftar Sekarang</a>
                    </div>
                </nav>
            )}

            {isAnalysisPage && (
                <nav className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-sm">
                        <Link href="/analysis/ekonomi" className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${pathname === "/analysis/ekonomi" ? "bg-[#1378b7] text-white shadow-md shadow-[#1378b7]/40 scale-[1.05]" : "text-slate-600 dark:text-slate-300 hover:bg-white hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-white"}`}>Ekonomi</Link>
                        <Link href="/analysis/pendidikan" className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${pathname === "/analysis/pendidikan" ? "bg-[#1378b7] text-white shadow-md shadow-[#1378b7]/40 scale-[1.05]" : "text-slate-600 dark:text-slate-300 hover:bg-white hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-white"}`}>Pendidikan</Link>
                        <Link href="/analysis/kesehatan" className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${pathname === "/analysis/kesehatan" ? "bg-[#1378b7] text-white shadow-md shadow-[#1378b7]/40 scale-[1.05]" : "text-slate-600 dark:text-slate-300 hover:bg-white hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-white"}`}>Kesehatan</Link>
                    </div>
                </nav>
            )}

            <div className="ml-auto flex items-center gap-2 md:gap-3 pr-2 md:pr-5">
                {!isMapPage && (
                    <button onClick={toggleTheme} className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                        {theme === "dark" ? <Sun size={22} className="text-yellow-400" /> : <Moon size={22} className="text-slate-700" />}
                    </button>
                )}

                {isLoggedIn ? (
                    <div className="flex items-center gap-1 md:gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="hidden sm:flex items-center gap-2 px-2 md:px-3 py-1">
                            <div className="w-7 h-7 bg-[#1378b7] rounded-full flex items-center justify-center text-white">
                                <UserIcon size={16} />
                            </div>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 max-w-[100px] truncate">
                                {userName}
                            </span>
                        </div>
                        <button onClick={handleSignOut} className="h-8 w-8 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition flex items-center justify-center">
                            <LogOut size={18} />
                        </button>
                    </div>
                ) : (
                    <button onClick={() => router.push("/login")} className="h-9 md:h-10 px-3 md:px-5 rounded-xl bg-[#1378b7] hover:bg-[#11669c] shadow-md font-semibold text-white transition active:scale-95">
                        <span className="hidden sm:inline">Sign in / up</span>
                        <span className="sm:hidden">Login</span>
                    </button>
                )}
            </div>
        </header>
    );
}