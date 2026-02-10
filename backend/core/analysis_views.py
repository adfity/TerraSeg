from rest_framework.decorators import api_view
from rest_framework.response import Response
from pymongo import MongoClient
import uuid
import pandas as pd
import numpy as np
import io
from datetime import datetime
import os
from dotenv import load_dotenv
import random

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_MONGO_NAME = os.getenv("DB_MONGO_NAME")

# Koneksi MongoDB
client = MongoClient(MONGO_URI)
mongo_db = client[DB_MONGO_NAME]


# MODEL ANALISIS SEDERHANA
class PendidikanAnalytics:
    """Model analisis pendidikan dengan Dynamic Recommendation Engine dan Bank Data Luas"""
    
    def __init__(self):
        # Warna identitas kategori
        self.colors = {
            "RENDAH": "#d73027",    # Merah
            "SEDANG": "#fee08b",    # Kuning
            "TINGGI": "#1a9850"     # Hijau
        }
        
        # Bobot untuk perhitungan WERI (Weighted Education Risk Index)
        self.weights = {
            'SD': 0.25,   # 7-12 tahun
            'SMP': 0.30,  # 13-15 tahun
            'SMA': 0.30,  # 16-18 tahun
            'PT': 0.15    # 19-23 tahun
        }

        # Bank Kebijakan Luas (Database Tindakan Strategis)
        self.action_pool = {
            "KRITIS_SD": [
                "Akselerasi Program Indonesia Pintar (PIP) Afirmasi untuk menekan angka putus sekolah usia dini",
                "Mobilisasi Dana Alokasi Khusus (DAK) Fisik untuk rehabilitasi total ruang kelas rusak berat",
                "Penyediaan moda transportasi sekolah daerah terpencil guna meningkatkan aksesibilitas wilayah",
                "Optimalisasi distribusi buku teks utama dan alat peraga edukatif berbasis standar SPM",
                "Penguatan program gizi tambahan sekolah untuk meningkatkan fokus dan kehadiran siswa",
                "Inisiasi kelas rintisan berbasis komunitas di wilayah dengan jarak geografis ekstrem",
                "Audit integrasi Data Pokok Pendidikan (DAPODIK) untuk validasi bantuan siswa miskin",
                "Peningkatan rasio guru-murid melalui redistribusi tenaga pendidik ke wilayah pinggiran"
            ],
            "KRITIS_SMP": [
                "Penguatan kampanye Wajib Belajar 12 Tahun melalui kolaborasi lintas sektoral dan tokoh masyarakat",
                "Pemberian insentif transisi pendidikan bagi lulusan SD dari keluarga penerima manfaat (KIP)",
                "Pembangunan Unit Sekolah Baru (USB) di zonasi blankspot untuk pemerataan jangkauan layanan",
                "Audit periodik data ATS (Anak Tidak Sekolah) untuk intervensi bantuan sosial tepat sasaran",
                "Program pendampingan psikososial dan bimbingan karir dini bagi siswa menengah pertama",
                "Ekspansi pusat kegiatan belajar masyarakat (PKBM) untuk layanan pendidikan non-formal berkualitas",
                "Optimalisasi bantuan operasional sekolah (BOS) untuk penguatan kegiatan ekstrakurikuler",
                "Implementasi kurikulum berbasis literasi digital untuk adaptasi teknologi sejak dini"
            ],
            "KRITIS_SMA": [
                "Revitalisasi Pendidikan Vokasi (SMK) melalui program Link and Match dengan industri strategis",
                "Pemberian subsidi biaya praktik dan sertifikasi kompetensi bagi siswa menengah kejuruan",
                "Transformasi kurikulum berbasis potensi ekonomi lokal guna meningkatkan daya saing lulusan",
                "Pembangunan asrama sekolah di wilayah dengan topografi sulit untuk meminimalkan hambatan geografis",
                "Program beasiswa khusus untuk jurusan sains dan teknologi di tingkat menengah atas",
                "Kemitraan dengan balai latihan kerja (BLK) untuk penguatan ketrampilan teknis siswa",
                "Penyediaan laboratorium TIK standar industri untuk mendukung pembelajaran berbasis proyek",
                "Skema bantuan biaya pendidikan mandiri bagi siswa di luar jangkauan bantuan pusat"
            ],
            "KRITIS_PT": [
                "Ekspansi kuota Beasiswa KIP-Kuliah untuk peningkatan APK Pendidikan Tinggi",
                "Kemitraan Perguruan Tinggi dengan BUMD dalam program magang dan penyerapan tenaga kerja lokal",
                "Inisiasi pusat inovasi dan inkubasi wirausaha digital tingkat kampus untuk mendorong ekonomi kreatif",
                "Sosialisasi skema bantuan dana pendidikan tingkat lanjut bagi masyarakat berpenghasilan rendah",
                "Penyelarasan program studi universitas dengan proyeksi kebutuhan industri 5 tahun kedepan",
                "Penyediaan hibah riset terapan bagi mahasiswa untuk penyelesaian masalah pembangunan daerah",
                "Penguatan jaring pengaman alumni (Alumni Network) untuk akses lapangan kerja perdana",
                "Pemberian bantuan biaya hidup bagi mahasiswa berprestasi dari wilayah tertinggal"
            ],
            "UMUM_RENDAH": [
                "Pemenuhan kuota tenaga pendidik melalui skema PPPK dengan prioritas penempatan wilayah 3T",
                "Digitalisasi pendidikan melalui pengadaan bantuan perangkat TIK dan akses internet sekolah",
                "Peningkatan alokasi belanja fungsi pendidikan daerah untuk pemenuhan Standar Pelayanan Minimal",
                "Penyediaan tunjangan kemahalan bagi guru yang bertugas di lokasi geografis sulit",
                "Program percepatan sertifikasi guru guna meningkatkan kualitas instruksional di kelas",
                "Pembangunan sarana sanitasi dan air bersih sekolah untuk mendukung lingkungan belajar sehat"
            ],
            "UMUM_SEDANG": [
                "Penguatan kompetensi manajerial kepala sekolah melalui Program Sekolah Penggerak",
                "Integrasi Platform Merdeka Mengajar (PMM) dalam pengembangan modul ajar berbasis kearifan lokal",
                "Optimalisasi Dana BOS Kinerja untuk mendukung program literasi dan numerasi tingkat wilayah",
                "Implementasi asesmen nasional sebagai basis evaluasi dan pembenahan kualitas sekolah",
                "Peningkatan kerjasama sekolah dengan komite pendidikan untuk transparansi anggaran",
                "Pengembangan komunitas praktisi guru sebagai wadah pertukaran metode ajar inovatif"
            ],
            "UMUM_TINGGI": [
                "Pengembangan pusat keunggulan (Center of Excellence) dan kolaborasi akademik internasional",
                "Inisiasi program transformasi digital pendidikan berbasis kecerdasan buatan (AI) dan STEM",
                "Pemberian penghargaan dan beasiswa riset bagi talenta daerah berprestasi tingkat nasional",
                "Implementasi kurikulum berbasis talenta global (Global Talent) di sekolah-sekolah unggulan",
                "Fasilitasi program pertukaran pelajar antar negara untuk penguatan wawasan global",
                "Penyediaan dana abadi pendidikan tingkat daerah untuk mendukung inovasi berkelanjutan"
            ]
        }

    def calculate_pgi(self, aps_value):
        """Hitung Participation Gap Index (PGI)"""
        if aps_value is None or pd.isna(aps_value):
            return None
        return round(100 - aps_value, 2)

    def calculate_weri(self, aps_data):
        """Hitung Weighted Education Risk Index (WERI)"""
        weri = 0
        total_weight = 0
        jenjang_mapping = {
            'APS_7_12': 'SD', 'APS_13_15': 'SMP', 
            'APS_16_18': 'SMA', 'APS_19_23': 'PT'
        }
        
        for aps_key, jenjang in jenjang_mapping.items():
            if aps_key in aps_data and aps_data[aps_key] is not None:
                pgi = self.calculate_pgi(aps_data[aps_key])
                if pgi is not None:
                    weri += self.weights[jenjang] * pgi
                    total_weight += self.weights[jenjang]
        
        return round(weri / total_weight if total_weight > 0 else 0, 2)

    def categorize_province(self, aps_data):
        """Kategorikan provinsi berdasarkan rata-rata APS"""
        keys = ['APS_7_12', 'APS_13_15', 'APS_16_18', 'APS_19_23']
        aps_values = [aps_data.get(k) for k in keys if aps_data.get(k) is not None]
        
        if not aps_values:
            return "SEDANG", 0
        
        avg_aps = sum(aps_values) / len(aps_values)
        if avg_aps >= 85:
            return "TINGGI", avg_aps
        elif avg_aps >= 70:
            return "SEDANG", avg_aps
        else:
            return "RENDAH", avg_aps

    def generate_recommendations(self, kategori, aps_data):
        """Generate Dynamic Recommendations berdasarkan skor aktual vs target"""
        recommendations = []
        
        # Mapping target ideal per jenjang
        targets = {'SD': 95, 'SMP': 85, 'SMA': 75, 'Pendidikan Tinggi': 35}
        
        # Identifikasi Bottleneck (jenjang dengan performa terendah)
        jenjang_status = [
            (aps_data.get('APS_7_12', 100), 'SD', 'KRITIS_SD'),
            (aps_data.get('APS_13_15', 100), 'SMP', 'KRITIS_SMP'),
            (aps_data.get('APS_16_18', 100), 'SMA', 'KRITIS_SMA'),
            (aps_data.get('APS_19_23', 100), 'Pendidikan Tinggi', 'KRITIS_PT'),
        ]
        
        # Urutkan untuk mencari skor paling rendah
        jenjang_status.sort(key=lambda x: x[0]) 
        skor_aktual, label_jenjang, key_pool = jenjang_status[0]

        target_ideal = targets.get(label_jenjang, 80)
        
        # Penentuan Judul & Prioritas
        if skor_aktual < target_ideal:
            judul_strategis = f"Penguatan {label_jenjang}"
            prioritas = "Tinggi" if kategori == "RENDAH" else "Sedang"
        else:
            judul_strategis = f"Optimasi & Inovasi {label_jenjang}"
            prioritas = "Rendah"

        # Pengambilan Aksi secara Dinamis (Dua dari bank spesifik jenjang, Dua dari bank umum kategori)
        try:
            actions = random.sample(self.action_pool[key_pool], 2)
            key_umum = f"UMUM_{kategori}"
            actions.extend(random.sample(self.action_pool[key_umum], 2))
        except (ValueError, KeyError):
            # Fallback jika data tidak cukup untuk di-sample
            actions = ["Lanjutkan monitoring partisipasi sekolah", "Optimasi anggaran pendidikan daerah"]

        recommendations.append({
            'priority': prioritas,
            'title': f'Fokus Strategis: {judul_strategis}',
            'actions': actions
        })

        # Logika Intervensi Darurat untuk skor sangat rendah
        if skor_aktual < 60:
            recommendations.append({
                'priority': 'Darurat',
                'title': 'Intervensi Sosio-Kultural',
                'actions': [
                    f"Mengingat angka partisipasi {label_jenjang} hanya {skor_aktual:.1f}%, perlu investigasi mendalam terkait hambatan ekonomi lokal.",
                    "Audit distribusi bantuan sosial pendidikan agar lebih tepat sasaran di wilayah ini."
                ]
            })

        return recommendations

    def generate_insights(self, provinsi, aps_data, kategori, avg_aps):
        """Generate insight profesional dengan gaya bahasa variatif"""
        prefixes = [
            f"Analisis untuk {provinsi} menunjukkan",
            f"Berdasarkan data terbaru, wilayah {provinsi}",
            f"Catatan strategis untuk {provinsi}:",
            f"Performa pendidikan di {provinsi}"
        ]
        
        insights = [f"{random.choice(prefixes)} berada pada kategori {kategori} dengan rerata indeks {avg_aps:.1f}%."]
        
        # Cek anomali spesifik pada jenjang menengah
        sma_val = aps_data.get('APS_16_18', 100)
        if sma_val is not None and sma_val < 70:
            insights.append(f"⚠️ Perhatian khusus diperlukan pada jenjang SMA/SMK ({sma_val:.1f}%) yang berada di bawah ambang batas kritis.")
        
        # Analisis Risiko WERI
        weri = self.calculate_weri(aps_data)
        if weri > 25:
            insights.append(f"📉 Skor Risiko Pendidikan ({weri:.1f}) mengindikasikan perlunya akselerasi kebijakan jangka pendek.")
        elif weri < 15:
            insights.append(f"✅ Wilayah ini memiliki stabilitas pendidikan yang baik dengan skor risiko rendah ({weri:.1f}).")
            
        return insights


