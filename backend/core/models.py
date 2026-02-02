from django.contrib.gis.db import models

class GeoFeature(models.Model):
    KATEGORI_CHOICES = [
        ('bangunan', 'Bangunan'),
        ('jalan', 'Jalan'),
        ('perairan', 'Perairan'),
        ('pepohonan', 'Pepohonan'),
    ]

    nama = models.CharField(max_length=100, blank=True, null=True)
    kategori = models.CharField(max_length=50, choices=KATEGORI_CHOICES)
    geom = models.PolygonField(srid=4326) 
    confidence_score = models.FloatField() 
    metadata = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        nama_tampilan = self.nama if self.nama else self.get_kategori_display()
        return f"{nama_tampilan} ({self.confidence_score*100:.1f}%)"