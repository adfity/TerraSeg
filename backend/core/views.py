import os
from PIL import Image
from ultralytics import YOLO
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
import json
# from django.contrib.gis.geos import GEOSGeometry
from pymongo import MongoClient
import uuid
from dotenv import load_dotenv
from datetime import datetime
import math

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME")

# Load Model
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'ai_models', 'best.pt')
model = YOLO(MODEL_PATH)

# Koneksi MongoDB
client = MongoClient(MONGO_URI)
mongo_db = client[MONGO_DB_NAME]
mongo_collection = mongo_db["ai_features"]

def calculate_polygon_area(coords):
    """
    Menghitung luas poligon sederhana menggunakan rumus Shoelace.
    Input: [[lng1, lat1], [lng2, lat2], ...]
    Output: Luas dalam meter persegi (pendekatan kasar)
    """
    if len(coords) < 3:
        return 0
    
    area = 0
    # Faktor konversi derajat ke meter (pendekatan di khatulistiwa)
    # 1 derajat lat ~ 111,320 meter
    # 1 derajat lng ~ 111,320 * cos(lat) meter
    for i in range(len(coords) - 1):
        lon1, lat1 = coords[i]
        lon2, lat2 = coords[i+1]
        
        # Konversi ke meter sederhana
        x1 = lon1 * 111320 * math.cos(math.radians(lat1))
        y1 = lat1 * 111320
        x2 = lon2 * 111320 * math.cos(math.radians(lat2))
        y2 = lat2 * 111320
        
        area += (x1 * y2) - (x2 * y1)
        
    return abs(area) / 2

@api_view(['GET'])
def feature_list(request):
    try:
        cursor = mongo_collection.find({}, {'_id': 0}).sort('created_at', -1)
        return Response(list(cursor))
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['POST'])
def run_detection(request):
    image_file = request.FILES.get('image')
    lat = request.data.get('lat')
    lng = request.data.get('lng')
    
    categories_raw = request.data.get('categories', '')
    selected_categories = [c.strip().lower() for c in categories_raw.split(',') if c]

    if not image_file or not lat or not lng:
        return Response({"error": "Data tidak lengkap"}, status=400)

    try:
        img = Image.open(image_file)
        results = model.predict(source=img, save=False)
        detected_data = []

        for result in results:
            if result.masks is not None:
                for i, mask in enumerate(result.masks.xy):
                    cls_idx = int(result.boxes.cls[i])
                    raw_label = result.names[cls_idx].lower()
                    confidence = float(result.boxes.conf[i])

                    if raw_label in selected_categories:
                        segment_list = mask.tolist()

                        detected_data.append({
                            "nama": f"{raw_label.capitalize()} Terdeteksi",
                            "kategori": raw_label,
                            "segmentation": segment_list,
                            "confidence_score": round(confidence, 2),
                            "lat": lat,
                            "lng": lng
                        })
            else:
                for box in result.boxes:
                    raw_label = result.names[int(box.cls[0])].lower()
                    if raw_label in selected_categories:
                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        detected_data.append({
                            "nama": f"{raw_label.capitalize()} Terdeteksi",
                            "kategori": raw_label,
                            "bbox": [int(x1), int(y1), int(x2), int(y2)],
                            "confidence_score": round(float(box.conf[0]), 2),
                            "lat": lat,
                            "lng": lng
                        })

        return Response({
            "status": "success",
            "results": detected_data
        })

    except Exception as e:
        print(f"Error AI: {str(e)}")
        return Response({"error": str(e)}, status=500)

@api_view(['POST'])
def save_detection(request):
    try:
        features = request.data.get('features', [])
        feature_uuid = str(uuid.uuid4()) 

        for item in features:
            raw_coords = item.get('polygon_coords') 
            
            try:
                coords_list = []
                for pair in raw_coords.split(','):
                    c = pair.strip().split()
                    if len(c) == 2:
                        coords_list.append([float(c[0]), float(c[1])])
                
                if coords_list and coords_list[0] != coords_list[-1]:
                    coords_list.append(coords_list[0])
            except Exception:
                return Response({"error": "Format koordinat salah"}, status=400)

            # --- PINDAHKAN KE SINI ---
            # Hitung luas setelah coords_list dipastikan ada
            luas_m2 = calculate_polygon_area(coords_list)
            # -------------------------

            feature_uuid = str(uuid.uuid4())

            mongo_document = {
                "feature_id": feature_uuid,
                "user_id": request.user.id if request.user.is_authenticated else None,
                "nama": item.get('nama'),
                "kategori": item.get('kategori'),
                "confidence_score": item.get('confidence_score'),
                "location": {
                    "type": "Polygon",
                    "coordinates": [coords_list] 
                },
                "metadata": {
                    "luas_estimasi": round(luas_m2, 2),
                    "satuan": "m2"
                },
                "created_at": datetime.now().isoformat()
            }
            mongo_collection.insert_one(mongo_document)

        return Response({"status": "success", "feature_id": feature_uuid}, status=201)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['DELETE'])
def delete_feature(request, feature_id):
    try:
        result = mongo_collection.delete_one({"feature_id": feature_id})
        
        if result.deleted_count > 0:
            return Response({"message": "Data berhasil dihapus dari NoSQL"}, status=200)
        return Response({"error": "Data tidak ditemukan"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['PUT', 'PATCH'])
def update_feature_mongo(request, feature_id):
    try:
        new_nama = request.data.get('nama')
        new_kategori = request.data.get('kategori')

        result = mongo_collection.update_one(
            {"feature_id": feature_id}, 
            {"$set": {
                "nama": new_nama,
                "kategori": new_kategori,
                "updated_at": datetime.now().isoformat()
            }}
        )

        if result.matched_count > 0:
            return Response({"message": "Update Berhasil"})
        return Response({"error": "Data tidak ditemukan"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

# RBI DATA
@api_view(['GET'])
def rbi_pendidikan_list(request):
    wilayah_query = request.query_params.get('wilayah', None)
    
    query = {}
    if wilayah_query:
        query = {"properties.wilayah": wilayah_query}

    cursor = mongo_db["rbi_pendidikan"].find(query, {'_id': 0})
    features = list(cursor)
    
    return Response({
        "type": "FeatureCollection",
        "features": features
    })

@api_view(['GET'])
def rbi_kesehatan_list(request):
    wilayah_query = request.query_params.get('wilayah', None)
    
    query = {}
    if wilayah_query:
        query = {"properties.wilayah": wilayah_query}

    cursor = mongo_db["rbi_kesehatan"].find(query, {'_id': 0})
    features = list(cursor)
    
    return Response({
        "type": "FeatureCollection",
        "features": features
    })

# BOUNDARY DATA
@api_view(['GET'])
def batas_provinsi(request):
    """Ambil seluruh batas wilayah Indonesia (Layer Dasar)"""
    try:
        cursor = mongo_db["batas_provinsi"].find({}, {'_id': 0})
        features = list(cursor)
        return Response({
            "type": "FeatureCollection",
            "features": features
        })
    except Exception as e:
        return Response({"error": str(e)}, status=500)
    
@api_view(['GET'])
def batas_kabupaten(request):
    """Ambil seluruh batas wilayah Indonesia (Layer Dasar)"""
    try:
        cursor = mongo_db["batas_kabupaten"].find({}, {'_id': 0})
        features = list(cursor)
        return Response({
            "type": "FeatureCollection",
            "features": features
        })
    except Exception as e:
        return Response({"error": str(e)}, status=500)


