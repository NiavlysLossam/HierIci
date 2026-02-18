from django.shortcuts import render
from rest_framework import viewsets
from .models import Photo, Author, Source
from .serializers import PhotoSerializer, AuthorSerializer, SourceSerializer

def home(request):
    return render(request, 'index.html')

class PhotoViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint qui permet de voir les photographies.
    """
    queryset = Photo.objects.all()
    serializer_class = PhotoSerializer

class AuthorViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Author.objects.all()
    serializer_class = AuthorSerializer

class SourceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Source.objects.all()
    serializer_class = SourceSerializer
