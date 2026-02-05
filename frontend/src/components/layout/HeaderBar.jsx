"use client";
import { useEffect, useState, useCallback } from "react";
import { Search, Sun, Moon, LogOut, User as UserIcon, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import toast from 'react-hot-toast';

export default function HeaderBar() {
    const router = useRouter();
    const pathname = usePathname();
    const isMapPage = pathname === "/map";
    
    // --- STATE MANAGEMENT ---
    const [theme, setTheme] = useState("light");
    const [activeHash, setActiveHash] = useState("#home");
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userName, setUserName] = useState("");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // --- CHECK DEVICE TYPE ---
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // --- AUTH LOGIC ---
    useEffect(() => {
        const checkAuth = () => {
            const token = localStorage.getItem("access_token") || localStorage.getItem("accessToken");
            const name = localStorage.getItem("user_name") || localStorage.getItem("userName");
            
            if (token) {
                setIsLoggedIn(true);
                setUserName(name || "User");
            } else {
                setIsLoggedIn(false);
                setUserName("");
            }
        };

        checkAuth();
        window.addEventListener('storage', checkAuth);
        return () => window.removeEventListener('storage', checkAuth);
    }, [pathname]);

    // --- THEME LOGIC ---
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

    const toggleTheme = useCallback(() => {
        if (isMapPage) return;
        
        const next = theme === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        localStorage.setItem("theme", next);
        setTheme(next);
    }, [theme, isMapPage]);

    // --- NAVIGATION ITEMS ---
    const navItems = [
        { label: "Home", href: "#home" },
        { label: "Fitur", href: "#features" },
        { label: "Cara Kerja", href: "#how-it-works" },
        { label: "Daftar Sekarang", href: "#cta" },
    ];

    // --- MOBILE NAVIGATION ---
    const handleMobileNavClick = (href) => {
        setActiveHash(href);
        setIsMobileMenuOpen(false);
    };

    const handleSignOut = () => {
        const logoutToast = toast.loading('Signing out...');
        const userNameToShow = userName;
        
        setTimeout(() => {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            localStorage.removeItem("user_role");
            localStorage.removeItem("user_name");
            
            setIsLoggedIn(false);
            
            toast.success(`Goodbye, ${userNameToShow}!`, {
                id: logoutToast,
                icon: '👋',
                duration: 3000,
            });
            
            setTimeout(() => {
                router.push("/");
                router.refresh();
            }, 500);
        }, 800);
    };

    const handleLoginClick = () => {
        if (pathname === "/login") return;
        router.push("/login");
        setIsMobileMenuOpen(false);
    };

    // --- SCROLL OBSERVER ---
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
        <>
            <header className="
                fixed top-0 left-0 right-0
                h-16 md:h-20 z-[1200]
                flex items-center px-4 md:px-6 lg:px-8
                backdrop-blur-md
                bg-white/90 dark:bg-slate-900/90
                border-b border-slate-200 dark:border-slate-800
                shadow-sm
            ">
                {/* LEFT: Logo */}
                <div className="flex items-center flex-shrink-0">
                    <Link href="/" className="flex items-center cursor-pointer hover:opacity-90 transition">
                        <Image
                            src="/icons/terrablack.png"
                            alt="TerraSeg"
                            width={isMobile ? 80 : 100}
                            height={isMobile ? 32 : 40}
                            className="block dark:hidden select-none object-contain"
                            priority
                        />
                        <Image
                            src="/icons/terrawhite2.png"
                            alt="TerraSeg"
                            width={isMobile ? 80 : 100}
                            height={isMobile ? 32 : 40}
                            className="hidden dark:block select-none object-contain"
                            priority
                        />
                    </Link>
                </div>

                {/* CENTER: Navigation or Search */}
                {pathname === "/map" ? (
                    // SEARCH BAR DI MAP PAGE
                    <div className="
                        flex-1 flex justify-center mx-4 md:mx-8 lg:mx-12
                        absolute md:relative
                        left-0 md:left-auto
                        top-full md:top-0
                        mt-2 md:mt-0
                        md:h-full md:items-center
                        px-4 md:px-0
                        w-[calc(100%-32px)] md:w-auto
                    ">
                        <div className="relative w-full max-w-sm md:max-w-md">
                            <Search
                                size={18}
                                className="absolute left-3 top-1/2 -translate-y-1/2
                                    text-slate-500 dark:text-slate-400"
                            />
                            <input
                                type="text"
                                placeholder="Search lokasi / koordinat / objek"
                                className="
                                    w-full h-10 md:h-11
                                    pl-10 pr-4 rounded-xl md:rounded-2xl
                                    bg-white dark:bg-slate-800
                                    text-slate-900 dark:text-slate-100
                                    placeholder-slate-500 dark:placeholder-slate-400
                                    border border-slate-300 dark:border-slate-700
                                    focus:outline-none focus:ring-2 focus:ring-cyan-400
                                    transition text-sm md:text-base
                                    shadow-sm
                                "
                            />
                        </div>
                    </div>
                ) : pathname === "/" ? (
                    // NAVIGATION DI LANDING PAGE
                    !isMobile ? (
                        <div className="flex-1 flex justify-center mx-4 md:mx-8">
                            <nav className="
                                flex items-center gap-1
                                px-2 py-1
                                rounded-full
                                bg-slate-100/80 dark:bg-slate-800/80
                                backdrop-blur-md
                                border border-slate-200 dark:border-slate-700
                                shadow-sm
                            ">
                                {navItems.map((item) => {
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
                                                whitespace-nowrap
                                                ${active
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
                    ) : null
                ) : null}

                {/* RIGHT: Actions */}
                <div className="flex items-center justify-end gap-2 md:gap-3 ml-auto md:ml-0">
                    {/* Theme Toggle - Hidden on map page */}
                    {!isMapPage && (
                        <button 
                            onClick={toggleTheme} 
                            className="
                                w-9 h-9 md:w-10 md:h-10 
                                flex items-center justify-center
                                rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800
                                transition-colors flex-shrink-0
                            "
                            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                        >
                            {theme === "dark" ? (
                                <Sun size={22} className="md:w-6 md:h-6 text-yellow-400" />
                            ) : (
                                <Moon size={22} className="md:w-6 md:h-6 text-slate-700 dark:text-slate-300" />
                            )}
                        </button>
                    )}

                    {/* Mobile Menu Toggle (Landing Page only) */}
                    {pathname === "/" && isMobile && (
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="
                                w-9 h-9 md:w-10 md:h-10 
                                flex items-center justify-center
                                rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800
                                transition-colors ml-2
                            "
                            aria-label="Toggle menu"
                        >
                            {isMobileMenuOpen ? (
                                <X size={24} className="text-slate-700 dark:text-slate-300" />
                            ) : (
                                <Menu size={24} className="text-slate-700 dark:text-slate-300" />
                            )}
                        </button>
                    )}

                    {/* Auth Section */}
                    <div className="flex items-center">
                        {isLoggedIn ? (
                            <div className="
                                flex items-center gap-1 md:gap-2 
                                bg-slate-100 dark:bg-slate-800 
                                p-1 rounded-xl border border-slate-200 dark:border-slate-700
                            ">
                                <div className="hidden sm:flex items-center gap-2 px-3 py-1">
                                    <div className="w-7 h-7 bg-[#1378b7] rounded-full flex items-center justify-center text-white">
                                        <UserIcon size={16} />
                                    </div>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 max-w-[80px] md:max-w-[120px] truncate">
                                        {userName}
                                    </span>
                                </div>
                                <button
                                    onClick={handleSignOut}
                                    className="
                                        h-8 w-8 rounded-lg
                                        bg-red-500/10 hover:bg-red-500 
                                        text-red-500 hover:text-white
                                        transition-all flex items-center justify-center
                                        flex-shrink-0
                                    "
                                    aria-label="Sign out"
                                >
                                    <LogOut size={18} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleLoginClick}
                                className="
                                    h-9 md:h-10 px-4 md:px-5 rounded-xl
                                    bg-[#1378b7] hover:bg-[#11669c]
                                    shadow-md shadow-[#1378b7]/30
                                    font-semibold text-white
                                    flex items-center justify-center
                                    whitespace-nowrap transition-all active:scale-95
                                    hover:shadow-lg text-sm md:text-base
                                    flex-shrink-0
                                "
                            >
                                {isMobile ? "Login" : "Sign in / up →"}
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Mobile Navigation Menu */}
            {isMobileMenuOpen && pathname === "/" && (
                <div className="
                    fixed top-16 left-0 right-0 z-[1100]
                    bg-white dark:bg-slate-900
                    border-b border-slate-200 dark:border-slate-800
                    shadow-lg animate-slideDown
                ">
                    <nav className="flex flex-col p-4">
                        {navItems.map((item) => {
                            const active = activeHash === item.href;
                            return (
                                <a
                                    key={item.label}
                                    href={item.href}
                                    onClick={() => handleMobileNavClick(item.href)}
                                    className={`
                                        px-4 py-3 rounded-lg
                                        text-base font-medium
                                        transition-all
                                        ${active
                                            ? `
                                            bg-[#1378b7]
                                            text-white
                                            `
                                            : `
                                            text-slate-700 dark:text-slate-300
                                            hover:bg-slate-100 dark:hover:bg-slate-800
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

            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-[1000] md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
        </>
    );
}