from django.contrib.gis.db import models
from django.utils.text import slugify

class Author(models.Model):
    name = models.CharField(max_length=200, verbose_name="Nom de l'auteur")

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Auteur"
        verbose_name_plural = "Auteurs"

class Source(models.Model):
    name = models.CharField(max_length=200, verbose_name="Nom de la source")
    url = models.URLField(max_length=500, blank=True, null=True, verbose_name="Lien vers la source")

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Source"
        verbose_name_plural = "Sources"

class Photo(models.Model):
    title = models.CharField(max_length=200, verbose_name="Titre")
    image = models.ImageField(upload_to='', verbose_name="Image locale", blank=True, null=True)
    image_url = models.URLField(max_length=1000, blank=True, null=True, verbose_name="URL de l'image (ex: IIIF)")
    description = models.TextField(blank=True, verbose_name="Description")
    
    # Modifications demandées pour la date
    year = models.IntegerField(null=True, blank=True, verbose_name="Année")
    is_approximate = models.BooleanField(default=False, verbose_name="Date approximative")
    
    # Listes déroulantes (Clés étrangères)
    author = models.ForeignKey(Author, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Auteur")
    source = models.ForeignKey(Source, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Source")
    
    azimuth = models.IntegerField(default=0, verbose_name="Azimut (0-360°)", help_text="Direction de la prise de vue")
    
    location = models.PointField(srid=4326, verbose_name="Localisation")

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = "Photographie ancienne"
        verbose_name_plural = "Photographies anciennes"


BASELAYER_CHOICES = [
    ('darkMatter', 'Sombre (Dark Matter)'),
    ('voyager', 'Clair (Voyager)'),
    ('ortho1950', 'Ortho 1950–1965'),
    ('ortho1965', 'Ortho 1965–1980'),
]


class Storymap(models.Model):
    title = models.CharField(max_length=200, verbose_name="Titre")
    slug = models.SlugField(max_length=200, unique=True, verbose_name="Slug (URL)")
    description = models.TextField(blank=True, verbose_name="Introduction")
    thumbnail = models.ImageField(
        upload_to='storymaps/thumbnails/',
        blank=True, null=True,
        verbose_name="Vignette (image de couverture)"
    )
    published = models.BooleanField(default=False, verbose_name="Publié")
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = "Storymap"
        verbose_name_plural = "Storymaps"


class StorymapChapter(models.Model):
    storymap = models.ForeignKey(
        Storymap, on_delete=models.CASCADE,
        related_name='chapters', verbose_name="Storymap"
    )
    order = models.PositiveIntegerField(default=0, verbose_name="Ordre")
    title = models.CharField(max_length=200, verbose_name="Titre du chapitre")
    narrative = models.TextField(blank=True, verbose_name="Texte narratif")
    photo = models.ForeignKey(
        Photo, on_delete=models.SET_NULL,
        null=True, blank=True, verbose_name="Photo mise en avant"
    )
    # Vue carte
    longitude = models.FloatField(null=True, blank=True, verbose_name="Longitude (centre carte)")
    latitude = models.FloatField(null=True, blank=True, verbose_name="Latitude (centre carte)")
    zoom = models.FloatField(default=14, verbose_name="Zoom")
    baselayer = models.CharField(
        max_length=20, choices=BASELAYER_CHOICES,
        default='darkMatter', verbose_name="Fond de plan"
    )

    def __str__(self):
        return f"{self.storymap.title} — {self.order}. {self.title}"

    class Meta:
        verbose_name = "Chapitre"
        verbose_name_plural = "Chapitres"
        ordering = ['order']
