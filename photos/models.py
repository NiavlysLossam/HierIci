from django.contrib.gis.db import models

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
