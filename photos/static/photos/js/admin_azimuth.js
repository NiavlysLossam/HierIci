(function() {
    'use strict';

    // Attendre que le DOM soit chargé
    document.addEventListener('DOMContentLoaded', function() {
        const azimuthInput = document.getElementById('id_azimuth');
        if (!azimuthInput) return;

        console.log("Admin Azimuth script chargé.");

        // On cherche la carte GeoDjango
        // Django stocke l'objet MapWidget dans une variable globale nommée geodjango_[field_name]
        // Dans notre cas : geodjango_location
        
        function initRotationTool() {
            const widget = window.geodjango_location;
            if (!widget || !widget.map) {
                setTimeout(initRotationTool, 500);
                return;
            }

            const map = widget.map;
            console.log("Carte trouvée, ajout de l'interaction de rotation.");

            // On ajoute une interaction pour capturer le clic droit ou un modificateur pour la rotation
            // Plus simple : Un bouton sur la carte pour basculer en mode rotation
            
            map.on('click', function(evt) {
                // Si on a déjà un point, on peut imaginer que le clic définit la direction
                // Mais Django Admin gère déjà le clic pour déplacer le point.
                // Donc on va utiliser Alt + Clic pour l'azimut.
                if (evt.originalEvent.altKey) {
                    const feature = widget.layers.vector.getSource().getFeatures()[0];
                    if (feature) {
                        const point = feature.getGeometry().getCoordinates();
                        const clickCoord = evt.coordinate;
                        
                        // Calcul de l'angle entre le point et le clic
                        const dx = clickCoord[0] - point[0];
                        const dy = clickCoord[1] - point[1];
                        let angle = Math.atan2(dx, dy) * (180 / Math.PI);
                        
                        if (angle < 0) angle += 360;
                        
                        azimuthInput.value = Math.round(angle);
                        console.log("Nouvel azimut défini : " + azimuthInput.value);
                        
                        // Mettre à jour le style pour retour visuel
                        feature.setStyle(createStyle(angle));
                        
                        evt.preventDefault();
                        evt.stopPropagation();
                    }
                }
            });

            function createStyle(azimuth) {
                return new ol.style.Style({
                    image: new ol.style.Icon({
                        anchor: [0.5, 0.5],
                        src: 'https://cdn-icons-png.flaticon.com/512/10427/10427063.png',
                        scale: 0.05,
                        rotation: (azimuth * Math.PI) / 180
                    })
                });
            }

            // Style initial si une valeur existe
            const initialAzimuth = parseInt(azimuthInput.value) || 0;
            const source = widget.layers.vector.getSource();
            source.on('addfeature', function(e) {
                e.feature.setStyle(createStyle(initialAzimuth));
            });
        }

        initRotationTool();
    });
})();
