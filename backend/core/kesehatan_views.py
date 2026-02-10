from rest_framework.decorators import api_view
from rest_framework.response import Response
from pymongo import MongoClient
import requests
import uuid
import pandas as pd
import numpy as np
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


# KONFIGURASI INDIKATOR KESEHATAN BPS (Menggunakan data yang tersedia)
INDIKATOR_KESEHATAN = {
    # Angka Kematian Bayi (AKB) per 1000 kelahiran hidup
    "AKB": {
        "variable_id": "1584",  # Infant Mortality Rate (IMR) Per 1000 Live Births by Province
        "nama": "Angka Kematian Bayi",
        "satuan": "per 1000 kelahiran",
        "threshold_baik": 20,
        "threshold_sedang": 30,
        "bobot": 0.40,
        "reverse": True
    },
    # Prevalensi Stunting
    "STUNTING": {
        "variable_id": "1325",  # Percentage of Toddlers Short And Very Short
        "nama": "Prevalensi Stunting Balita",
        "satuan": "%",
        "threshold_baik": 20,
        "threshold_sedang": 30,
        "bobot": 0.30,
        "reverse": True
    },
    # Insiden Tuberkulosis
    "TB": {
        "variable_id": "1763",  # Incidence of Tuberculosis Per 100,000 Population
        "nama": "Insiden Tuberkulosis",
        "satuan": "per 100.000 penduduk",
        "threshold_baik": 150,
        "threshold_sedang": 250,
        "bobot": 0.30,
        "reverse": True
    }
}


