from django.contrib.gis import admin
from .models import Photo, Author, Source
from .widgets import AzimuthMapWidget

@admin.register(Author)
class AuthorAdmin(admin.ModelAdmin):
    list_display = ('name',)

@admin.register(Source)
class SourceAdmin(admin.ModelAdmin):
    list_display = ('name', 'url')

@admin.register(Photo)
class PhotoAdmin(admin.GISModelAdmin):
    list_display = ('title', 'year', 'author', 'source', 'location', 'azimuth')
    list_filter = ('author', 'source', 'is_approximate')
    search_fields = ('title', 'description')
    
    gis_widget = AzimuthMapWidget
