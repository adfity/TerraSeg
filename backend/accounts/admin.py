from django.contrib import admin
from .models import User

# Daftarkan model User supaya muncul di dashboard admin
admin.site.register(User)