class KesehatanAnalytics:
    """Model analisis kesehatan dengan data BPS"""
    
    def __init__(self):
        self.colors = {
            "KRITIS": "#ef4444",
            "WASPADA": "#f59e0b",
            "STABIL": "#10b981"
        }
        
        self.bps_base_url = "https://webapi.bps.go.id/v1/api/list"
    
    def fetch_bps_data(self, provinsi_code, indikator_key):
        """Fetch data dari BPS Web API"""
        try:
            config = INDIKATOR_KESEHATAN[indikator_key]
            
            # Format URL BPS API untuk data (model=data)
            url = f"{self.bps_base_url}/model/data/domain/{provinsi_code}/var/{config['variable_id']}/key/{BPS_API_KEY}/"
            
            print(f"Fetching: {url}")
            response = requests.get(url, timeout=20)
            
            if response.status_code == 200:
                data = response.json()
                
                # Debug: print response structure
                print(f"Response for {indikator_key}: {data.get('status')}")
                
                if data.get("status") == "OK" and "datacontent" in data:
                    datacontent = data["datacontent"]
                    
                    if isinstance(datacontent, dict) and len(datacontent) > 0:
                        # Ambil nilai pertama (data terbaru)
                        first_value = list(datacontent.values())[0]
                        if first_value is not None:
                            return float(first_value)
                
                # Jika datacontent kosong, coba cari di structure lain
                if "data" in data:
                    data_list = data["data"]
                    if isinstance(data_list, list) and len(data_list) > 1:
                        items = data_list[1]
                        if isinstance(items, list) and len(items) > 0:
                            # Coba ambil nilai dari item pertama
                            item = items[0]
                            if isinstance(item, dict):
                                value = item.get("value") or item.get("val")
                                if value is not None:
                                    return float(value)
            
            return None
            
        except Exception as e:
            print(f"Error fetching BPS data for {indikator_key}: {e}")
            return None
    
    def generate_synthetic_data(self, provinsi_name, indikator_key):
        """Generate data sintetis berdasarkan pola regional (fallback)"""
        import hashlib
        
        config = INDIKATOR_KESEHATAN[indikator_key]
        
        # Seed berdasarkan nama provinsi untuk konsistensi
        seed = int(hashlib.md5(provinsi_name.encode()).hexdigest(), 16) % 10000
        np.random.seed(seed)
        
        # Generate nilai di sekitar threshold
        if indikator_key == "AKB":
            # AKB: 15-35
            base_value = np.random.uniform(15, 35)
        elif indikator_key == "STUNTING":
            # Stunting: 15-35%
            base_value = np.random.uniform(15, 35)
        elif indikator_key == "TB":
            # TB: 100-300
            base_value = np.random.uniform(100, 300)
        else:
            base_value = None
        
        return round(base_value, 2) if base_value else None
    
    def calculate_health_index(self, data_kesehatan):
        """Hitung Indeks Kesehatan Komposit (IKK)"""
        total_score = 0
        total_weight = 0
        
        for key, value in data_kesehatan.items():
            if value is None:
                continue
            
            config = INDIKATOR_KESEHATAN.get(key)
            if not config:
                continue
            
            # Normalisasi skor (0-100)
            if config.get("reverse", False):  # Lower is better
                if value <= config["threshold_baik"]:
                    score = 100
                elif value <= config["threshold_sedang"]:
                    score = 70
                else:
                    score = 40
            else:  # Higher is better
                if value >= config["threshold_baik"]:
                    score = 100
                elif value >= config["threshold_sedang"]:
                    score = 70
                else:
                    score = 40
            
            total_score += score * config["bobot"]
            total_weight += config["bobot"]
        
        return round(total_score / total_weight if total_weight > 0 else 0, 2)
    
    def categorize_province(self, health_index):
        """Kategorikan provinsi berdasarkan Indeks Kesehatan"""
        if health_index >= 80:
            return "STABIL", health_index
        elif health_index >= 60:
            return "WASPADA", health_index
        else:
            return "KRITIS", health_index
    
    def generate_insights(self, provinsi, data_kesehatan, kategori, health_index):
        """Generate insight berdasarkan data kesehatan"""
        insights = []
        
        # Insight utama
        if kategori == "KRITIS":
            insights.append(f"⚠️ {provinsi} dalam kondisi KRITIS - Indeks Kesehatan: {health_index}")
            insights.append("Memerlukan intervensi darurat di sektor kesehatan")
        elif kategori == "WASPADA":
            insights.append(f"📊 {provinsi} dalam kondisi WASPADA - Indeks Kesehatan: {health_index}")
            insights.append("Perlu penguatan program kesehatan preventif")
        else:
            insights.append(f"✅ {provinsi} dalam kondisi STABIL - Indeks Kesehatan: {health_index}")
            insights.append("Pertahankan kualitas layanan kesehatan")
        
        # Insight per indikator
        for key, value in data_kesehatan.items():
            if value is None:
                continue
            
            config = INDIKATOR_KESEHATAN.get(key)
            if not config:
                continue
            
            nama = config["nama"]
            satuan = config["satuan"]
            
            if key == "AKB":
                if value > config["threshold_sedang"]:
                    insights.append(f"🚨 {nama}: {value} {satuan} - TINGGI (Target: <{config['threshold_baik']})")
                elif value > config["threshold_baik"]:
                    insights.append(f"⚠️ {nama}: {value} {satuan} - Perlu perbaikan")
                else:
                    insights.append(f"✅ {nama}: {value} {satuan} - Memenuhi target")
            
            elif key == "STUNTING":
                if value > config["threshold_sedang"]:
                    insights.append(f"🚨 Stunting: {value}% - TINGGI (Target: <{config['threshold_baik']}%)")
                elif value > config["threshold_baik"]:
                    insights.append(f"⚠️ Stunting: {value}% - Perlu intervensi gizi")
                else:
                    insights.append(f"✅ Stunting: {value}% - Terkendali")
            
            elif key == "TB":
                if value > config["threshold_sedang"]:
                    insights.append(f"🚨 {nama}: {value} {satuan} - TINGGI (Target: <{config['threshold_baik']})")
                elif value > config["threshold_baik"]:
                    insights.append(f"⚠️ {nama}: {value} {satuan} - Perlu penguatan program TB")
                else:
                    insights.append(f"✅ {nama}: {value} {satuan} - Terkendali")
        
        return insights
    
    def generate_recommendations(self, kategori, data_kesehatan):
        """Generate rekomendasi kebijakan kesehatan"""
        recommendations = []
        
        # Rekomendasi berdasarkan kategori
        if kategori == "KRITIS":
            recommendations.append({
                'priority': 'Darurat',
                'title': 'Intervensi Segera Diperlukan',
                'actions': [
                    'Alokasi anggaran darurat untuk perbaikan infrastruktur kesehatan',
                    'Penambahan tenaga kesehatan melalui program penugasan khusus',
                    'Program bantuan kesehatan gratis untuk kelompok rentan',
                    'Pembangunan puskesmas dan posyandu di daerah terpencil',
                    'Kampanye kesehatan ibu dan anak secara masif'
                ]
            })
        elif kategori == "WASPADA":
            recommendations.append({
                'priority': 'Tinggi',
                'title': 'Penguatan Sistem Kesehatan',
                'actions': [
                    'Optimalisasi BPJS Kesehatan dan JKN-KIS',
                    'Peningkatan kualitas layanan puskesmas dan rumah sakit',
                    'Program pencegahan stunting terintegrasi',
                    'Pelatihan dan sertifikasi tenaga kesehatan',
                    'Pengadaan alat kesehatan dan obat-obatan esensial'
                ]
            })
        else:
            recommendations.append({
                'priority': 'Pemeliharaan',
                'title': 'Inovasi & Peningkatan Kualitas',
                'actions': [
                    'Digitalisasi layanan kesehatan (telemedicine)',
                    'Program kesehatan preventif berbasis komunitas',
                    'Riset dan pengembangan kesehatan lokal',
                    'Kemitraan dengan rumah sakit swasta',
                    'Peningkatan sistem rujukan berjenjang'
                ]
            })
        
        # Rekomendasi spesifik per indikator
        akb = data_kesehatan.get("AKB")
        if akb and akb > INDIKATOR_KESEHATAN["AKB"]["threshold_sedang"]:
            recommendations.append({
                'priority': 'Khusus - AKB',
                'title': 'Program Penyelamatan Bayi',
                'actions': [
                    'Penguatan pelayanan kesehatan ibu dan bayi',
                    'Program edukasi perawatan bayi baru lahir',
                    'Penyediaan inkubator dan peralatan neonatal',
                    'Pelatihan bidan dan perawat neonatal'
                ]
            })
        
        stunting = data_kesehatan.get("STUNTING")
        if stunting and stunting > INDIKATOR_KESEHATAN["STUNTING"]["threshold_sedang"]:
            recommendations.append({
                'priority': 'Khusus - Stunting',
                'title': 'Percepatan Penurunan Stunting',
                'actions': [
                    'Pemberian makanan tambahan (PMT) untuk balita',
                    'Edukasi gizi ibu hamil dan menyusui',
                    'Monitoring tumbuh kembang balita rutin',
                    'Program 1000 Hari Pertama Kehidupan (HPK)',
                    'Pemberdayaan kader posyandu'
                ]
            })
        
        tb = data_kesehatan.get("TB")
        if tb and tb > INDIKATOR_KESEHATAN["TB"]["threshold_sedang"]:
            recommendations.append({
                'priority': 'Khusus - Tuberkulosis',
                'title': 'Pengendalian Tuberkulosis',
                'actions': [
                    'Program DOTS (Directly Observed Treatment Shortcourse)',
                    'Skrining TB massal di wilayah endemis',
                    'Penyediaan obat TB gratis dan berkelanjutan',
                    'Edukasi pencegahan TB kepada masyarakat',
                    'Peningkatan kapasitas laboratorium TB'
                ]
            })
        
        return recommendations


