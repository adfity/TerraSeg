"use client";

import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer id="about">
      <div className="container">
        <div className="footer-content">
          <div className="footer-column">
            <h3>TerraSeo</h3>
            <p>
              Platform analisis geospasial berbasis AI untuk identifikasi 
              dan segmentasi elemen geografis dari citra satelit dengan akurasi tinggi.
            </p>
          </div>

          <div className="footer-column">
            <h3>Navigasi</h3>
            <ul>
              {[
                { href: '#home', text: 'Beranda' },
                { href: '#features', text: 'Fitur' },
                { href: '#how-it-works', text: 'Cara Kerja' },
                { href: '#cta', text: 'Daftar' }
              ].map((link, index) => (
                <li key={index}>
                  <Link href={link.href}>
                    <i className="fas fa-chevron-right"></i> {link.text}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-column">
            <h3>Kontak</h3>
            <ul>
              <li>
                <Link href="mailto:support@terraseo.com">
                  <i className="fas fa-envelope"></i> support@terraseo.com
                </Link>
              </li>
              <li>
                <Link href="tel:+622112345678">
                  <i className="fas fa-phone"></i> +62 21 1234 5678
                </Link>
              </li>
              <li>
                <Link href="#">
                  <i className="fas fa-map-marker-alt"></i> Jakarta, Indonesia
                </Link>
              </li>
            </ul>
          </div>

          <div className="footer-column">
            <h3>Tautan Cepat</h3>
            <ul>
              <li>
                <Link href="/map">
                  <i className="fas fa-external-link-alt"></i> Buka Peta
                </Link>
              </li>
              <li>
                <Link href="/help">
                  <i className="fas fa-question-circle"></i> Bantuan
                </Link>
              </li>
              <li>
                <Link href="/docs">
                  <i className="fas fa-file-alt"></i> Dokumentasi
                </Link>
              </li>
              <li>
                <Link href="/privacy">
                  <i className="fas fa-shield-alt"></i> Privasi
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="copyright">
          <p className="text-xs text-slate-600 dark:text-slate-400 tracking-wide">
            © {currentYear}{" "}
            <span className="text-slate-900 dark:text-slate-300 font-medium">
              Badan Informasi Geospasial
            </span>
            . All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}