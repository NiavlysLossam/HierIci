/* storymap.js — HierIci Storymap
 * Dépendances : OpenLayers (ol) chargé avant ce script
 * Variables globales attendues (injectées depuis storymap.html) :
 *   window.STORYMAP_SLUG
 *   window.STORYMAP_API_URL
 *   window.PHOTO_MARKER_URL
 */

(function () {
    'use strict';

    // -----------------------------------------------------------------------
    // 1. Fonds de plan (identiques à map.js, contexte isolé)
    // -----------------------------------------------------------------------
    const pmOrigin = [-20037508.3428, 20037508.3428];
    const pmResolutions = Array.from({ length: 19 }, (_, i) =>
        156543.03392811998 / Math.pow(2, i)
    );
    const pmMatrixIds018 = pmResolutions.map((_, i) => String(i));
    const pmResolutions318 = pmResolutions.slice(3);
    const pmMatrixIds318 = pmResolutions318.map((_, i) => String(i + 3));

    function makePM018TileGrid() {
        return new ol.tilegrid.WMTS({
            origin: pmOrigin, resolutions: pmResolutions, matrixIds: pmMatrixIds018
        });
    }

    function makePM318TileGrid() {
        return new ol.tilegrid.WMTS({
            origin: pmOrigin, resolutions: pmResolutions318, matrixIds: pmMatrixIds318
        });
    }

    const baseLayers = {
        darkMatter: new ol.layer.Tile({
            source: new ol.source.XYZ({
                url: 'https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                attributions: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            }),
            visible: true
        }),
        voyager: new ol.layer.Tile({
            source: new ol.source.XYZ({
                url: 'https://{a-c}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
                attributions: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            }),
            visible: false
        }),
        ortho1950: new ol.layer.Tile({
            source: new ol.source.WMTS({
                url: 'https://data.geopf.fr/wmts',
                layer: 'ORTHOIMAGERY.ORTHOPHOTOS.1950-1965',
                matrixSet: 'PM_0_18',
                format: 'image/png',
                style: 'normal',
                tileGrid: makePM018TileGrid(),
                attributions: '&copy; <a href="https://www.geoportail.gouv.fr">Géoportail (IGN)</a>',
                crossOrigin: 'anonymous'
            }),
            visible: false
        }),
        ortho1965: new ol.layer.Tile({
            source: new ol.source.WMTS({
                url: 'https://data.geopf.fr/wmts',
                layer: 'ORTHOIMAGERY.ORTHOPHOTOS.1965-1980',
                matrixSet: 'PM_3_18',
                format: 'image/png',
                style: 'BDORTHOHISTORIQUE',
                tileGrid: makePM318TileGrid(),
                attributions: '&copy; <a href="https://www.geoportail.gouv.fr">Géoportail (IGN)</a>',
                crossOrigin: 'anonymous'
            }),
            visible: false
        })
    };

    function switchBaseLayer(key) {
        Object.keys(baseLayers).forEach(k => baseLayers[k].setVisible(k === key));
    }

    // -----------------------------------------------------------------------
    // 2. Initialisation de la carte
    // -----------------------------------------------------------------------
    let map;
    let markerSource;

    function markerStyle(azimuth) {
        return new ol.style.Style({
            image: new ol.style.Icon({
                anchor: [0.5, 0.5],
                src: window.PHOTO_MARKER_URL,
                scale: 0.5,
                rotation: ((azimuth || 0) * Math.PI) / 180,
                rotateWithView: true
            })
        });
    }

    function updateMarker(chapter) {
        if (!chapter.longitude || !chapter.latitude) return;
        markerSource.clear();
        const feature = new ol.Feature({
            geometry: new ol.geom.Point(
                ol.proj.fromLonLat([chapter.longitude, chapter.latitude])
            )
        });
        feature.setStyle(markerStyle(chapter.photo_azimuth || 0));
        markerSource.addFeature(feature);
    }

    function initMap(firstChapter) {
        const center = firstChapter
            ? ol.proj.fromLonLat([firstChapter.longitude, firstChapter.latitude])
            : ol.proj.fromLonLat([2.1481, 43.9269]);
        const zoom = firstChapter ? firstChapter.zoom : 14;

        map = new ol.Map({
            target: 'map',
            layers: Object.values(baseLayers),
            view: new ol.View({ center, zoom })
        });

        if (firstChapter) {
            switchBaseLayer(firstChapter.baselayer);
        }

        // Couche marqueur unique (chapitre actif)
        markerSource = new ol.source.Vector();
        const markerLayer = new ol.layer.Vector({
            source: markerSource
        });
        map.addLayer(markerLayer);

        // Afficher le marqueur du premier chapitre
        if (firstChapter) {
            updateMarker(firstChapter);
        }
    }


    // -----------------------------------------------------------------------
    // 3. Fly-to vers un chapitre
    // -----------------------------------------------------------------------
    function flyToChapter(chapter) {
        const view = map.getView();
        view.animate({
            center: ol.proj.fromLonLat([chapter.longitude, chapter.latitude]),
            zoom: chapter.zoom,
            duration: 900,
            easing: ol.easing.easeOut
        });
        switchBaseLayer(chapter.baselayer);
        updateMarker(chapter);
        updateIndicator(chapter);
    }


    // -----------------------------------------------------------------------
    // 4. Indicateur de chapitre
    // -----------------------------------------------------------------------
    const indicator = document.getElementById('chapter-indicator');
    let indicatorTimer;

    function updateIndicator(chapter) {
        indicator.textContent = chapter.title;
        indicator.classList.add('visible');
        clearTimeout(indicatorTimer);
        indicatorTimer = setTimeout(() => indicator.classList.remove('visible'), 3000);
    }

    // -----------------------------------------------------------------------
    // 5. Construction du DOM des chapitres
    // -----------------------------------------------------------------------
    function buildChapters(chapters) {
        const container = document.getElementById('story-chapters');

        chapters.forEach((ch, idx) => {
            // Wrapper chapitre
            const div = document.createElement('div');
            div.className = 'chapter';
            div.dataset.idx = idx;

            // Card
            const card = document.createElement('div');
            card.className = 'chapter-card';

            // Numéro
            const num = document.createElement('div');
            num.className = 'chapter-number';
            num.textContent = `Chapitre ${idx + 1}`;
            card.appendChild(num);

            // Titre
            const h2 = document.createElement('h2');
            h2.textContent = ch.title;
            card.appendChild(h2);

            // Texte narratif
            if (ch.narrative) {
                const p = document.createElement('p');
                p.className = 'chapter-narrative';
                p.textContent = ch.narrative;
                card.appendChild(p);
            }

            // Photo
            if (ch.photo_image) {
                const photoWrap = document.createElement('div');
                photoWrap.className = 'chapter-photo-wrap';

                const img = document.createElement('img');
                img.src = ch.photo_image;
                img.alt = ch.photo_title || ch.title;
                img.loading = 'lazy';
                photoWrap.appendChild(img);

                if (ch.photo_title) {
                    const caption = document.createElement('div');
                    caption.className = 'chapter-photo-caption';
                    caption.textContent = ch.photo_title;
                    photoWrap.appendChild(caption);
                }

                card.appendChild(photoWrap);
            }

            div.appendChild(card);
            container.appendChild(div);
        });
    }

    // -----------------------------------------------------------------------
    // 6. IntersectionObserver — déclenchement du fly-to au scroll
    // -----------------------------------------------------------------------
    let chapters = [];
    let activeIdx = -1;

    function setupScrollObserver(chaptersData) {
        const chapterEls = document.querySelectorAll('.chapter[data-idx]');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;

                const idx = parseInt(entry.target.dataset.idx, 10);
                if (idx === activeIdx) return;

                activeIdx = idx;
                const chapter = chaptersData[idx];

                // Mise à jour visuelle : chapitre actif
                document.querySelectorAll('.chapter[data-idx]').forEach(el => {
                    el.classList.toggle('active', parseInt(el.dataset.idx, 10) === idx);
                });

                // Déplacer la carte
                flyToChapter(chapter);
            });
        }, {
            root: document.getElementById('story-scroll'),
            threshold: 0.45   // déclenche quand 45% du chapitre est visible
        });

        chapterEls.forEach(el => observer.observe(el));
    }

    // -----------------------------------------------------------------------
    // 7. Chargement des données et initialisation
    // -----------------------------------------------------------------------
    async function init() {
        try {
            const response = await fetch(window.STORYMAP_API_URL);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            // Remplir l'intro
            document.getElementById('story-title').textContent = data.title;
            document.title = `${data.title} — HierIci`;
            if (data.description) {
                document.getElementById('story-description').textContent = data.description;
            }

            chapters = data.chapters;

            // Initialiser la carte sur le premier chapitre
            initMap(chapters.length > 0 ? chapters[0] : null);

            // Construire les chapitres dans le DOM
            buildChapters(chapters);

            // Démarrer l'observation
            if (chapters.length > 0) {
                setupScrollObserver(chapters);
            }

        } catch (err) {
            console.error('Impossible de charger la storymap :', err);
            document.getElementById('story-title').textContent = 'Erreur de chargement';
        }
    }

    // Lancer après chargement du DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
