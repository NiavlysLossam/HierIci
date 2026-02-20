from django.shortcuts import render
from django.http import HttpResponse, Http404
import requests
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

def proxy_tarn_image(request):
    """
    Proxy pour contourner les restrictions CORS du site des archives du Tarn.
    Utilisé uniquement pour les images de ce domaine.
    """
    url = request.GET.get('url')
    if not url or 'recherche-archives.tarn.fr' not in url:
        raise Http404("URL non autorisée ou manquante.")
    
    try:
        # On définit un User-Agent pour éviter d'être bloqué comme robot si besoin
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://recherche-archives.tarn.fr/'
        }
        response = requests.get(url, headers=headers, stream=True, timeout=10)
        response.raise_for_status()
        
        django_response = HttpResponse(response.iter_content(chunk_size=8192), content_type=response.headers.get('Content-Type'))
        # Ajout de headers de cache pour éviter de re-télécharger l'image à chaque fois
        django_response['Cache-Control'] = 'public, max-age=86400' 
        return django_response
    except requests.RequestException:
        raise Http404("Erreur lors de la récupération de l'image distante.")
