from django.urls import path
from . import views
from . import analysis_views
from . import kesehatan_views
from core import pangan_views

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
    path('save-analysis/', analysis_views.save_analysis, name='save-analysis'),
    path('analysis/list/', analysis_views.get_analysis_list, name='get-analysis-list'),
    path('analysis/<str:analysis_id>/', analysis_views.get_analysis_detail, name='get-analysis-detail'),
    path('analysis/<str:analysis_id>/delete/', analysis_views.delete_analysis, name='delete-analysis'),
    
    # ============ HEALTH ANALYSIS (BPS API) ============
    path('analyze-health-bps/', kesehatan_views.analyze_health_bps, name='analyze-health-bps'),
    path('save-health-analysis/', kesehatan_views.save_health_analysis, name='save-health-analysis'),
    path('health-analysis/list/', kesehatan_views.get_health_analysis_list, name='get-health-analysis-list'),
    path('health-analysis/<str:analysis_id>/', kesehatan_views.get_health_analysis_detail, name='get-health-analysis-detail'),
    path('health-analysis/<str:analysis_id>/delete/', kesehatan_views.delete_health_analysis, name='delete-health-analysis'),

    # ============ FOOD SECURITY ANALYSIS (BPS API - KETAHANAN PANGAN) ============
    path('analyze-food-security-bps/', pangan_views.analyze_food_security_bps, name='analyze-food-security-bps'),
    path('save-food-security-analysis/', pangan_views.save_food_security_analysis, name='save-food-security-analysis'),
    path('food-security-analysis/list/', pangan_views.get_food_security_analysis_list, name='get-food-security-analysis-list'),
    path('food-security-analysis/<str:analysis_id>/', pangan_views.get_food_security_analysis_detail, name='get-food-security-analysis-detail'),
    path('food-security-analysis/<str:analysis_id>/delete/', pangan_views.delete_food_security_analysis, name='delete-food-security-analysis'),
]