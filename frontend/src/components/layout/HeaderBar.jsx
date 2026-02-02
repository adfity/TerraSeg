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
    
    // --- 1. STATE MANAGEMENT ---
    const [theme, setTheme] = useState("light");
    const [activeHash, setActiveHash] = useState("#home");
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userName, setUserName] = useState("");

    // --- 2. AUTH LOGIC (Cek Status Login) ---
    useEffect(() => {
        const checkAuth = () => {
            // Coba ambil dengan kedua format (snake_case atau camelCase)
            const token = localStorage.getItem("access_token") || localStorage.getItem("accessToken");
            const name = localStorage.getItem("user_name") || localStorage.getItem("userName");
            
            if (token) {
                setIsLoggedIn(true);
                // Jika name kosong, kita kasih fallback 'User'
                setUserName(name || "User");
            } else {
                setIsLoggedIn(false);
                setUserName("");
            }
        };

        checkAuth();
        
        // TAMBAHKAN INI: Listener agar header langsung berubah saat storage diisi
        window.addEventListener('storage', checkAuth);
        return () => window.removeEventListener('storage', checkAuth);
    }, [pathname]);

    // --- 3. THEME LOGIC (Dengan handling khusus untuk halaman map) ---
    useEffect(() => {
        // Jika di halaman map, FORCE theme dark
        if (isMapPage) {
            document.documentElement.setAttribute("data-theme", "dark");
            setTheme("dark");
            return;
        }
        
        // Jika bukan halaman map, gunakan preferensi user
        const saved = localStorage.getItem("theme") || "dark";
        document.documentElement.setAttribute("data-theme", saved);
        setTheme(saved);
    }, [pathname, isMapPage]);

    const toggleTheme = () => {
        // Nonaktifkan toggle di halaman map
        if (isMapPage) return;
        
        const next = theme === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        localStorage.setItem("theme", next);
        setTheme(next);
        
        // Tampilkan toast untuk theme change
        toast.success(`Switched to ${next} mode`, {
            icon: next === "dark" ? '🌙' : '☀️',
            duration: 2000,
        });
    };

    const handleSignOut = () => {
        // Tampilkan toast loading
        const logoutToast = toast.loading('Signing out...');
        
        // Simpan nama user untuk ditampilkan di toast
        const userNameToShow = userName;
        
        // Hapus semua data session setelah delay kecil
        setTimeout(() => {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            localStorage.removeItem("user_role");
            localStorage.removeItem("user_name");
            
            setIsLoggedIn(false);
            
            // Update toast menjadi sukses
            toast.success(`Goodbye, ${userNameToShow}!`, {
                id: logoutToast,
                icon: '👋',
                duration: 3000,
            });
            
            // Redirect ke homepage setelah toast
            setTimeout(() => {
                router.push("/");
                router.refresh(); // Paksa refresh state
            }, 500);
            
        }, 800);
    };

    const handleLoginClick = () => {
        if (pathname === "/login") return;
        router.push("/login");
    };

    // --- 4. SCROLL OBSERVER LOGIC (Hanya untuk Landing Page) ---
    useEffect(() => {
        if (pathname !== "/") return;

        const sections = ["home", "features", "how-it-works", "cta"];

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveHash(`#${entry.target.id}`);
                    }
                });
            },
            {
                rootMargin: "-30% 0px -50% 0px",
                threshold: 0.05,
            }
        );

        sections.forEach((id) => {
            const el = document.getElementById(id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [pathname]);

    return (
        <header
        className="
            fixed top-0 left-0 right-0
            h-16 z-[1200]
            flex items-center px-5
            backdrop-blur-md
            bg-white/70 dark:bg-slate-900/70
            border-b border-slate-200 dark:border-slate-800
        ">

            {/* KIRI icon */}
            <div className="flex items-center pl-5">
                <Link href="/" className="flex items-center cursor-pointer hover:opacity-90 transition">
                    <Image
                    src="/icons/terrablack.png"
                    alt="TerraSeg"
                    width={100}
                    height={100}
                    className="block dark:hidden select-none"
                    />
                    <Image
                    src="/icons/terrawhite2.png"
                    alt="TerraSeg"
                    width={100}
                    height={100}
                    className="hidden dark:block select-none"
                    />
                </Link>
            </div>

            {/* TENGAH search */}
            {pathname === "/map" && (
            <div className="
                absolute left-1/2 top-1/2
                -translate-x-1/2 -translate-y-1/2
                w-[420px]
            ">
                <div className="relative">
                    <Search
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2
                                text-slate-500 dark:text-slate-400"
                    />
                    <input
                        type="text"
                        placeholder="Search lokasi / koordinat / objek"
                        className="
                        w-full h-10 pl-10 pr-4 rounded-xl
                        bg-white dark:bg-slate-800
                        text-slate-900 dark:text-slate-100
                        placeholder-slate-500 dark:placeholder-slate-400
                        border border-slate-300 dark:border-slate-700
                        focus:ring-2 focus:ring-cyan-400
                        transition
                        "
                    />
                </div>
            </div>
            )}

            {/* TENGAH label bar */}
            {pathname === "/" && (
            <div
                className="
                absolute left-1/2 top-1/2
                -translate-x-1/2 -translate-y-1/2
                "
            >
                <nav
                className="
                    flex items-center gap-1
                    px-2 py-1
                    rounded-full
                    bg-slate-100/80 dark:bg-slate-800/80
                    backdrop-blur-md
                    border border-slate-200 dark:border-slate-700
                    shadow-sm
                ">
                    {[
                        { label: "Home", href: "#home" },
                        { label: "Fitur", href: "#features" },
                        { label: "Cara Kerja", href: "#how-it-works" },
                        { label: "Daftar Sekarang", href: "#cta" },
                        ].map((item) => {
                        const active = activeHash === item.href;

                        return (
                        <a
                            key={item.label}
                            href={item.href}
                            onClick={() => setActiveHash(item.href)}
                            className={`
                                px-4 py-1.5 rounded-full
                                text-sm font-medium
                                transition-all duration-300

                                ${
                                active
                                    ? `
                                    bg-[#1378b7]
                                    text-white
                                    shadow-md shadow-[#1378b7]/40
                                    scale-[1.05]
                                    `
                                    : `
                                    text-slate-600 dark:text-slate-300
                                    hover:bg-white hover:text-slate-900
                                    dark:hover:bg-slate-700 dark:hover:text-white
                                    `
                                }
                            `}
                            >
                            {item.label}
                        </a>
                        );
                    })}

                </nav>
            </div>
            )}

            {/* KANAN lampu*/}
            <div className="ml-auto flex items-center justify-end gap-3 pr-5">
                {/* TOMBOL THEME - Hanya tampil jika BUKAN di halaman map */}
                {!isMapPage && (
                    <button 
                        onClick={toggleTheme} 
                        className="
                            w-10 h-10 flex items-center justify-center
                            rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800
                            transition-colors
                            relative group
                        "
                        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                    >
                        {theme === "dark" ? (
                            <Sun size={25} className="text-yellow-400" />
                        ) : (
                            <Moon size={25} className="text-slate-700" />
                        )}
                        <span className="
                            absolute -bottom-8 left-1/2 -translate-x-1/2
                            px-2 py-1 text-xs font-medium
                            bg-slate-800 text-white
                            rounded-md opacity-0 group-hover:opacity-100
                            transition-opacity whitespace-nowrap pointer-events-none
                        ">
                            {theme === "dark" ? "Light mode" : "Dark mode"}
                        </span>
                    </button>
                )}

                {isLoggedIn ? (
                    // TAMPILAN JIKA SUDAH LOGIN
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 group relative">
                        <div className="flex items-center gap-2 px-3 py-1">
                            <div className="w-7 h-7 bg-[#1378b7] rounded-full flex items-center justify-center text-white">
                                <UserIcon size={16} />
                            </div>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 max-w-[100px] truncate">
                                {userName}
                            </span>
                        </div>
                        <button
                            onClick={handleSignOut}
                            className="
                                h-8 w-8 rounded-lg
                                bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white
                                transition-all flex items-center justify-center
                                relative group/logout
                            "
                            title="Sign Out"
                        >
                            <LogOut size={18} />
                            <span className="
                                absolute -bottom-8 left-1/2 -translate-x-1/2
                                px-2 py-1 text-xs font-medium
                                bg-slate-800 text-white
                                rounded-md opacity-0 group-hover/logout:opacity-100
                                transition-opacity whitespace-nowrap pointer-events-none
                            ">
                                Sign Out
                            </span>
                        </button>
                    </div>
                ) : (
                    // TAMPILAN JIKA BELUM LOGIN
                    <button
                        onClick={handleLoginClick}
                        className="
                            h-10 px-5 rounded-xl
                            bg-[#1378b7] hover:bg-[#11669c]
                            shadow-md shadow-[#1378b7]/30
                            font-semibold text-white
                            flex items-center justify-center
                            whitespace-nowrap transition-all active:scale-95
                            hover:shadow-lg
                        "
                    >
                        Sign in / up →
                    </button>
                )}
            </div>

        </header>
    );
}