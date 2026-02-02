import geopandas as gpd
from pymongo import MongoClient
import json
import os

# Tambahkan provinsi_name di parameter fungsi ⬇️
def migrate(provinsi_name, wilayah_name, shp_path):
    client = MongoClient("mongodb://datebayo:klepon12@127.0.0.1:27017/")
    db = client["terraseg_db"] 
    collection = db["rbi_kesehatan"]

    if not os.path.exists(shp_path):
        print(f"File SHP {wilayah_name} tidak ditemukan!")
        return

    print(f"Sedang membaca Shapefile {wilayah_name}...")
    gdf = gpd.read_file(shp_path)
    
    if gdf.crs != "EPSG:4326":
        gdf = gdf.to_crs("EPSG:4326")

    data_json = json.loads(gdf.to_json())
    features = data_json['features']

    for feature in features:
        # Sekarang kedua variabel ini aman disuntikkan
        feature['properties']['provinsi'] = provinsi_name
        feature['properties']['wilayah'] = wilayah_name
    
    if features:
        # Cari di dalam properties.wilayah agar akurat
        collection.delete_many({"properties.wilayah": wilayah_name}) 
        collection.insert_many(features)
        print(f"✅ {wilayah_name} ({provinsi_name}) berhasil masuk MongoDB.")

if __name__ == "__main__":
    # Pastikan memanggil 3 argumen: Provinsi, Wilayah, Path
    # migrate("JAWA BARAT", "KOTA BANDUNG", r'C:\Users\hpvvi\Documents\magangBig\dataset\JawaBarat\KOTA BANDUNG\RUMAHSAKIT_PT_25K.shp')
    migrate("JAWA BARAT", "KAB BOGOR", r'C:\Users\hpvvi\Documents\magangBig\dataset\JawaBarat\KAB. BOGOR\RUMAHSAKIT_PT_25K.shp')
    migrate("JAWA TENGAH", "KOTA SEMARANG", r'C:\Users\hpvvi\Documents\magangBig\dataset\JawaTengah\KOTA SEMARANG\RUMAHSAKIT_PT_25K.shp')
    migrate("JAWA TENGAH", "KOTA SURAKARTA", r'C:\Users\hpvvi\Documents\magangBig\dataset\JawaTengah\KOTA SURAKARTA\RUMAHSAKIT_PT_25K.shp')
    migrate("JAWA TIMUR", "KOTA MALANG", r'C:\Users\hpvvi\Documents\magangBig\dataset\JawaTimur\KOTA MALANG\KESEHATAN_PT_25K.shp')
    migrate("JAWA TIMUR", "KOTA SURABAYA", r'C:\Users\hpvvi\Documents\magangBig\dataset\JawaTimur\KOTA SURABAYA\KESEHATAN_PT_25K.shp')
    migrate("JAWA BARAT", "KOTA BANDUNG", r'C:\Users\hpvvi\Documents\magangBig\dataset\JawaBarat\KOTA BANDUNG\KESEHATAN_PT_25K.shp')
    migrate("JAWA BARAT", "KAB BOGOR", r'C:\Users\hpvvi\Documents\magangBig\dataset\JawaBarat\KAB. BOGOR\KESEHATAN_PT_25K.shp')