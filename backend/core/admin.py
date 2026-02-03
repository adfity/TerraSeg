from django.contrib import admin # Perhatikan cara importnya
from .models import GeoFeature

@admin.register(GeoFeature)
class GeoFeatureAdmin(admin.ModelAdmin): # Pakai ModelAdmin biasa
    list_display = ('nama', 'kategori', 'confidence_score', 'created_at')
    list_filter = ('kategori',)
    search_fields = ('nama', 'kategori')