class ProjectionControl {
    constructor(options = {}) {
        this.options = options;
        this.container = null;
    }

    onAdd(map) {
        this.map = map;
        this.container = document.createElement('div');
        this.container.className = 'maplibregl-ctrl projection-control';
        this.container.style.padding = '5px';
        this.container.style.background = 'white';
        this.container.style.borderRadius = '4px';
        this.container.innerHTML = `<button><i class="bi bi-globe-americas"></i></button>`;
        
        this.container.querySelector('button').addEventListener('click', () => {
            console.log(map, this.map.getProjection())
            this.map.setProjection({
                type: 'globe',
            });
        });

        return this.container;
    }

    onRemove() {
        this.container.parentNode.removeChild(this.container);
        this.map = undefined;
    }
}

const setDefaultMapLibreProjection = (map) => {
    const type = 'mercator'
    map.setProjection({type})
    if (!map.getProjection) map.getProjection = () => type
}

const initMapLibreMap = (el) => {
    const map = new maplibregl.Map({
        container: el.id,
        zoom: 0,
        center: [0,0],
        pitch: 0,
        hash: true,
        style: {
            version: 8,
            sources: {
                osm: {
                    type: 'raster',
                    tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
                    tileSize: 256,
                    attribution: '&copy; OpenStreetMap Contributors',
                    maxzoom: 20
                },
                terrainSource: {
                    type: 'raster-dem',
                    url: 'https://demotiles.maplibre.org/terrain-tiles/tiles.json',
                    tileSize: 256
                },
                hillshadeSource: {
                    type: 'raster-dem',
                    url: 'https://demotiles.maplibre.org/terrain-tiles/tiles.json',
                    tileSize: 256
                }
            },
            layers: [
                {
                    id: 'osm',
                    type: 'raster',
                    source: 'osm'
                },
                {
                    id: 'hills',
                    type: 'hillshade',
                    source: 'hillshadeSource',
                    layout: {visibility: 'visible'},
                    paint: {'hillshade-shadow-color': '#473B24'}
                }
            ],
            terrain: {
                source: 'terrainSource',
                exaggeration: 1
            },
            sky: {}
        },
        maxZoom: 18,
        maxPitch: 85
    })

    map.on('style.load', () => {
        setDefaultMapLibreProjection(map)
    })

    map.addControl(
        new maplibregl.NavigationControl({
            visualizePitch: true,
            showZoom: true,
            showCompass: true
        })
    )

    map.addControl(
        new maplibregl.TerrainControl({
            source: 'terrainSource',
            exaggeration: 1
        })
    )

    map.addControl(new ProjectionControl(), 'top-right')
}