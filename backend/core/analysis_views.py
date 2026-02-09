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

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_MONGO_NAME = os.getenv("DB_MONGO_NAME")

# Koneksi MongoDB
client = MongoClient(MONGO_URI)
mongo_db = client[DB_MONGO_NAME]


# MODEL ANALISIS SEDERHANA
class PendidikanAnalytics:
    """Model analisis pendidikan sederhana dengan 3 kategori"""
    
    def __init__(self):
        # Warna untuk 3 kategori
        self.colors = {
            "RENDAH": "#ef4444",    # Merah
            "SEDANG": "#f59e0b",    # Kuning
            "TINGGI": "#10b981"     # Hijau
        }
        
        # Bobot untuk WERI
        self.weights = {
            'SD': 0.25,   # 7-12 tahun
            'SMP': 0.30,  # 13-15 tahun
            'SMA': 0.30,  # 16-18 tahun
            'PT': 0.15    # 19-23 tahun
        }

    def calculate_pgi(self, aps_value):
        """Hitung Participation Gap Index"""
        if aps_value is None or pd.isna(aps_value):
            return None
        return round(100 - aps_value, 2)

    def calculate_weri(self, aps_data):
        """Hitung Weighted Education Risk Index"""
        weri = 0
        total_weight = 0
        
        # Map data ke jenjang
        jenjang_mapping = {
            'APS_7_12': 'SD',
            'APS_13_15': 'SMP',
            'APS_16_18': 'SMA',
            'APS_19_23': 'PT'
        }
        
        for aps_key, jenjang in jenjang_mapping.items():
            if aps_key in aps_data and aps_data[aps_key] is not None:
                pgi = self.calculate_pgi(aps_data[aps_key])
                if pgi is not None:
                    weri += self.weights[jenjang] * pgi
                    total_weight += self.weights[jenjang]
        
        return round(weri / total_weight if total_weight > 0 else 0, 2)

    def categorize_province(self, aps_data):
        """Kategorikan provinsi berdasarkan skor komposit"""
        # Hitung skor rata-rata APS
        aps_values = []
        for key in ['APS_7_12', 'APS_13_15', 'APS_16_18', 'APS_19_23']:
            if key in aps_data and aps_data[key] is not None:
                aps_values.append(aps_data[key])
        
        if not aps_values:
            return "SEDANG", 0
        
        avg_aps = sum(aps_values) / len(aps_values)
        
        # Kategori berdasarkan quartile
        if avg_aps >= 85:
            return "TINGGI", avg_aps
        elif avg_aps >= 70:
            return "SEDANG", avg_aps
        else:
            return "RENDAH", avg_aps

    def generate_insights(self, provinsi, aps_data, kategori, avg_aps):
        """Generate insight professional berdasarkan data"""
        insights = []
        
        # Insight utama berdasarkan kategori
        if kategori == "RENDAH":
            insights.append(f"{provinsi} berada dalam kategori RENDAH")
            insights.append(f"Rata-rata APS: {avg_aps:.1f}% (di bawah standar nasional)")
        elif kategori == "SEDANG":
            insights.append(f"{provinsi} berada dalam kategori SEDANG")
            insights.append(f"Rata-rata APS: {avg_aps:.1f}% (mendekati standar nasional)")
        else:
            insights.append(f"{provinsi} berada dalam kategori TINGGI")
            insights.append(f"Rata-rata APS: {avg_aps:.1f}% (di atas standar nasional)")
        
        # Insight per jenjang
        for jenjang, aps_key, label in [
            ('SD', 'APS_7_12', 'SD (7-12 tahun)'),
            ('SMP', 'APS_13_15', 'SMP (13-15 tahun)'),
            ('SMA', 'APS_16_18', 'SMA (16-18 tahun)'),
            ('PT', 'APS_19_23', 'Perguruan Tinggi (19-23 tahun)')
        ]:
            if aps_key in aps_data and aps_data[aps_key] is not None:
                aps_value = aps_data[aps_key]
                pgi = self.calculate_pgi(aps_value)
                
                # Threshold untuk setiap jenjang
                thresholds = {'SD': 95, 'SMP': 85, 'SMA': 70, 'PT': 30}
                threshold = thresholds.get(jenjang, 80)
                
                if aps_value < threshold:
                    insights.append(f"🎓 {label}: {aps_value:.1f}% (PGI: {pgi:.1f}%) - di bawah target {threshold}%")
                else:
                    insights.append(f"✅ {label}: {aps_value:.1f}% - memenuhi target")
        
        # Insight WERI
        weri = self.calculate_weri(aps_data)
        if weri > 30:
            insights.append(f"📉 WERI: {weri:.1f} - Risiko pendidikan tinggi")
        elif weri > 20:
            insights.append(f"⚠️ WERI: {weri:.1f} - Risiko pendidikan sedang")
        else:
            insights.append(f"✅ WERI: {weri:.1f} - Risiko pendidikan rendah")
        
        return insights

    def generate_recommendations(self, kategori, aps_data):
        """Generate rekomendasi kebijakan profesional"""
        recommendations = []
        
        # Rekomendasi berdasarkan kategori
        if kategori == "RENDAH":
            recommendations.append({
                'priority': 'Tinggi',
                'title': 'Intervensi Khusus',
                'actions': [
                    'Percepatan Wajib Belajar 12 Tahun melalui PIP (Program Indonesia Pintar) Afirmasi',
                    'Pembangunan Unit Sekolah Baru (USB) dan Ruang Kelas Baru (RKB) di lokasi prioritas',
                    'Implementasi Dana Alokasi Khusus (DAK) Fisik untuk rehabilitasi sarana pendidikan rusak',
                    'Pemenuhan kuota guru melalui jalur PPPK dengan prioritas penempatan wilayah 3T'
                ]
            })
        elif kategori == "SEDANG":
            recommendations.append({
                'priority': 'Sedang',
                'title': 'Penguatan Program',
                'actions': [
                    'Optimalisasi Dana BOS (Bantuan Operasional Sekolah) berbasis kinerja dan rapor pendidikan',
                    'Penguatan kompetensi pendidik melalui integrasi Platform Merdeka Mengajar (PMM)',
                    'Revitalisasi pendidikan vokasi (SMK) melalui program Link and Match dengan dunia industri',
                    'Pengembangan literasi dan numerasi berbasis standar asesmen nasional'
                ]
            })
        else:
            recommendations.append({
                'priority': 'Rendah',
                'title': 'Pemeliharaan & Inovasi',
                'actions': [
                    'Implementasi transformasi digital pendidikan melalui bantuan perangkat TIK sekolah',
                    'Pengembangan kurikulum berbasis talenta tinggi dan penguatan STEM (Science, Technology, Engineering, and Math)',
                    'Pemberian beasiswa prestasi tingkat lanjut dan sertifikasi kompetensi internasional',
                    'Perluasan kolaborasi akademik internasional melalui program pertukaran pelajar dan guru'
                ]
            })
        
        # Rekomendasi khusus per jenjang rendah
        low_aps_jenjang = []
        for jenjang, aps_key, label in [
            ('SMA', 'APS_16_18', 'SMA/SMK'),
            ('SMP', 'APS_13_15', 'SMP'),
            ('PT', 'APS_19_23', 'Perguruan Tinggi'),
            ('SD', 'APS_7_12', 'SD')
        ]:
            if aps_key in aps_data and aps_data[aps_key] is not None:
                thresholds = {'SD': 95, 'SMP': 85, 'SMA': 70, 'PT': 30}
                if aps_data[aps_key] < thresholds.get(jenjang, 80):
                    low_aps_jenjang.append(label)
        
        if low_aps_jenjang:
            recommendations.append({
                'priority': 'Khusus',
                'title': f'Fokus pada: {", ".join(low_aps_jenjang)}',
                'actions': [
                    'Program khusus untuk jenjang tersebut',
                    'Monitoring partisipasi bulanan',
                    'Intervensi berbasis data real-time'
                ]
            })
        
        return recommendations


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

