from django.contrib.gis.db import models

class SRTMBoundingBox(models.Model):
    dataFile = models.CharField('Data file', max_length=64)
    bbox = models.PolygonField('Bounding Box')

    class Meta:
        verbose_name_plural = 'SRTM Bounding Boxes'

    def __str__(self) -> str:
        return self.dataFile

