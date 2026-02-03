from django.urls import path
from . import views
from . import analysis_views

urlpatterns = [
    # ============ AI DETECTION & FEATURES ============
    path('features/', views.feature_list, name='feature-list'),
    path('run-detection/', views.run_detection, name='run-detection'),
    path('save-detection/', views.save_detection, name='save-detection'),
    path('features/<str:feature_id>/', views.delete_feature, name='delete-feature'),
    
    # ============ BOUNDARY DATA ============
    path('batas-provinsi/', views.batas_provinsi, name='batas-provinsi'),
    path('batas-kabupaten/', views.batas_kabupaten, name='batas-kabupaten'),
    
    # ============ RBI DATA ============
    path('rbi-pendidikan/', views.rbi_pendidikan_list, name='rbi-pendidikan'),
    path('rbi-kesehatan/', views.rbi_kesehatan_list, name='rbi-kesehatan'),
    
    # ============ EDUCATION ANALYSIS ============
    path('analyze-aps/', analysis_views.analyze_aps_csv, name='analyze-aps'),
    path('template/aps/', analysis_views.download_aps_template, name='download-aps-template'),
    path('validate-csv/', analysis_views.validate_csv, name='validate-csv'),
    # path('analysis/history/', analysis_views.get_analysis_history, name='get-analysis-history'),
    # path('analysis/<str:analysis_id>/', analysis_views.get_analysis_by_id, name='get-analysis-by-id'),
    # path('analysis/<str:analysis_id>/delete/', analysis_views.delete_analysis, name='delete-analysis'),
]