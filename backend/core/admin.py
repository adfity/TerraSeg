from django.contrib.gis import admin
from .models import GeoFeature

@admin.register(GeoFeature)
class GeoFeatureAdmin(admin.GISModelAdmin):
    # Menggunakan layer satelit dari World Imagery (Esri)
    gis_widget_kwargs = {
        'attrs': {
            'default_zoom': 15,
            'default_lon': 106.8451,
            'default_lat': -6.4847,
        }
    }
    
    # Konfigurasi agar widget peta menggunakan tile satelit
    wms_url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    
    list_display = ('nama', 'kategori', 'confidence_score', 'created_at')
    list_filter = ('kategori',)