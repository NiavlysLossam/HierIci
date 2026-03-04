from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PhotoViewSet, AuthorViewSet, SourceViewSet,
    home, proxy_tarn_image,
    StorymapListAPIView, StorymapDetailView,
    storymaps_index, storymap_view
)

router = DefaultRouter()
router.register(r'photos', PhotoViewSet)
router.register(r'authors', AuthorViewSet)
router.register(r'sources', SourceViewSet)

app_name = 'photos'

urlpatterns = [
    path('', home, name='home'),
    path('api/', include(router.urls)),
    path('api/storymaps/', StorymapListAPIView.as_view(), name='storymap-list-api'),
    path('api/storymaps/<slug:slug>/', StorymapDetailView.as_view(), name='storymap-api'),
    path('storymaps/', storymaps_index, name='storymaps-index'),
    path('storymap/<slug:slug>/', storymap_view, name='storymap'),
    path('proxy-tarn-image/', proxy_tarn_image, name='proxy_tarn_image'),
]
