import json
from pymongo import MongoClient
from core.models import GeoFeature

def run_migration():
    try:
        # Gunakan URI tanpa auth dulu, jika error ganti ke uri dengan user:pass
        uri = "mongodb://datebayo:klepon12@127.0.0.1:27017/"  
        client = MongoClient(uri, serverSelectionTimeoutMS=5000)
        db = client["terraseg_db"]
        collection = db["ai_features"]

        client.admin.command('ping')
        print("✅ Terhubung ke MongoDB!")

        features = GeoFeature.objects.all()
        if not features.exists():
            print("❌ Tidak ada data di PostGIS untuk dimigrasi.")
            return

        migrated_count = 0
        for f in features:
            geojson_geometry = json.loads(f.geom.geojson)
            document = {
                "postgis_id": f.id,
                "nama": f.nama,
                "kategori": f.kategori,
                "confidence_score": f.confidence_score,
                "location": geojson_geometry,
                "metadata": f.metadata,
                "created_at": str(f.created_at)
            }
            
            collection.update_one(
                {"postgis_id": f.id},
                {"$set": document},
                upsert=True
            )
            migrated_count += 1
        
        print(f"🚀 Sukses! {migrated_count} data AI sudah masuk ke MongoDB.")

    except Exception as e:
        print(f"❌ Error: {e}")

# Panggil fungsinya langsung
run_migration()