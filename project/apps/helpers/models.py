from django.contrib.gis.db import models

class SpatialRefSys(models.Model):
    srid = models.IntegerField(primary_key=True)
    auth_name = models.CharField(max_length=64)
    auth_srid = models.IntegerField()
    srtext = models.TextField()
    proj4text = models.TextField()

    class Meta:
        managed = False
        db_table = 'spatial_ref_sys'
        verbose_name_plural = 'Spatial Reference Systems'

    def __str__(self):
        return f'{self.auth_name}:{self.srid}'
    
class SpatialRefSysExt(models.Model):
    srs = models.ForeignKey("helpers.SpatialRefSys", verbose_name='Spatial reference system', on_delete=models.CASCADE)
    srid = models.CharField('SRID', max_length=64, default='', blank=True, null=True)
    source = models.CharField('Source', max_length=64, default='', blank=True, null=True)
    type = models.CharField('Type', max_length=32, default='', blank=True, null=True)
    name = models.CharField('Name', max_length=128, default='', blank=True, null=True)
    unit = models.CharField('Unit', max_length=64, default='', blank=True, null=True)
    scope = models.CharField('Scope', max_length=256, default='', blank=True, null=True)
    extent = models.TextField('Extent', default='', blank=True, null=True)
    bbox = models.PolygonField('Bounding Box', blank=True, null=True)
    x_min = models.FloatField('West', default=0, blank=True, null=True)
    y_min = models.FloatField('South', default=0, blank=True, null=True)
    x_max = models.FloatField('East', default=0, blank=True, null=True)
    y_max = models.FloatField('North', default=0, blank=True, null=True)

    class Meta:
        verbose_name_plural = 'Spatial Reference Systems (extended)'

    def __str__(self) -> str:
        return f'{self.name} ({self.srid})'
    
class BaseModel(models.Model):
    created_on = models.DateTimeField('Created on', auto_now_add=True)
    created_by = models.ForeignKey(
        "customuser.User", 
        verbose_name='Created by', 
        on_delete=models.DO_NOTHING, 
        related_name='%(class)s_creation',
        blank=True, 
        null=True,
    )
    updated_on = models.DateTimeField('Last updated', auto_now=True)
    updated_by = models.ForeignKey(
        "customuser.User", 
        verbose_name='Updated by', 
        on_delete=models.DO_NOTHING, 
        related_name='%(class)s_updates',
        blank=True, 
        null=True,
    )
    is_active = models.BooleanField('Is active', default=True)
    change_logs = models.ManyToManyField('helpers.ChangeLog', verbose_name='Change Logs', blank=True)

    class Meta:
        abstract = True

class Layout(BaseModel):
    title = models.CharField('Title', max_length=50, default='New Layout')
    config = models.JSONField('Configuration', default=dict, blank=True, null=True)

class ChangeLog(BaseModel):
    details = models.JSONField('Details', default=dict, blank=True, null=True)

class Tag(models.Model):
    tag = models.CharField('Tag', max_length=50)