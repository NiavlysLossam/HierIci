from django.contrib.gis.forms.widgets import OSMWidget

class AzimuthMapWidget(OSMWidget):
    
    class Media:
        js = (
            'photos/js/admin_azimuth.js',
        )