# KODE PROVINSI BPS (38 Provinsi - Updated 2024)
KODE_PROVINSI_BPS = {
    "ACEH": "11",
    "SUMATERA UTARA": "12",
    "SUMATERA BARAT": "13",
    "RIAU": "14",
    "JAMBI": "15",
    "SUMATERA SELATAN": "16",
    "BENGKULU": "17",
    "LAMPUNG": "18",
    "KEPULAUAN BANGKA BELITUNG": "19",
    "KEPULAUAN RIAU": "21",
    "DAERAH KHUSUS IBUKOTA JAKARTA": "31",  # DKI Jakarta
    "JAWA BARAT": "32",
    "JAWA TENGAH": "33",
    "DAERAH ISTIMEWA YOGYAKARTA": "34",
    "JAWA TIMUR": "35",
    "BANTEN": "36",
    "BALI": "51",
    "NUSA TENGGARA BARAT": "52",
    "NUSA TENGGARA TIMUR": "53",
    "KALIMANTAN BARAT": "61",
    "KALIMANTAN TENGAH": "62",
    "KALIMANTAN SELATAN": "63",
    "KALIMANTAN TIMUR": "64",
    "KALIMANTAN UTARA": "65",
    "SULAWESI UTARA": "71",
    "SULAWESI TENGAH": "72",
    "SULAWESI SELATAN": "73",
    "SULAWESI TENGGARA": "74",
    "GORONTALO": "75",
    "SULAWESI BARAT": "76",
    "MALUKU": "81",
    "MALUKU UTARA": "82",
    "PAPUA BARAT": "91",
    "PAPUA": "94",
    "PAPUA PEGUNUNGAN": "94",  
    "PAPUA TENGAH": "94",      
    "PAPUA SELATAN": "94",     
    "PAPUA BARAT DAYA": "91"
}


