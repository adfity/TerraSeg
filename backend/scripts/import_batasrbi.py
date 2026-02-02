import json
from pymongo import MongoClient

def migrate_boundary():
    client = MongoClient("mongodb://datebayo:klepon12@127.0.0.1:27017/")
    db = client["terraseg_db"]
    collection = db["batas_kabupaten"] # Koleksi khusus batas wilayah

    # Path ke file geojson indonesia yang kamu download
    file_path = r'C:\Users\hpvvi\Documents\magangBig\dataset\gabungan_38_wilayah_batas_kabkota.geojson'
    
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    features = data['features']
    
    # Bersihkan data lama
    collection.delete_many({}) 
    
    # Insert data baru
    if features:
        collection.insert_many(features)
        print(f"✅ Berhasil mengunggah {len(features)} poligon wilayah Indonesia ke MongoDB.")

if __name__ == "__main__":
    migrate_boundary()