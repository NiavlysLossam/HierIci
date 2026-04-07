/* map.js — HierIci
 * Dépendances : OpenLayers (ol) chargé avant ce script
 * Variable globale attendue :
 *   window.PHOTO_MARKER_URL — définie dans index.html via {% static %}
 */

let map, vectorSource, vectorLayer;

function closePanel() {
    const p = document.getElementById('photo-side-panel');
    p.classList.add('translate-x-full');
    p.classList.remove('translate-x-0');
}

function openAbout() {
    const m = document.getElementById('about-modal');
    m.classList.remove('hidden');
    requestAnimationFrame(() => {
        m.classList.remove('opacity-0');
        m.classList.add('opacity-100');
    });
}

function closeAbout(event) {
    const m = document.getElementById('about-modal');
    m.classList.remove('opacity-100');
    m.classList.add('opacity-0');
    setTimeout(() => { m.classList.add('hidden'); }, 300);
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        closeAbout();
        closeModal();
    }
});

function openImageModal(imgSrc, title) {
    if (!imgSrc || typeof imgSrc === 'object') {
        imgSrc = document.getElementById('panel-photo').src;
        title = document.getElementById('panel-photo').alt;
    }
    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-img');
    const modalCaption = document.getElementById('modal-caption');

    modalImg.src = imgSrc;
    modalCaption.innerText = title;
    
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        modal.classList.add('opacity-100');
    });
    document.body.style.overflow = 'hidden'; // Prevent scrolling
}
window.openModal = openImageModal;

function closeModal(event) {
    const modal = document.getElementById('image-modal');
    modal.classList.remove('opacity-100');
    modal.classList.add('opacity-0');
    setTimeout(() => { modal.classList.add('hidden'); }, 300);
    document.body.style.overflow = ''; // Restore scrolling
}

// Grille tuile WMTS standard pour la projection PM (pseudo-Mercator, EPSG:3857)
// PM_0_18 : niveaux 0-18 (couche 1950-1965)
// PM_3_18 : niveaux 3-18 (couche 1965-1980)
const pmOrigin = [-20037508.3428, 20037508.3428];
const pmResolutions = Array.from({ length: 19 }, (_, i) =>
    156543.03392811998 / Math.pow(2, i)
);
const pmMatrixIds018 = pmResolutions.map((_, i) => String(i));

function makePM018TileGrid() {
    return new ol.tilegrid.WMTS({
        origin: pmOrigin,
        resolutions: pmResolutions,
        matrixIds: pmMatrixIds018
    });
}

// PM_3_18 : niveaux 3 à 18 seulement
const pmResolutions318 = pmResolutions.slice(3); // index 3..18
const pmMatrixIds318 = pmResolutions318.map((_, i) => String(i + 3));

function makePM318TileGrid() {
    return new ol.tilegrid.WMTS({
        origin: pmOrigin,
        resolutions: pmResolutions318,
        matrixIds: pmMatrixIds318
    });
}

// Définition des fonds de plan
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
    Object.keys(baseLayers).forEach(k => {
        baseLayers[k].setVisible(k === key);
    });
    document.querySelectorAll('.layer-btn').forEach(btn => {
        const isActive = btn.dataset.layer === key;
        if (isActive) {
            btn.classList.add('bg-primary', 'text-white');
            btn.classList.remove('bg-primary/5', 'text-primary', 'hover:bg-primary/10');
        } else {
            btn.classList.remove('bg-primary', 'text-white');
            btn.classList.add('bg-primary/5', 'text-primary', 'hover:bg-primary/10');
        }
    });
}

