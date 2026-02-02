from django.contrib import admin
from django.urls import path, include
from core.views import (
    # Boundary
    batas_provinsi,
    
    # Main Analysis
    analyze_aps_csv,
    
    # Template & Validation
    download_aps_template,
    validate_csv,
    
    # Other endpoints (keep existing)
    feature_list,
    run_detection,
    save_detection,
    delete_feature,
    rbi_pendidikan_list,
    rbi_kesehatan_list,
)

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # Auth
    path('accounts/', include('allauth.urls')),
    path('api/accounts/', include('accounts.urls')),
    
    # Features
    path('api/features/', feature_list, name='feature-list'),
    path('api/run-detection/', run_detection, name='run-detection'),
    path('api/save-detection/', save_detection, name='save-detection'),
    path('api/features/<str:feature_id>/', delete_feature, name='delete-feature'),
    
    # Boundary
    path('api/batas-provinsi/', batas_provinsi, name='batas-provinsi'),
    
    # RBI
    path('api/rbi-pendidikan/', rbi_pendidikan_list, name='rbi-pendidikan'),
    path('api/rbi-kesehatan/', rbi_kesehatan_list, name='rbi-kesehatan'),
    
    # ============ ANALYSIS ENDPOINTS (SIMPLE) ============
    path('api/analyze-aps/', analyze_aps_csv, name='analyze-aps'),
    path('api/template/aps/', download_aps_template, name='download-aps-template'),
    path('api/validate-csv/', validate_csv, name='validate-csv'),
]