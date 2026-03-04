from django.shortcuts import render, get_object_or_404
from django.http import HttpResponse, Http404
import requests
from rest_framework import viewsets
from rest_framework.generics import RetrieveAPIView, ListAPIView
from .models import Photo, Author, Source, Storymap
from .serializers import (
    PhotoSerializer, AuthorSerializer, SourceSerializer,
    StorymapListSerializer, StorymapDetailSerializer
)


def home(request):
    return render(request, 'index.html')


class PhotoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Photo.objects.all()
    serializer_class = PhotoSerializer


class AuthorViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Author.objects.all()
    serializer_class = AuthorSerializer


class SourceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Source.objects.all()
    serializer_class = SourceSerializer


class StorymapListAPIView(ListAPIView):
    """
    Liste des storymaps publiées (pour la page de garde).
    """
    queryset = Storymap.objects.filter(published=True).order_by('-created_at')
    serializer_class = StorymapListSerializer


class StorymapDetailView(RetrieveAPIView):
    """
    API endpoint en lecture seule pour une storymap publiée, identifiée par son slug.
    """
    queryset = Storymap.objects.filter(published=True)
    serializer_class = StorymapDetailSerializer
    lookup_field = 'slug'


def storymaps_index(request):
    """
    Page de garde listant toutes les storymaps publiées.
    """
    return render(request, 'storymaps_index.html')


def storymap_view(request, slug):
    """
    Rendu de la page HTML de la storymap.
    Passe le slug au template ; le JS charge les données via l'API.
    Retourne 404 si la storymap n'existe pas ou n'est pas publiée.
    """
    get_object_or_404(Storymap, slug=slug, published=True)
    return render(request, 'storymap.html', {'slug': slug})


def proxy_tarn_image(request):
    """
    Proxy pour contourner les restrictions CORS du site des archives du Tarn.
    """
    url = request.GET.get('url')
    if not url or 'recherche-archives.tarn.fr' not in url:
        raise Http404("URL non autorisée ou manquante.")

    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://recherche-archives.tarn.fr/'
        }
        response = requests.get(url, headers=headers, stream=True, timeout=10)
        response.raise_for_status()

        django_response = HttpResponse(response.iter_content(chunk_size=8192), content_type=response.headers.get('Content-Type'))
        django_response['Cache-Control'] = 'public, max-age=86400'
        return django_response
    except requests.RequestException:
        raise Http404("Erreur lors de la récupération de l'image distante.")
