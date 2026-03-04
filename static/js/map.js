/* map.js — HierIci
 * Dépendances : OpenLayers (ol) chargé avant ce script
 * Variable globale attendue :
 *   window.PHOTO_MARKER_URL — définie dans index.html via {% static %}
 */

let map, vectorSource, vectorLayer;

function closePanel() {
    document.getElementById('side-panel').classList.remove('open');
}

function openAbout() {
    const m = document.getElementById('about-modal');
    m.style.display = 'flex';
    // Force reflow pour déclencher la transition
    requestAnimationFrame(() => m.classList.add('active'));
}

function closeAbout(event) {
    const m = document.getElementById('about-modal');
    m.classList.remove('active');
    setTimeout(() => { m.style.display = 'none'; }, 300);
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAbout();
});

function openModal(imgSrc, title) {
    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-img');
    const modalCaption = document.getElementById('modal-caption');

    modalImg.src = imgSrc;
    modalCaption.innerText = title;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
}

function closeModal(event) {
    const modal = document.getElementById('image-modal');
    modal.classList.remove('active');
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
        btn.classList.toggle('active', btn.dataset.layer === key);
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
    const panel = document.getElementById('side-panel');
    const photoEl = document.getElementById('panel-photo');
    const bodyEl = document.getElementById('panel-body');

    panel.classList.add('open');

    // Photo logic (Hybrid: remote URL or local image)
    let displayImageUrl = props.image_url || props.image;

    // Si l'image provient des archives du Tarn, on passe par notre proxy local
    if (props.image_url && props.image_url.includes('recherche-archives.tarn.fr')) {
        displayImageUrl = `/proxy-tarn-image/?url=${encodeURIComponent(props.image_url)}`;
    }

    photoEl.innerHTML = displayImageUrl
        ? `<img src="${displayImageUrl}" alt="${props.title}" onclick="openModal('${displayImageUrl}', '${props.title.replace(/'/g, "\\'")}')">`
        : `<div style="color:white">Aucune image disponible</div>`;

    // Metadata badges
    let badges = '';
    if (props.year) badges += `<span class="badge">${props.year} ${props.is_approximate ? 'approx.' : ''}</span>`;
    if (props.azimuth !== undefined) badges += `<span class="badge">${props.azimuth}°</span>`;

    // Footer
    let footer = '';
    if (props.source_name) {
        const source = props.source_url
            ? `<a href="${props.source_url}" target="_blank">${props.source_name}</a>`
            : props.source_name;
        footer += `<div><strong>Source :</strong> ${source}</div>`;
    }
    if (props.author_name) footer += `<div><strong>Auteur :</strong> ${props.author_name}</div>`;

    bodyEl.innerHTML = `
        <h2>${props.title}</h2>
        <div class="metadata">${badges}</div>
        <p class="description">${props.description || "Exploration d'une photographie ancienne géolocalisée."}</p>
        
        <div class="compass-indicator">
            <svg class="compass-icon" style="transform: rotate(${props.azimuth || 0}deg)" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L15 8H9L12 2Z" fill="#1a2a3a"/>
                <circle cx="12" cy="12" r="8" stroke="#1a2a3a" stroke-width="2"/>
                <path d="M12 22V16" stroke="#1a2a3a" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span>Orientation : ${props.azimuth || 0}°</span>
        </div>

        <div class="footer-info">
            ${footer}
        </div>
    `;
}