window.onload = function () {
    // 1. Initialisation de la carte
    map = new ol.Map({
        target: 'map',
        layers: [
            baseLayers.darkMatter,
            baseLayers.voyager,
            baseLayers.ortho1950,
            baseLayers.ortho1965
        ],
        view: new ol.View({
            center: ol.proj.fromLonLat([2.1481, 43.9269]),
            zoom: 14
        })
    });

    // 2. Source de données
    vectorSource = new ol.source.Vector({
        url: '/api/photos/',
        format: new ol.format.GeoJSON()
    });

    const clusterSource = new ol.source.Cluster({
        distance: 40,
        source: vectorSource
    });

    vectorLayer = new ol.layer.Vector({
        source: clusterSource,
        style: function (feature) {
            const size = feature.get('features').length;
            if (size > 1) {
                return new ol.style.Style({
                    image: new ol.style.Circle({
                        radius: 18,
                        border: new ol.style.Stroke({
                            color: 'rgba(255, 255, 255, 0.5)',
                            width: 1
                        }),
                        fill: new ol.style.Fill({
                            color: 'rgba(26, 42, 58, 0.9)'
                        })
                    }),
                    text: new ol.style.Text({
                        text: size.toString(),
                        fill: new ol.style.Fill({
                            color: '#fff'
                        }),
                        font: 'bold 12px Inter, sans-serif'
                    })
                });
            }

            // Style pour un point unique
            const originalFeature = feature.get('features')[0];
            const azimuth = originalFeature.get('azimuth') || 0;
            return new ol.style.Style({
                image: new ol.style.Icon({
                    anchor: [0.5, 0.5],
                    src: window.PHOTO_MARKER_URL,
                    scale: 0.4,
                    rotation: (azimuth * Math.PI) / 180,
                    rotateWithView: true
                })
            });
        }
    });
    map.addLayer(vectorLayer);

    // 3. Interaction de sélection
    map.on('click', function (evt) {
        const feature = map.forEachFeatureAtPixel(evt.pixel, f => f);
        if (feature) {
            const features = feature.get('features');
            if (features.length > 1) {
                // Zoom sur le cluster
                const extent = ol.extent.createEmpty();
                features.forEach(f => ol.extent.extend(extent, f.getGeometry().getExtent()));
                map.getView().fit(extent, { duration: 500, padding: [50, 50, 50, 50] });
            } else {
                // Afficher les détails du point unique
                showPhotoDetails(features[0].getProperties());
            }
        } else {
            closePanel();
        }
    });

    // Change cursor on hover
    map.on('pointermove', function (e) {
        const pixel = map.getEventPixel(e.originalEvent);
        const hit = map.hasFeatureAtPixel(pixel);
        map.getTargetElement().style.cursor = hit ? 'pointer' : '';
    });
};

function showPhotoDetails(props) {
    const panel = document.getElementById('photo-side-panel');
    panel.classList.remove('translate-x-full');
    panel.classList.add('translate-x-0');

    // Photo logic 
    let displayImageUrl = props.image_url || props.image;
    if (props.image_url && props.image_url.includes('recherche-archives.tarn.fr')) {
        displayImageUrl = `/proxy-tarn-image/?url=${encodeURIComponent(props.image_url)}`;
    }

    const photoEl = document.getElementById('panel-photo');
    if (displayImageUrl) {
        photoEl.src = displayImageUrl;
        photoEl.alt = props.title;
    } else {
        photoEl.src = ''; 
        photoEl.alt = 'Aucune image disponible';
    }

    // Modal onClick inside HTML container is already bound to openImageModal()

    // Badges / Archive ID
    const archiveIdEl = document.getElementById('panel-archive-id');
    if (props.archive_id || props.year) {
        archiveIdEl.textContent = props.archive_id ? `Archive # ${props.archive_id}` : `Date: ${props.year}`;
        archiveIdEl.classList.remove('hidden');
    } else {
        archiveIdEl.classList.add('hidden');
    }

    const eraEl = document.getElementById('panel-era');
    if (props.era || props.year) {
        eraEl.textContent = props.era || `${props.year} ${props.is_approximate ? 'approx.' : ''}`;
        eraEl.classList.remove('hidden');
    } else {
        eraEl.classList.add('hidden');
    }

    document.getElementById('panel-title').textContent = props.title || "Sans Titre";
    
    // Details
    const dateEl = document.getElementById('panel-date');
    if (props.date_exacte || props.year) {
         dateEl.querySelector('.val').textContent = props.date_exacte || props.year;
         dateEl.classList.remove('hidden');
    } else {
         dateEl.classList.add('hidden');
    }

    const compassEl = document.getElementById('panel-compass');
    if (props.azimuth !== undefined && props.azimuth !== null) {
         compassEl.querySelector('.val').textContent = `${props.azimuth}°`;
         document.getElementById('panel-compass-icon').style.transform = `rotate(${props.azimuth}deg)`;
         compassEl.classList.remove('hidden');
    } else {
         compassEl.classList.add('hidden');
    }

    const descEl = document.getElementById('panel-desc');
    descEl.textContent = props.description || "Exploration d'une photographie ancienne géolocalisée.";

    const authorEl = document.getElementById('panel-author');
    authorEl.textContent = props.author_name || "Photographe inconnu";

    const sourceCont = document.getElementById('panel-source-container');
    const sourceName = props.source_name || "Archives locales";
    if (props.source_url) {
        sourceCont.innerHTML = `<p class="text-sm font-bold text-primary"><a href="${props.source_url}" target="_blank" class="hover:underline">${sourceName}</a></p><p class="text-[11px] text-slate-500">Source Externe</p>`;
    } else {
        sourceCont.innerHTML = `<p class="text-sm font-bold text-primary">${sourceName}</p><p class="text-[11px] text-slate-500">Domaine présumé</p>`;
    }
}
