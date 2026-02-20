from rest_framework_gis.serializers import GeoFeatureModelSerializer
from .models import Photo, Author, Source
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
    author_name = serializers.ReadOnlyField(source='author.name')
    source_name = serializers.ReadOnlyField(source='source.name')
    source_url = serializers.ReadOnlyField(source='source.url')

    class Meta:
        model = Photo
        geo_field = 'location'
        fields = ('id', 'title', 'image', 'image_url', 'description', 'year', 'is_approximate', 
                  'author_name', 'source_name', 'source_url', 'azimuth')
