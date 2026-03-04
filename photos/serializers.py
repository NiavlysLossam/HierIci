from rest_framework_gis.serializers import GeoFeatureModelSerializer
from .models import Photo, Author, Source, Storymap, StorymapChapter
from rest_framework import serializers

class AuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Author
        fields = ('id', 'name')

class SourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Source
        fields = ('id', 'name', 'url')

class PhotoSerializer(GeoFeatureModelSerializer):
    """
    Serializer pour le modèle Photo au format GeoJSON.
    """
    author_name = serializers.SerializerMethodField()
    source_name = serializers.SerializerMethodField()
    source_url = serializers.SerializerMethodField()

    def get_author_name(self, obj):
        return obj.author.name if obj.author else None

    def get_source_name(self, obj):
        return obj.source.name if obj.source else None

    def get_source_url(self, obj):
        return obj.source.url if obj.source else None

    class Meta:
        model = Photo
        geo_field = 'location'
        fields = ('id', 'title', 'image', 'image_url', 'description', 'year', 'is_approximate',
                  'author_name', 'source_name', 'source_url', 'azimuth')


class StorymapChapterSerializer(serializers.ModelSerializer):
    """
    Serializer pour un chapitre de storymap.
    Résout l'image et les coordonnées de la photo liée si non renseignées.
    """
    photo_title   = serializers.SerializerMethodField()
    photo_image   = serializers.SerializerMethodField()
    photo_azimuth = serializers.SerializerMethodField()
    longitude     = serializers.SerializerMethodField()
    latitude      = serializers.SerializerMethodField()

    def get_photo_title(self, obj):
        return obj.photo.title if obj.photo else None

    def get_photo_image(self, obj):
        if not obj.photo:
            return None
        if obj.photo.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.photo.image.url)
            return obj.photo.image.url
        return obj.photo.image_url or None

    def get_photo_azimuth(self, obj):
        if obj.photo and obj.photo.azimuth is not None:
            return obj.photo.azimuth
        return 0

    def get_longitude(self, obj):
        """Utilise la longitude du chapitre, ou celle de la photo si absente."""
        if obj.longitude is not None:
            return obj.longitude
        if obj.photo and obj.photo.location:
            return obj.photo.location.x
        return None

    def get_latitude(self, obj):
        """Utilise la latitude du chapitre, ou celle de la photo si absente."""
        if obj.latitude is not None:
            return obj.latitude
        if obj.photo and obj.photo.location:
            return obj.photo.location.y
        return None

    class Meta:
        model = StorymapChapter
        fields = (
            'id', 'order', 'title', 'narrative',
            'photo_title', 'photo_image', 'photo_azimuth',
            'longitude', 'latitude', 'zoom', 'baselayer',
        )



class StorymapListSerializer(serializers.ModelSerializer):
    """
    Serializer léger pour la liste des storymaps publiées (page de garde).
    """
    thumbnail_url = serializers.SerializerMethodField()
    chapter_count = serializers.SerializerMethodField()

    def get_thumbnail_url(self, obj):
        if not obj.thumbnail:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.thumbnail.url)
        return obj.thumbnail.url

    def get_chapter_count(self, obj):
        return obj.chapters.count()

    class Meta:
        model = Storymap
        fields = ('id', 'title', 'slug', 'description', 'thumbnail_url', 'chapter_count')


class StorymapDetailSerializer(serializers.ModelSerializer):
    chapters = StorymapChapterSerializer(many=True, read_only=True)

    class Meta:
        model = Storymap
        fields = ('id', 'title', 'slug', 'description', 'chapters')

