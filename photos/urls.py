from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PhotoViewSet, AuthorViewSet, SourceViewSet, home

router = DefaultRouter()
router.register(r'photos', PhotoViewSet)
router.register(r'authors', AuthorViewSet)
router.register(r'sources', SourceViewSet)

app_name = 'photos'

urlpatterns = [
    path('', home, name='home'),
    path('api/', include(router.urls)),
]