# HELPER FUNCTIONS
def normalize_name(name):
    """Normalisasi nama provinsi"""
    if not isinstance(name, str):
        name = str(name)
    
    name = name.upper().strip()
    
    # Singkatan umum
    abbreviations = {
        'KEP.': 'KEPULAUAN',
        'DIY': 'DAERAH ISTIMEWA YOGYAKARTA',
        'DI': 'DAERAH ISTIMEWA',
        'DKI': 'DAERAH KHUSUS IBUKOTA JAKARTA',
        'JATIM': 'JAWA TIMUR',
        'JATENG': 'JAWA TENGAH',
        'JABAR': 'JAWA BARAT',
        'NTB': 'NUSA TENGGARA BARAT',
        'NTT': 'NUSA TENGGARA TIMUR',
        'KALBAR': 'KALIMANTAN BARAT',
        'KALTENG': 'KALIMANTAN TENGAH'
    }
    
    for abbr, full in abbreviations.items():
        if name == abbr or name.startswith(abbr):
            name = name.replace(abbr, full)
    
    # Hapus prefix
    prefixes = ['PROVINSI ', 'KAB. ', 'KABUPATEN ', 'KOTA ']
    for prefix in prefixes:
        if name.startswith(prefix):
            name = name[len(prefix):]
    
    return name.strip()


