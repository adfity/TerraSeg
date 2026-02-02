import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner"; // 1. Import Toaster-nya
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "TerraSeg",
  description: "app masih magang",
  icons: {
    icon: "/icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning> 
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        {/* 2. Taruh Toaster di sini agar muncul paling depan */}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}