"use client";

export default function Footerauth() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-6 text-center !bg-transparent">
      <p className="text-xs tracking-wide transition-colors duration-300">
        <span className="text-slate-800 dark:text-slate-400">
          © {currentYear}{" "}
        </span>
        <span className="font-medium text-slate-900 dark:text-slate-300">
          Badan Informasi Geospasial
        </span>
        <span className="text-slate-800 dark:text-slate-400">
          . All rights reserved.
        </span>
      </p>
    </footer>
  );
}