def read_file_to_dataframe(file):
    """Baca file CSV atau XLSX menjadi DataFrame"""
    filename = file.name.lower()
    
    if filename.endswith('.xlsx') or filename.endswith('.xls'):
        # Baca Excel
        df = pd.read_excel(file)
    elif filename.endswith('.csv'):
        # Baca CSV dengan deteksi separator
        content = file.read().decode('utf-8-sig')
        for sep in [',', ';', '\t']:
            try:
                df = pd.read_csv(io.StringIO(content), sep=sep)
                if len(df.columns) > 1:
                    break
            except:
                continue
    else:
        raise ValueError("Format file tidak didukung. Gunakan CSV atau XLSX")
    
    return df


# MAIN ANALYSIS API
@api_view(['POST'])
def analyze_aps_csv(request):
    """Analisis CSV/XLSX APS - TIDAK AUTO SAVE"""
    file = request.FILES.get('csv_file') or request.FILES.get('file')
    
    if not file:
        return Response({"error": "File tidak ditemukan"}, status=400)
    
    try:
        # Baca file (support CSV & XLSX)
        df = read_file_to_dataframe(file)
        
        if len(df.columns) < 2:
            return Response({"error": "Format file tidak valid"}, status=400)
        
        # Standarisasi kolom
        df.columns = [str(col).strip().upper() for col in df.columns]
        
        # Cari kolom provinsi
        prov_col = None
        for col in df.columns:
            if any(kw in col for kw in ['PROVINSI', 'PROV', 'DAERAH', 'NAMA', 'WILAYAH']):
                prov_col = col
                break
        
        if prov_col is None:
            prov_col = df.columns[0]
        
        # Identifikasi kolom APS
        aps_cols = {}
        patterns = {
            'APS_7_12': ['7-12', '7/12', '7_12', 'SD', '7 12'],
            'APS_13_15': ['13-15', '13/15', '13_15', 'SMP', '13 15'],
            'APS_16_18': ['16-18', '16/18', '16_18', 'SMA', '16 18'],
            'APS_19_23': ['19-23', '19/23', '19_23', 'PT', '19 23', 'PERGURUAN']
        }
        
        for target, patterns_list in patterns.items():
            for col in df.columns:
                col_upper = str(col).upper()
                for pattern in patterns_list:
                    if pattern.upper() in col_upper:
                        aps_cols[target] = col
                        break
                if target in aps_cols:
                    break
        
        # Jika tidak ditemukan, asumsikan kolom 2-5 adalah APS
        if len(aps_cols) < 2 and len(df.columns) >= 5:
            default_cols = ['APS_7_12', 'APS_13_15', 'APS_16_18', 'APS_19_23']
            for i, target in enumerate(default_cols, 1):
                if i < len(df.columns) and target not in aps_cols:
                    aps_cols[target] = df.columns[i]
        
        print(f"DEBUG: Kolom APS ditemukan: {aps_cols}")
        
        # Ambil data batas provinsi
        cursor = mongo_db["batas_provinsi"].find({}, {'_id': 0})
        boundary_features = list(cursor)
        
        # Buat mapping nama provinsi
        province_map = {}
        for feature in boundary_features:
            props = feature.get('properties', {})
            for field in ['NAMOBJ', 'name', 'WADMPR', 'Provinsi']:
                if field in props and props[field]:
                    official_name = str(props[field]).upper().strip()
                    province_map[official_name] = feature
        
        # Inisialisasi analytics
        analytics = PendidikanAnalytics()
        
        # Proses analisis
        matched_features = []
        analysis_summary = []
        kategori_counts = {"RENDAH": 0, "SEDANG": 0, "TINGGI": 0}
        
        for idx, row in df.iterrows():
            try:
                csv_name = str(row[prov_col]).strip()
                if not csv_name or csv_name.upper() == 'NAN':
                    continue
                
                normalized_name = normalize_name(csv_name)
                
                # Cari matching boundary
                matched_feature = None
                official_name = None
                
                # Coba exact match
                if normalized_name in province_map:
                    matched_feature = province_map[normalized_name]
                    official_name = normalized_name
                else:
                    # Coba partial match
                    for prov_name, feature in province_map.items():
                        if normalized_name in prov_name or prov_name in normalized_name:
                            matched_feature = feature
                            official_name = prov_name
                            break
                
                if not matched_feature:
                    continue
                
                # Kumpulkan data APS
                aps_data = {}
                for target_col, csv_col in aps_cols.items():
                    if csv_col in row:
                        try:
                            value = pd.to_numeric(row[csv_col], errors='coerce')
                            aps_data[target_col] = float(value) if not pd.isna(value) else None
                        except:
                            aps_data[target_col] = None
                
                # Skip jika tidak ada data APS
                if not any(v is not None for v in aps_data.values()):
                    continue
                
                # Analisis
                kategori, avg_aps = analytics.categorize_province(aps_data)
                warna = analytics.colors[kategori]
                insights = analytics.generate_insights(csv_name, aps_data, kategori, avg_aps)
                recommendations = analytics.generate_recommendations(kategori, aps_data)
                weri = analytics.calculate_weri(aps_data)
                
                # Hitung PGI per jenjang
                pgi_data = {}
                for target_col in aps_cols.keys():
                    if target_col in aps_data and aps_data[target_col] is not None:
                        pgi_data[target_col.replace('APS', 'PGI')] = analytics.calculate_pgi(aps_data[target_col])
                
                # Update counts
                kategori_counts[kategori] = kategori_counts.get(kategori, 0) + 1
                
                # Tambahkan ke feature
                feature_copy = matched_feature.copy()
                props = feature_copy.get('properties', {})
                
                props['analysis'] = {
                    'nama_provinsi': csv_name,
                    'nama_resmi': official_name,
                    'kategori': kategori,
                    'warna': warna,
                    'rata_aps': round(avg_aps, 2),
                    'weri': weri,
                    'insights': insights,
                    'rekomendasi': recommendations,
                    'aps_data': aps_data,
                    'pgi_data': pgi_data
                }
                
                feature_copy['properties'] = props
                matched_features.append(feature_copy)
                
                # Tambahkan ke summary
                analysis_summary.append({
                    'provinsi': csv_name,
                    'kategori': kategori,
                    'warna': warna,
                    'rata_aps': round(avg_aps, 2),
                    'weri': weri,
                    'aps_sd': aps_data.get('APS_7_12'),
                    'aps_smp': aps_data.get('APS_13_15'),
                    'aps_sma': aps_data.get('APS_16_18'),
                    'aps_pt': aps_data.get('APS_19_23'),
                    'matched': True
                })
                
            except Exception as e:
                print(f"DEBUG: Error processing row {idx}: {e}")
                continue
        
        # Hitung statistik nasional
        total_matched = len(matched_features)
        total_rows = len(df)
        
        # Cari provinsi dengan kondisi terburuk
        sorted_by_weri = []
        sorted_by_sma = []
        
        if analysis_summary:
            # Peringkat berdasarkan WERI tertinggi
            sorted_by_weri = sorted(
                [s for s in analysis_summary if s['weri'] is not None],
                key=lambda x: x['weri'],
                reverse=True
            )[:3]
            
            # Peringkat berdasarkan APS SMA terendah
            sorted_by_sma = sorted(
                [s for s in analysis_summary if s['aps_sma'] is not None],
                key=lambda x: x['aps_sma']
            )[:3]
        
        # Generate rekomendasi nasional
        national_recommendations = []
        
        if kategori_counts['RENDAH'] > 0:
            national_recommendations.append({
                'priority': 'Tinggi',
                'title': 'Fokus Daerah Tertinggal',
                'content': f'Terdapat {kategori_counts["RENDAH"]} provinsi dalam kategori RENDAH yang memerlukan intervensi khusus.',
                'actions': [
                    'Alokasi anggaran khusus untuk daerah tertinggal',
                    'Program percepatan wajib belajar 12 tahun',
                    'Pengiriman guru berkualitas ke daerah 3T'
                ]
            })
        
        # Rekomendasi berdasarkan APS SMA
        if analysis_summary:
            sma_values = [s['aps_sma'] for s in analysis_summary if s['aps_sma'] is not None]
            if sma_values and min(sma_values) < 70:
                national_recommendations.append({
                    'priority': 'Tinggi',
                    'title': 'Krisis Pendidikan Menengah',
                    'content': f'Beberapa provinsi memiliki APS SMA di bawah 70%, mengancam kualitas SDM masa depan.',
                    'actions': [
                        'Program SMA/SMK gratis untuk keluarga miskin',
                        'Beasiswa lanjut sekolah untuk lulusan SMP',
                        'Revitalisasi SMK sesuai kebutuhan industri'
                    ]
                })
        
        # TIDAK AUTO SAVE - hanya return data
        return Response({
            'status': 'success',
            'total_data': total_rows,
            'total_matched': total_matched,
            'match_rate': f"{total_matched}/{total_rows}",
            'kategori_distribusi': kategori_counts,
            'matched_features': {
                "type": "FeatureCollection",
                "features": matched_features
            },
            'analysis_summary': analysis_summary,
            'national_recommendations': national_recommendations,
            'top_risky': sorted_by_weri,
            'colors': analytics.colors
        })
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({
            "error": str(e),
            "message": "Gagal memproses file"
        }, status=500)


