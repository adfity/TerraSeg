from rest_framework.decorators import api_view
from rest_framework.response import Response
from pymongo import MongoClient
import requests
import uuid
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_MONGO_NAME = os.getenv("DB_MONGO_NAME")
BPS_API_KEY = os.getenv("BPS_WEB_API_KEY")

# Koneksi MongoDB
client = MongoClient(MONGO_URI)
mongo_db = client[DB_MONGO_NAME]


# KONFIGURASI INDIKATOR KETAHANAN PANGAN
INDIKATOR_PANGAN = {
    "PREVALENSI_KETIDAKCUKUPAN": {
        "url_template": "https://webapi.bps.go.id/v1/api/list/model/data/lang/ind/domain/0000/var/1473/th/125/key/{key}/",
        "nama": "Prevalensi Ketidakcukupan Konsumsi Pangan",
        "satuan": "%",
        "penjelasan": "Persentase penduduk yang konsumsi pangannya di bawah kebutuhan minimum energi (2100 kkal/kapita/hari). Semakin tinggi nilai, semakin rentan ketahanan pangannya."
    }
}


class PanganAnalytics:
    """Model analisis ketahanan pangan dengan data BPS"""
    
    def __init__(self):
        # Kategori ketahanan pangan (dari yang paling rentan ke paling tahan)
        # Berdasarkan penelitian FAO dan Kementan RI tentang food security
        self.colors = {
            "SANGAT RENTAN": "#dc2626",    # Merah gelap - krisis pangan
            "RENTAN": "#ef4444",            # Merah - rawan pangan
            "AGAK TAHAN": "#f59e0b",        # Orange - perlu perhatian
            "TAHAN": "#10b981",             # Hijau - cukup baik
            "SANGAT TAHAN": "#059669"       # Hijau gelap - sangat baik
        }
        
        # Threshold berdasarkan standar FAO dan penelitian ketahanan pangan Indonesia
        # Prevalensi ketidakcukupan konsumsi pangan (lower is better)
        self.thresholds = {
            "SANGAT TAHAN": 5.0,      # < 5% = sangat tahan (akses pangan sangat baik)
            "TAHAN": 10.0,             # 5-10% = tahan (akses pangan baik)
            "AGAK TAHAN": 15.0,        # 10-15% = agak tahan (perlu perhatian)
            "RENTAN": 20.0,            # 15-20% = rentan (rawan pangan)
            # > 20% = sangat rentan (krisis pangan)
        }
    
    def fetch_data_from_bps(self):
        """Fetch data prevalensi ketidakcukupan konsumsi pangan dari BPS"""
        config = INDIKATOR_PANGAN["PREVALENSI_KETIDAKCUKUPAN"]
        
        try:
            url = config["url_template"].format(key=BPS_API_KEY)
            print(f"Fetching data: {url}")
            
            response = requests.get(url, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                print("✓ Data fetched successfully")
                return data
            else:
                print(f"✗ HTTP {response.status_code}")
                return None
                
        except Exception as e:
            print(f"✗ Error: {e}")
            return None
    
    def parse_province_data(self, raw_data):
        """Parse data per provinsi dari response BPS"""
        province_values = {}
        
        if not raw_data:
            return province_values
        
        try:
            # Format response BPS serupa dengan API lainnya
            datacontent = raw_data.get("datacontent", {})
            vervar_list = raw_data.get("vervar", [])
            
            # Buat mapping kode provinsi ke nama
            province_code_map = {}
            for item in vervar_list:
                code = str(item.get("val", ""))
                label = item.get("label", "")
                if code and label and code != "9999":  # Skip INDONESIA
                    province_code_map[code] = label
            
            # Parse datacontent
            for key, value in datacontent.items():
                try:
                    # Ambil 4 digit pertama sebagai kode provinsi
                    prov_code = key[:4]
                    
                    # Skip INDONESIA (9999)
                    if prov_code == "9999":
                        continue
                    
                    # Cari nama provinsi
                    provinsi_name = province_code_map.get(prov_code)
                    
                    if provinsi_name and value is not None:
                        provinsi_clean = str(provinsi_name).upper().strip()
                        value_float = float(value)
                        province_values[provinsi_clean] = value_float
                        
                except (ValueError, TypeError, IndexError) as e:
                    continue
            
            print(f"  Parsed {len(province_values)} provinces")
            
            # Debug: print beberapa contoh
            if province_values:
                sample_provs = list(province_values.items())[:3]
                print(f"  Sample: {sample_provs}")
            
        except Exception as e:
            print(f"  Parse error: {e}")
        
        return province_values
    
    def calculate_food_security_index(self, prevalensi):
        """
        Hitung Indeks Ketahanan Pangan (IKP)
        
        Metodologi:
        - Prevalensi ketidakcukupan konsumsi pangan adalah indikator negatif
        - Semakin rendah prevalensi, semakin baik ketahanan pangan
        - IKP = 100 - prevalensi (diskalakan untuk menghasilkan 0-100)
        
        Rumus: IKP = max(0, 100 - (prevalensi × 4))
        Faktor 4 digunakan untuk memberikan gradasi yang lebih jelas:
        - 0% prevalensi → IKP = 100
        - 5% prevalensi → IKP = 80
        - 10% prevalensi → IKP = 60
        - 15% prevalensi → IKP = 40
        - 20% prevalensi → IKP = 20
        - 25%+ prevalensi → IKP = 0
        """
        if prevalensi is None:
            return 0
        
        # Skalakan prevalensi untuk menghasilkan indeks 0-100
        # Gunakan faktor 4 untuk gradasi yang baik
        ikp = max(0, 100 - (prevalensi * 4))
        
        return round(ikp, 2)
    
    def categorize_province(self, prevalensi):
        """
        Kategorikan provinsi berdasarkan prevalensi ketidakcukupan konsumsi pangan
        
        Kategori berdasarkan standar FAO dan penelitian Kementan:
        - SANGAT TAHAN: < 5% (akses pangan sangat baik)
        - TAHAN: 5-10% (akses pangan baik)
        - AGAK TAHAN: 10-15% (perlu perhatian)
        - RENTAN: 15-20% (rawan pangan)
        - SANGAT RENTAN: > 20% (krisis pangan)
        """
        if prevalensi is None:
            return "TIDAK ADA DATA", 0
        
        ikp = self.calculate_food_security_index(prevalensi)
        
        if prevalensi < self.thresholds["SANGAT TAHAN"]:
            return "SANGAT TAHAN", ikp
        elif prevalensi < self.thresholds["TAHAN"]:
            return "TAHAN", ikp
        elif prevalensi < self.thresholds["AGAK TAHAN"]:
            return "AGAK TAHAN", ikp
        elif prevalensi < self.thresholds["RENTAN"]:
            return "RENTAN", ikp
        else:
            return "SANGAT RENTAN", ikp
    
    def generate_insights(self, provinsi, prevalensi, kategori, ikp):
        """Generate insight berdasarkan data ketahanan pangan"""
        insights = []
        
        # Insight utama
        if kategori == "SANGAT RENTAN":
            insights.append(f"🚨 {provinsi} dalam kondisi SANGAT RENTAN - IKP: {ikp}")
            insights.append(f"Prevalensi ketidakcukupan konsumsi: {prevalensi}% (sangat tinggi)")
            insights.append("Memerlukan intervensi darurat untuk mengatasi krisis pangan")
        elif kategori == "RENTAN":
            insights.append(f"⚠️ {provinsi} dalam kondisi RENTAN - IKP: {ikp}")
            insights.append(f"Prevalensi ketidakcukupan konsumsi: {prevalensi}% (tinggi)")
            insights.append("Perlu program bantuan pangan dan diversifikasi sumber pangan")
        elif kategori == "AGAK TAHAN":
            insights.append(f"📊 {provinsi} dalam kondisi AGAK TAHAN - IKP: {ikp}")
            insights.append(f"Prevalensi ketidakcukupan konsumsi: {prevalensi}% (sedang)")
            insights.append("Perlu penguatan sistem distribusi dan ketersediaan pangan")
        elif kategori == "TAHAN":
            insights.append(f"✅ {provinsi} dalam kondisi TAHAN - IKP: {ikp}")
            insights.append(f"Prevalensi ketidakcukupan konsumsi: {prevalensi}% (rendah)")
            insights.append("Pertahankan ketersediaan dan aksesibilitas pangan")
        else:  # SANGAT TAHAN
            insights.append(f"🏆 {provinsi} dalam kondisi SANGAT TAHAN - IKP: {ikp}")
            insights.append(f"Prevalensi ketidakcukupan konsumsi: {prevalensi}% (sangat rendah)")
            insights.append("Sistem ketahanan pangan berfungsi sangat baik")
        
        # Insight berdasarkan nilai spesifik
        if prevalensi >= 25:
            insights.append("🔴 Lebih dari 1/4 penduduk mengalami ketidakcukupan konsumsi pangan")
        elif prevalensi >= 20:
            insights.append("⚠️ Sekitar 1/5 penduduk mengalami ketidakcukupan konsumsi pangan")
        elif prevalensi <= 3:
            insights.append("✨ Prevalensi sangat rendah, mendekati kondisi ideal")
        
        return insights
    
    def generate_recommendations(self, kategori, prevalensi):
        """Generate rekomendasi kebijakan ketahanan pangan"""
        recommendations = []
        
        # Rekomendasi berdasarkan kategori
        if kategori == "SANGAT RENTAN":
            recommendations.append({
                'priority': 'DARURAT',
                'title': 'Intervensi Krisis Pangan',
                'actions': [
                    'Bantuan pangan darurat untuk rumah tangga rawan pangan',
                    'Operasi pasar murah dan subsidi pangan pokok',
                    'Program makan gratis untuk kelompok rentan',
                    'Pembentukan lumbung pangan darurat',
                    'Monitoring harga pangan dan stok strategis'
                ]
            })
        elif kategori == "RENTAN":
            recommendations.append({
                'priority': 'TINGGI',
                'title': 'Program Bantuan Pangan & Diversifikasi',
                'actions': [
                    'Program Bantuan Pangan Non Tunai (BPNT)',
                    'Kartu Sembako untuk keluarga miskin',
                    'Pengembangan pangan lokal dan diversifikasi konsumsi',
                    'Penguatan kelompok tani dan distribusi pangan',
                    'Subsidi pupuk dan bantuan sarana produksi'
                ]
            })
        elif kategori == "AGAK TAHAN":
            recommendations.append({
                'priority': 'SEDANG',
                'title': 'Penguatan Sistem Pangan',
                'actions': [
                    'Stabilisasi harga pangan melalui mekanisme pasar',
                    'Peningkatan produktivitas pertanian lokal',
                    'Pembangunan infrastruktur distribusi pangan',
                    'Program edukasi gizi dan pola konsumsi sehat',
                    'Kemitraan dengan pedagang dan distributor'
                ]
            })
        elif kategori == "TAHAN":
            recommendations.append({
                'priority': 'PEMELIHARAAN',
                'title': 'Optimalisasi & Inovasi',
                'actions': [
                    'Pengembangan teknologi pertanian modern',
                    'Diversifikasi komoditas pangan strategis',
                    'Penguatan cadangan pangan daerah',
                    'Program ketahanan pangan berbasis komunitas',
                    'Monitoring dan early warning system'
                ]
            })
        else:  # SANGAT TAHAN
            recommendations.append({
                'priority': 'BEST PRACTICE',
                'title': 'Replikasi & Peningkatan',
                'actions': [
                    'Dokumentasi best practices untuk provinsi lain',
                    'Pengembangan inovasi sistem pangan berkelanjutan',
                    'Program ekspor dan nilai tambah produk pangan',
                    'Riset dan pengembangan ketahanan pangan',
                    'Kemitraan regional untuk ketahanan pangan'
                ]
            })
        
        # Rekomendasi spesifik berdasarkan nilai
        if prevalensi >= 20:
            recommendations.append({
                'priority': 'KHUSUS - AKSES PANGAN',
                'title': 'Perbaikan Akses Pangan Mendesak',
                'actions': [
                    'Mapping daerah rawan pangan dan kelompok rentan',
                    'Penguatan pasar tradisional dan kios pangan',
                    'Program transportasi dan logistik pangan murah',
                    'Kerjasama dengan perusahaan retail untuk harga terjangkau',
                    'Bantuan langsung tunai untuk pembelian pangan'
                ]
            })
        
        if prevalensi >= 15:
            recommendations.append({
                'priority': 'KHUSUS - PRODUKSI',
                'title': 'Peningkatan Produksi Pangan Lokal',
                'actions': [
                    'Intensifikasi dan ekstensifikasi lahan pertanian',
                    'Program urban farming dan pertanian perkotaan',
                    'Bantuan bibit, pupuk, dan alat pertanian',
                    'Pelatihan teknik budidaya modern untuk petani',
                    'Asuransi pertanian dan perlindungan risiko'
                ]
            })
        
        if prevalensi >= 10:
            recommendations.append({
                'priority': 'KHUSUS - GIZI',
                'title': 'Perbaikan Status Gizi Masyarakat',
                'actions': [
                    'Program edukasi gizi seimbang dan GERMAS',
                    'Fortifikasi dan suplementasi gizi',
                    'Monitoring pertumbuhan balita dan ibu hamil',
                    'Kampanye konsumsi pangan bergizi',
                    'Pengembangan pangan fungsional lokal'
                ]
            })
        
        return recommendations


# MAPPING NAMA PROVINSI (sama seperti kesehatan_views.py)
def normalize_province_name(name):
    """Normalisasi nama provinsi untuk matching"""
    if not isinstance(name, str):
        name = str(name)
    
    name = name.upper().strip()
    
    # Mapping khusus
    special_mappings = {
        'DKI JAKARTA': 'JAKARTA',
        'DAERAH KHUSUS IBUKOTA JAKARTA': 'JAKARTA',
        'DKI': 'JAKARTA',
        'YOGYAKARTA': 'DAERAH ISTIMEWA YOGYAKARTA',
        'DIY': 'DAERAH ISTIMEWA YOGYAKARTA',
        'D.I. YOGYAKARTA': 'DAERAH ISTIMEWA YOGYAKARTA',
        'BANGKA BELITUNG': 'KEPULAUAN BANGKA BELITUNG',
        'KEP. BANGKA BELITUNG': 'KEPULAUAN BANGKA BELITUNG',
        'KEPULAUAN RIAU': 'KEPULAUAN RIAU',
        'KEP. RIAU': 'KEPULAUAN RIAU',
    }
    
    for key, value in special_mappings.items():
        if key in name:
            return value
    
    # Singkatan umum
    abbreviations = {
        'KEP.': 'KEPULAUAN',
        'KEP ': 'KEPULAUAN ',
        'NTB': 'NUSA TENGGARA BARAT',
        'NTT': 'NUSA TENGGARA TIMUR',
    }
    
    for abbr, full in abbreviations.items():
        if abbr in name:
            name = name.replace(abbr, full)
    
    # Hapus prefix
    prefixes = ['PROVINSI ', 'PROV. ', 'PROV ', 'DAERAH KHUSUS IBUKOTA ']
    for prefix in prefixes:
        if name.startswith(prefix):
            name = name[len(prefix):]
    
    return name.strip()


@api_view(['POST'])
def analyze_food_security_bps(request):
    """Analisis ketahanan pangan menggunakan BPS Web API"""
    
    if not BPS_API_KEY:
        return Response({
            "error": "BPS Web API Key belum dikonfigurasi",
            "message": "Silakan tambahkan BPS_WEB_API_KEY di file .env"
        }, status=500)
    
    try:
        # Inisialisasi analytics
        analytics = PanganAnalytics()
        
        print("=== Mulai fetch data dari BPS ===")
        # Fetch data
        raw_data = analytics.fetch_data_from_bps()
        
        if not raw_data:
            return Response({
                "error": "Gagal mengambil data dari BPS",
                "message": "Tidak dapat terhubung ke BPS Web API"
            }, status=500)
        
        # Parse data per provinsi
        print("\n=== Parse data per provinsi ===")
        parsed_data = analytics.parse_province_data(raw_data)
        
        if not parsed_data:
            return Response({
                "error": "Data tidak tersedia",
                "message": "Tidak ada data provinsi yang berhasil di-parse"
            }, status=500)
        
        # Ambil data batas provinsi dari MongoDB
        print("\n=== Load boundary data ===")
        cursor = mongo_db["batas_provinsi"].find({}, {'_id': 0})
        boundary_features = list(cursor)
        
        # Buat mapping nama provinsi ke boundary
        province_map = {}
        for feature in boundary_features:
            props = feature.get('properties', {})
            for field in ['NAMOBJ', 'name', 'WADMPR', 'Provinsi']:
                if field in props and props[field]:
                    official_name = str(props[field]).upper().strip()
                    normalized = normalize_province_name(official_name)
                    province_map[normalized] = feature
                    province_map[official_name] = feature
        
        print(f"Loaded {len(province_map)} province boundaries")
        
        # Proses analisis per provinsi
        print(f"\n=== Processing {len(parsed_data)} provinces ===")
        
        matched_features = []
        analysis_summary = []
        kategori_counts = {
            "SANGAT RENTAN": 0,
            "RENTAN": 0,
            "AGAK TAHAN": 0,
            "TAHAN": 0,
            "SANGAT TAHAN": 0
        }
        
        for prov_name, prevalensi in sorted(parsed_data.items()):
            # Skip jika tidak ada data
            if prevalensi is None:
                continue
            
            # Cari matching boundary
            normalized_prov = normalize_province_name(prov_name)
            matched_feature = None
            
            # Exact match
            if normalized_prov in province_map:
                matched_feature = province_map[normalized_prov]
            elif prov_name in province_map:
                matched_feature = province_map[prov_name]
            else:
                # Partial match
                for map_name, feature in province_map.items():
                    if normalized_prov in map_name or map_name in normalized_prov:
                        matched_feature = feature
                        break
            
            if not matched_feature:
                print(f"  ✗ {prov_name}: No boundary match")
                continue
            
            # Hitung kategori dan IKP
            kategori, ikp = analytics.categorize_province(prevalensi)
            warna = analytics.colors[kategori]
            
            # Generate insights & recommendations
            insights = analytics.generate_insights(prov_name, prevalensi, kategori, ikp)
            recommendations = analytics.generate_recommendations(kategori, prevalensi)
            
            # Update counts
            kategori_counts[kategori] += 1
            
            # Tambahkan ke feature
            feature_copy = matched_feature.copy()
            props = feature_copy.get('properties', {})
            
            props['food_security_analysis'] = {
                'nama_provinsi': prov_name,
                'kategori': kategori,
                'warna': warna,
                'food_security_index': ikp,
                'prevalensi_ketidakcukupan': prevalensi,
                'insights': insights,
                'rekomendasi': recommendations
            }
            
            feature_copy['properties'] = props
            matched_features.append(feature_copy)
            
            # Tambahkan ke summary
            analysis_summary.append({
                'provinsi': prov_name,
                'kategori': kategori,
                'warna': warna,
                'food_security_index': ikp,
                'prevalensi_ketidakcukupan': prevalensi,
                'matched': True
            })
            
            print(f"  ✓ {prov_name}: {kategori} (IKP: {ikp}, Prevalensi: {prevalensi}%)")
        
        # Generate rekomendasi nasional
        national_recommendations = []
        
        total_rentan = kategori_counts['SANGAT RENTAN'] + kategori_counts['RENTAN']
        if total_rentan > 0:
            national_recommendations.append({
                'priority': 'NASIONAL - DARURAT',
                'title': 'Program Darurat Ketahanan Pangan Nasional',
                'content': f'Terdapat {total_rentan} provinsi dalam kondisi rentan/sangat rentan yang memerlukan intervensi segera.',
                'actions': [
                    'Mobilisasi cadangan beras pemerintah (CBP) dan stok strategis',
                    'Operasi pasar murah skala nasional',
                    'Koordinasi Bulog untuk stabilisasi harga dan distribusi',
                    'Program bantuan pangan darurat berbasis data',
                    'Task force ketahanan pangan lintas kementerian'
                ]
            })
        
        if kategori_counts['AGAK TAHAN'] > 0:
            national_recommendations.append({
                'priority': 'NASIONAL - PREVENTIF',
                'title': 'Pencegahan Krisis Pangan',
                'content': f'Terdapat {kategori_counts["AGAK TAHAN"]} provinsi dalam kondisi agak tahan.',
                'actions': [
                    'Monitoring harga pangan dan early warning system',
                    'Penguatan sistem distribusi antar wilayah',
                    'Program diversifikasi pangan dan ketahanan gizi',
                    'Peningkatan produksi pangan lokal',
                    'Kemitraan dengan sektor swasta untuk distribusi'
                ]
            })
        
        # Cari provinsi dengan kondisi terburuk
        sorted_by_ikp = sorted(
            [s for s in analysis_summary if s['food_security_index'] is not None],
            key=lambda x: x['food_security_index']
        )[:5]  # Top 5 terburuk
        
        # Dokumentasi metodologi
        metodologi = {
            "judul": "Metodologi Perhitungan Indeks Ketahanan Pangan (IKP)",
            "deskripsi": "Indeks Ketahanan Pangan (IKP) mengukur tingkat ketahanan pangan suatu wilayah berdasarkan prevalensi ketidakcukupan konsumsi pangan penduduk.",
            "indikator_utama": {
                "nama": "Prevalensi Ketidakcukupan Konsumsi Pangan",
                "definisi": "Persentase penduduk yang konsumsi energi pangannya di bawah kebutuhan minimum (2100 kkal/kapita/hari)",
                "karakteristik": "Indikator negatif - semakin rendah nilai, semakin baik ketahanan pangan",
                "sumber": "BPS Web API - Var: 1473"
            },
            "formula_ikp": {
                "rumus": "IKP = max(0, 100 - (Prevalensi × 4))",
                "penjelasan": "Faktor 4 digunakan untuk memberikan gradasi yang jelas dalam skala 0-100",
                "contoh": [
                    "0% prevalensi → IKP = 100 (sangat tahan)",
                    "5% prevalensi → IKP = 80 (tahan)",
                    "10% prevalensi → IKP = 60 (agak tahan)",
                    "15% prevalensi → IKP = 40 (rentan)",
                    "20% prevalensi → IKP = 20 (sangat rentan)",
                    "25%+ prevalensi → IKP = 0 (krisis)"
                ]
            },
            "kategori": [
                {
                    "nama": "SANGAT TAHAN",
                    "threshold": "Prevalensi < 5%",
                    "ikp_range": "IKP ≥ 80",
                    "makna": "Akses pangan sangat baik, sistem ketahanan pangan optimal",
                    "warna": "#059669"
                },
                {
                    "nama": "TAHAN",
                    "threshold": "5% ≤ Prevalensi < 10%",
                    "ikp_range": "60 ≤ IKP < 80",
                    "makna": "Akses pangan baik, sistem berfungsi dengan baik",
                    "warna": "#10b981"
                },
                {
                    "nama": "AGAK TAHAN",
                    "threshold": "10% ≤ Prevalensi < 15%",
                    "ikp_range": "40 ≤ IKP < 60",
                    "makna": "Perlu penguatan sistem distribusi dan ketersediaan",
                    "warna": "#f59e0b"
                },
                {
                    "nama": "RENTAN",
                    "threshold": "15% ≤ Prevalensi < 20%",
                    "ikp_range": "20 ≤ IKP < 40",
                    "makna": "Rawan pangan, perlu intervensi program bantuan",
                    "warna": "#ef4444"
                },
                {
                    "nama": "SANGAT RENTAN",
                    "threshold": "Prevalensi ≥ 20%",
                    "ikp_range": "IKP < 20",
                    "makna": "Krisis pangan, memerlukan intervensi darurat",
                    "warna": "#dc2626"
                }
            ],
            "referensi": [
                "FAO - Food Security Indicators",
                "Kementan RI - Peta Ketahanan dan Kerentanan Pangan (FSVA)",
                "BPS - Statistik Ketahanan Pangan",
                "WHO - Nutrition Landscape Information System (NLIS)"
            ],
            "validitas": "Threshold kategori berdasarkan standar FAO untuk food security dan disesuaikan dengan kondisi Indonesia melalui penelitian Kementan RI tentang peta kerentanan pangan.",
            "catatan": "Prevalensi ketidakcukupan konsumsi pangan adalah indikator kunci dalam mengukur dimensi 'akses' dari ketahanan pangan. Indikator ini mencerminkan kemampuan rumah tangga untuk memperoleh pangan yang cukup secara kuantitas maupun kualitas."
        }
        
        print(f"\n=== Analysis Complete ===")
        print(f"Total matched: {len(matched_features)} provinces")
        print(f"Distribution: SANGAT RENTAN={kategori_counts['SANGAT RENTAN']}, RENTAN={kategori_counts['RENTAN']}, AGAK TAHAN={kategori_counts['AGAK TAHAN']}, TAHAN={kategori_counts['TAHAN']}, SANGAT TAHAN={kategori_counts['SANGAT TAHAN']}")
        
        return Response({
            'status': 'success',
            'source': 'BPS Web API - Prevalensi Ketidakcukupan Konsumsi Pangan',
            'total_provinces': len(parsed_data),
            'total_matched': len(matched_features),
            'total_success': len(matched_features),
            'kategori_distribusi': kategori_counts,
            'matched_features': {
                "type": "FeatureCollection",
                "features": matched_features
            },
            'analysis_summary': analysis_summary,
            'national_recommendations': national_recommendations,
            'worst_provinces': sorted_by_ikp,
            'colors': analytics.colors,
            'thresholds': analytics.thresholds,
            'indikator_info': {
                'nama': INDIKATOR_PANGAN["PREVALENSI_KETIDAKCUKUPAN"]['nama'],
                'satuan': INDIKATOR_PANGAN["PREVALENSI_KETIDAKCUKUPAN"]['satuan'],
                'penjelasan': INDIKATOR_PANGAN["PREVALENSI_KETIDAKCUKUPAN"]['penjelasan']
            },
            'metodologi': metodologi,
            'raw_dataset': parsed_data
        })
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({
            "error": str(e),
            "message": "Gagal mengambil data dari BPS"
        }, status=500)


@api_view(['POST'])
def save_food_security_analysis(request):
    """Simpan hasil analisis ketahanan pangan"""
    try:
        data = request.data
        analysis_name = data.get('name', 'Analisis Ketahanan Pangan Tanpa Nama')
        analysis_data = data.get('analysis_data')
        
        if not analysis_data:
            return Response({"error": "Data analisis tidak ditemukan"}, status=400)
        
        analysis_id = str(uuid.uuid4())
        
        document = {
            "analysis_id": analysis_id,
            "name": analysis_name,
            "type": "food_security",
            "timestamp": datetime.now().isoformat(),
            **analysis_data
        }
        
        mongo_db["food_security_analysis"].insert_one(document)
        
        return Response({
            "status": "success",
            "message": f"Analisis ketahanan pangan '{analysis_name}' berhasil disimpan",
            "analysis_id": analysis_id,
            "saved_at": document["timestamp"]
        })
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({
            "error": str(e),
            "message": "Gagal menyimpan analisis"
        }, status=500)


@api_view(['GET'])
def get_food_security_analysis_list(request):
    """Get list semua analisis ketahanan pangan"""
    try:
        cursor = mongo_db["food_security_analysis"].find(
            {},
            {
                '_id': 0,
                'analysis_id': 1,
                'name': 1,
                'timestamp': 1,
                'total_matched': 1,
                'kategori_distribusi': 1
            }
        ).sort('timestamp', -1)
        
        results = list(cursor)
        
        return Response({
            "status": "success",
            "count": len(results),
            "results": results
        })
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        return Response({
            "error": str(e),
            "message": "Gagal mengambil daftar analisis"
        }, status=500)


@api_view(['GET'])
def get_food_security_analysis_detail(request, analysis_id):
    """Get detail analisis ketahanan pangan"""
    try:
        result = mongo_db["food_security_analysis"].find_one(
            {"analysis_id": analysis_id},
            {'_id': 0}
        )
        
        if not result:
            return Response({
                "error": "Analisis tidak ditemukan"
            }, status=404)
        
        return Response(result)
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        return Response({
            "error": str(e),
            "message": "Gagal mengambil detail analisis"
        }, status=500)


@api_view(['DELETE'])
def delete_food_security_analysis(request, analysis_id):
    """Hapus analisis ketahanan pangan"""
    try:
        result = mongo_db["food_security_analysis"].delete_one(
            {"analysis_id": analysis_id}
        )
        
        if result.deleted_count == 0:
            return Response({
                "error": "Analisis tidak ditemukan"
            }, status=404)
        
        return Response({
            "status": "success",
            "message": "Analisis berhasil dihapus"
        })
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        return Response({
            "error": str(e),
            "message": "Gagal menghapus analisis"
        }, status=500)