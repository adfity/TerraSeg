from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # Auth
    path('accounts/', include('allauth.urls')),
    path('api/accounts/', include('accounts.urls')),
    
    # All core APIs under /api/
    path('api/', include('core.urls')),
]