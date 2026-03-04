from django.contrib.gis import admin
from .models import Photo, Author, Source, Storymap, StorymapChapter
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


class StorymapChapterInline(admin.TabularInline):
    model = StorymapChapter
    extra = 1
    fields = ('order', 'title', 'photo', 'narrative', 'longitude', 'latitude', 'zoom', 'baselayer')
    ordering = ('order',)
    autocomplete_fields = ['photo']


@admin.register(Storymap)
class StorymapAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'published', 'created_at')
    list_filter = ('published',)
    prepopulated_fields = {'slug': ('title',)}
    search_fields = ('title',)
    inlines = [StorymapChapterInline]