def normalize_province_name(name):
    """Normalisasi nama provinsi untuk matching dengan kode BPS"""
    if not isinstance(name, str):
        name = str(name)
    
    name = name.upper().strip()
    
    # Mapping khusus untuk nama yang sering berbeda
    special_mappings = {
        'DKI JAKARTA': 'DAERAH KHUSUS IBUKOTA JAKARTA',
        'JAKARTA': 'DAERAH KHUSUS IBUKOTA JAKARTA',
        'DIY': 'DAERAH ISTIMEWA YOGYAKARTA',
        'YOGYAKARTA': 'DAERAH ISTIMEWA YOGYAKARTA',
    }
    
    if name in special_mappings:
        return special_mappings[name]
    
    # Singkatan umum
    abbreviations = {
        'KEP.': 'KEPULAUAN',
        'DI': 'DAERAH ISTIMEWA',
        'DKI': 'DAERAH KHUSUS IBUKOTA',
        'NTB': 'NUSA TENGGARA BARAT',
        'NTT': 'NUSA TENGGARA TIMUR',
        'KALBAR': 'KALIMANTAN BARAT',
        'KALTENG': 'KALIMANTAN TENGAH',
        'KALSEL': 'KALIMANTAN SELATAN',
        'KALTIM': 'KALIMANTAN TIMUR',
        'KALTARA': 'KALIMANTAN UTARA',
        'SULUT': 'SULAWESI UTARA',
        'SULTENG': 'SULAWESI TENGAH',
        'SULSEL': 'SULAWESI SELATAN',
        'SULTRA': 'SULAWESI TENGGARA',
        'SULBAR': 'SULAWESI BARAT'
    }
    
    for abbr, full in abbreviations.items():
        if name == abbr or name.startswith(abbr):
            name = name.replace(abbr, full)
    
    # Hapus prefix
    prefixes = ['PROVINSI ', 'PROV. ', 'PROV ']
    for prefix in prefixes:
        if name.startswith(prefix):
            name = name[len(prefix):]
    
    return name.strip()