# SAVE ANALYSIS API - MANUAL SAVE
@api_view(['POST'])
def save_analysis(request):
    """Simpan hasil analisis dengan nama custom"""
    try:
        data = request.data
        analysis_name = data.get('name', 'Analisis Tanpa Nama')
        analysis_data = data.get('analysis_data')
        
        if not analysis_data:
            return Response({"error": "Data analisis tidak ditemukan"}, status=400)
        
        # Generate ID
        analysis_id = str(uuid.uuid4())
        
        # Siapkan dokumen untuk disimpan (format sama seperti download JSON)
        document = {
            "analysis_id": analysis_id,
            "name": analysis_name,
            "timestamp": datetime.now().isoformat(),
            "status": analysis_data.get('status'),
            "total_data": analysis_data.get('total_data'),
            "total_matched": analysis_data.get('total_matched'),
            "match_rate": analysis_data.get('match_rate'),
            "kategori_distribusi": analysis_data.get('kategori_distribusi'),
            "matched_features": analysis_data.get('matched_features'),
            "analysis_summary": analysis_data.get('analysis_summary'),
            "national_recommendations": analysis_data.get('national_recommendations'),
            "top_risky": analysis_data.get('top_risky'),
            "colors": analysis_data.get('colors')
        }
        
        # Simpan ke MongoDB
        result = mongo_db["education_analysis"].insert_one(document)
        
        return Response({
            "status": "success",
            "message": f"Analisis '{analysis_name}' berhasil disimpan",
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


# GET ANALYSIS LIST
@api_view(['GET'])
def get_analysis_list(request):
    """Get list semua analisis yang tersimpan"""
    try:
        # Ambil semua analisis, sorted by timestamp desc
        cursor = mongo_db["education_analysis"].find(
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
        import traceback
        traceback.print_exc()
        return Response({
            "error": str(e),
            "message": "Gagal mengambil daftar analisis"
        }, status=500)


# GET ANALYSIS DETAIL
@api_view(['GET'])
def get_analysis_detail(request, analysis_id):
    """Get detail analisis berdasarkan ID"""
    try:
        # Cari analisis berdasarkan analysis_id
        result = mongo_db["education_analysis"].find_one(
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
        import traceback
        traceback.print_exc()
        return Response({
            "error": str(e),
            "message": "Gagal mengambil detail analisis"
        }, status=500)


# DELETE ANALYSIS
@api_view(['DELETE'])
def delete_analysis(request, analysis_id):
    """Hapus analisis berdasarkan ID"""
    try:
        result = mongo_db["education_analysis"].delete_one(
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
        import traceback
        traceback.print_exc()
        return Response({
            "error": str(e),
            "message": "Gagal menghapus analisis"
        }, status=500)