@api_view(['POST'])
def analyze_health_bps(request):
    """Analisis data kesehatan menggunakan BPS Web API dengan fallback ke data sintetis"""
    
    if not BPS_API_KEY:
        return Response({
            "error": "BPS Web API Key belum dikonfigurasi",
            "message": "Silakan tambahkan BPS_WEB_API_KEY di file .env"
        }, status=500)
    
    try:
        # Ambil daftar provinsi yang akan dianalisis
        provinces_to_analyze = request.data.get('provinces', 'ALL')
        
        # Jika ALL, analisis semua provinsi
        if provinces_to_analyze == 'ALL':
            provinces_list = list(KODE_PROVINSI_BPS.keys())
        else:
            provinces_list = [normalize_province_name(p) for p in provinces_to_analyze]
        
        # Ambil data batas provinsi dari MongoDB
        cursor = mongo_db["batas_provinsi"].find({}, {'_id': 0})
        boundary_features = list(cursor)
        
        # Buat mapping nama provinsi
        province_map = {}
        for feature in boundary_features:
            props = feature.get('properties', {})
            for field in ['name', 'NAMOBJ', 'WADMPR', 'Provinsi']:
                if field in props and props[field]:
                    official_name = str(props[field]).upper().strip()
                    normalized = normalize_province_name(official_name)
                    province_map[normalized] = feature
        
        # Inisialisasi analytics
        analytics = KesehatanAnalytics()
        
        # Proses analisis
        matched_features = []
        analysis_summary = []
        kategori_counts = {"KRITIS": 0, "WASPADA": 0, "STABIL": 0}
        
        # Dataset untuk download
        datasets = {
            "AKB": [],
            "STUNTING": [],
            "TB": []
        }
        
        total_attempted = 0
        total_success = 0
        total_api_success = 0
        total_synthetic = 0
        
        print(f"Sedang mengambil data dari BPS untuk {len(provinces_list)} provinsi...")
        
        for prov_name in provinces_list:
            total_attempted += 1
            
            # Cari kode BPS
            bps_code = KODE_PROVINSI_BPS.get(prov_name)
            if not bps_code:
                print(f"Kode BPS tidak ditemukan untuk: {prov_name}")
                continue
            
            # Fetch data dari BPS untuk setiap indikator
            data_kesehatan = {}
            api_success_count = 0
            
            print(f"\nFetching data untuk {prov_name} (kode: {bps_code})...")
            
            for indikator_key in INDIKATOR_KESEHATAN.keys():
                # Coba fetch dari BPS API
                value = analytics.fetch_bps_data(bps_code, indikator_key)
                
                is_synthetic = False
                # Jika gagal, gunakan data sintetis
                if value is None:
                    value = analytics.generate_synthetic_data(prov_name, indikator_key)
                    is_synthetic = True
                    print(f"  - {indikator_key}: {value} (sintetis)")
                else:
                    api_success_count += 1
                    print(f"  - {indikator_key}: {value} (BPS API)")
                
                data_kesehatan[indikator_key] = value
                
                # Simpan untuk dataset download
                datasets[indikator_key].append({
                    'provinsi': prov_name,
                    'kode_bps': bps_code,
                    'nilai': value,
                    'satuan': INDIKATOR_KESEHATAN[indikator_key]['satuan'],
                    'sumber': 'Sintetis' if is_synthetic else 'BPS API'
                })
            
            # Hitung statistik
            if api_success_count > 0:
                total_api_success += 1
            if api_success_count < len(INDIKATOR_KESEHATAN):
                total_synthetic += 1
            
            # Skip jika tidak ada data sama sekali
            if not any(v is not None for v in data_kesehatan.values()):
                print(f"Tidak ada data untuk {prov_name}, skip...")
                continue
            
            # Cari matching boundary
            matched_feature = province_map.get(prov_name)
            if not matched_feature:
                # Coba partial match
                for map_name, feature in province_map.items():
                    if prov_name in map_name or map_name in prov_name:
                        matched_feature = feature
                        break
            
            if not matched_feature:
                print(f"Boundary tidak ditemukan untuk: {prov_name}")
                continue
            
            # Hitung indeks kesehatan
            health_index = analytics.calculate_health_index(data_kesehatan)
            kategori, _ = analytics.categorize_province(health_index)
            warna = analytics.colors[kategori]
            
            # Generate insights & recommendations
            insights = analytics.generate_insights(prov_name, data_kesehatan, kategori, health_index)
            recommendations = analytics.generate_recommendations(kategori, data_kesehatan)
            
            # Update counts
            kategori_counts[kategori] += 1
            total_success += 1
            
            # Tambahkan ke feature
            feature_copy = matched_feature.copy()
            props = feature_copy.get('properties', {})
            
            props['health_analysis'] = {
                'nama_provinsi': prov_name,
                'kode_bps': bps_code,
                'kategori': kategori,
                'warna': warna,
                'health_index': health_index,
                'insights': insights,
                'rekomendasi': recommendations,
                'data_kesehatan': data_kesehatan
            }
            
            feature_copy['properties'] = props
            matched_features.append(feature_copy)
            
            # Tambahkan ke summary
            analysis_summary.append({
                'provinsi': prov_name,
                'kode_bps': bps_code,
                'kategori': kategori,
                'warna': warna,
                'health_index': health_index,
                'akb': data_kesehatan.get('AKB'),
                'stunting': data_kesehatan.get('STUNTING'),
                'tb': data_kesehatan.get('TB'),
                'matched': True
            })
        
        # Generate rekomendasi nasional
        national_recommendations = []
        
        if kategori_counts['KRITIS'] > 0:
            national_recommendations.append({
                'priority': 'Darurat',
                'title': 'Fokus Provinsi Kritis',
                'content': f'Terdapat {kategori_counts["KRITIS"]} provinsi dalam kondisi KRITIS yang memerlukan intervensi segera.',
                'actions': [
                    'Alokasi dana darurat kesehatan untuk provinsi kritis',
                    'Task force kesehatan nasional',
                    'Mobilisasi tenaga kesehatan lintas provinsi'
                ]
            })
        
        if kategori_counts['WASPADA'] > 0:
            national_recommendations.append({
                'priority': 'Tinggi',
                'title': 'Penguatan Provinsi Waspada',
                'content': f'Terdapat {kategori_counts["WASPADA"]} provinsi dalam kondisi WASPADA.',
                'actions': [
                    'Program preventif kesehatan masyarakat',
                    'Monitoring dan evaluasi berkala',
                    'Penguatan sistem kesehatan primer'
                ]
            })
        
        # Cari provinsi dengan kondisi terburuk
        sorted_by_index = sorted(
            [s for s in analysis_summary if s['health_index'] is not None],
            key=lambda x: x['health_index']
        )[:5]
        
        return Response({
            'status': 'success',
            'source': f'BPS Web API ({total_api_success} provinsi) + Data Sintetis ({total_synthetic} provinsi)',
            'total_attempted': total_attempted,
            'total_success': total_success,
            'total_api_success': total_api_success,
            'total_synthetic': total_synthetic,
            'success_rate': f"{total_success}/{total_attempted}",
            'kategori_distribusi': kategori_counts,
            'matched_features': {
                "type": "FeatureCollection",
                "features": matched_features
            },
            'analysis_summary': analysis_summary,
            'national_recommendations': national_recommendations,
            'worst_provinces': sorted_by_index,
            'colors': analytics.colors,
            'indikator_info': {k: {
                'nama': v['nama'],
                'satuan': v['satuan']
            } for k, v in INDIKATOR_KESEHATAN.items()},
            'datasets': datasets,  # Dataset untuk download
            'methodology': {
                'formula': 'Indeks Kesehatan = (Skor_AKB × 0.4) + (Skor_STUNTING × 0.3) + (Skor_TB × 0.3)',
                'scoring': {
                    'AKB': {
                        'baik': '≤ 20 → Skor 100',
                        'sedang': '20-30 → Skor 70',
                        'buruk': '> 30 → Skor 40'
                    },
                    'STUNTING': {
                        'baik': '≤ 20% → Skor 100',
                        'sedang': '20-30% → Skor 70',
                        'buruk': '> 30% → Skor 40'
                    },
                    'TB': {
                        'baik': '≤ 150 → Skor 100',
                        'sedang': '150-250 → Skor 70',
                        'buruk': '> 250 → Skor 40'
                    }
                },
                'category': {
                    'STABIL': 'Indeks ≥ 80',
                    'WASPADA': 'Indeks 60-79',
                    'KRITIS': 'Indeks < 60'
                }
            }
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
def save_health_analysis(request):
    """Simpan hasil analisis kesehatan"""
    try:
        data = request.data
        analysis_name = data.get('name', 'Analisis Kesehatan Tanpa Nama')
        analysis_data = data.get('analysis_data')
        
        if not analysis_data:
            return Response({"error": "Data analisis tidak ditemukan"}, status=400)
        
        # Generate ID
        analysis_id = str(uuid.uuid4())
        
        # Siapkan dokumen
        document = {
            "analysis_id": analysis_id,
            "name": analysis_name,
            "type": "health",
            "timestamp": datetime.now().isoformat(),
            "status": analysis_data.get('status'),
            "source": analysis_data.get('source'),
            "total_attempted": analysis_data.get('total_attempted'),
            "total_success": analysis_data.get('total_success'),
            "success_rate": analysis_data.get('success_rate'),
            "kategori_distribusi": analysis_data.get('kategori_distribusi'),
            "matched_features": analysis_data.get('matched_features'),
            "analysis_summary": analysis_data.get('analysis_summary'),
            "national_recommendations": analysis_data.get('national_recommendations'),
            "worst_provinces": analysis_data.get('worst_provinces'),
            "colors": analysis_data.get('colors'),
            "indikator_info": analysis_data.get('indikator_info')
        }
        
        # Simpan ke MongoDB
        mongo_db["health_analysis"].insert_one(document)
        
        return Response({
            "status": "success",
            "message": f"Analisis kesehatan '{analysis_name}' berhasil disimpan",
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
def get_health_analysis_list(request):
    """Get list semua analisis kesehatan"""
    try:
        cursor = mongo_db["health_analysis"].find(
            {},
            {
                '_id': 0,
                'analysis_id': 1,
                'name': 1,
                'timestamp': 1,
                'total_success': 1,
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
def get_health_analysis_detail(request, analysis_id):
    """Get detail analisis kesehatan"""
    try:
        result = mongo_db["health_analysis"].find_one(
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
def delete_health_analysis(request, analysis_id):
    """Hapus analisis kesehatan"""
    try:
        result = mongo_db["health_analysis"].delete_one(
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