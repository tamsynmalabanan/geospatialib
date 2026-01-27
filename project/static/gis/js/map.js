const MAP_DEFAULT_SETTINGS = {
    locked: false,
    unit: 'metric',
    terrain: false,
    projection: 'mercator',
    precision: 1000000,
    interactions: {
        tooltip: {
            active: true,
        },
        info: {
            active: true,
            targets: {
                osm: true,
                layers: true,
            }
        }
    },
    hillshade: {
        render: true,
        method: 'standard',
        exaggeration: 0.1,
        accent: '#000000',
        standard: {
            'hillshade-illumination-direction': 315,
            'hillshade-illumination-altitude': 45,
            'hillshade-highlight-color': '#FFFFFF',
            'hillshade-shadow-color': '#000000',
        },
        multidirectional: {
            'hillshade-illumination-direction': [315, 45, 135, 225],
            'hillshade-illumination-altitude': [45, 45, 45, 45],
            'hillshade-highlight-color': [
                '#ff0000',
                '#80ff00',
                '#00ffff',
                '#7f00ff',
            ],
            'hillshade-shadow-color': [
                '#503030',
                '#405030',
                '#305050',
                '#403050',
            ],
        }  
    },
    bookmark: {
        method: 'centroid',
        pitch: 0,
        bearing: 0,
        centroid: {
            zoom: 1,
            lng: 0,
            lat: 3,
        },
        bbox: {
            w: -140,
            s: -70,
            e: 160,
            n: 90,
            padding: 0,
            maxZoom: 1,
        }
    },
    basemap: {
        render: true,
        theme: 'auto',
        tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        maxzoom: 20,
        attribution: '&copy; OpenStreetMap Contributors',
        paints: {
            light: {
                basemap: {
                    'raster-resampling': 'linear',
                    'raster-opacity': 1,
                    'raster-hue-rotate': 0,
                    'raster-brightness-min': 0,
                    'raster-brightness-max': 1,
                    'raster-saturation': 0,
                    'raster-contrast': 0,
                },
                sky: {
                    "sky-color": "#88c6fc",
                    "horizon-color": "#ffffff",
                    "fog-color": "#ffffff",
                    "fog-ground-blend": 0.5,
                    "horizon-fog-blend": 0.8,
                    "sky-horizon-blend": 0.8,
                    "atmosphere-blend": 0.8
                },
            },
            dark: {
                basemap: {
                    'raster-resampling': 'linear',
                    'raster-opacity': 1, // 0 to 1
                    'raster-hue-rotate': 0, // 0 to 360
                    'raster-brightness-min': 0, // 0 to 1
                    'raster-brightness-max': 0.005, // 0 to 1
                    'raster-saturation': -1, // -1 to 1
                    'raster-contrast': 0.995, // -1 to 1
                },
                sky: {
                    "sky-color": "#02294b",
                    "horizon-color": "#808080",
                    "fog-color": "#808080",
                    "fog-ground-blend": 0.5,
                    "horizon-fog-blend": 0.8,
                    "sky-horizon-blend": 0.8,
                    "atmosphere-blend": 0.8
                }
            },
        }
    }
}

const createNewMap = (el) => {
    let settings = el.dataset.mapSettings || localStorage.getItem('mapSettings')
    settings = settings ? JSON.parse(settings) : structuredClone(MAP_DEFAULT_SETTINGS)

    const basemapTheme = settings.basemap.paints[(
        settings.basemap.theme === 'light' || (
            settings.basemap.theme === 'auto' 
            && getPreferredTheme() !== 'dark'
        )
    ) ? 'light' : 'dark']

    const map = new maplibregl.Map({
        container: el.id,

        pitch: settings.bookmark.pitch,
        bearing: settings.bookmark.bearing,
        ...(settings.bookmark.method === 'centroid' ? {
            zoom: settings.bookmark.centroid.zoom,
            center: Array('lng', 'lat').map(i => settings.bookmark.centroid[i]),
        } : {}),
        
        hash: false,
        style: {
            version: 8,
            sources: {
                basemap: {
                    type: 'raster',
                    tileSize: settings.basemap.tileSize,
                    maxzoom: settings.basemap.maxzoom,
                    tiles: settings.basemap.tiles,
                    attribution: settings.basemap.attribution,
                },
                terrain: {
                    type: 'raster-dem',
                    tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
                    tileSize: 256,
                    attribution: 'Terrain Tiles © Mapzen, <a href="https://registry.opendata.aws/terrain-tiles/" target="_blank">Registry of Open Data on AWS</a>',
                    encoding: 'terrarium' 
                },
            },
            layers: [
                ...(settings.basemap.render ? [{
                    id: 'basemap',
                    type: 'raster',
                    source: 'basemap',
                    paint: basemapTheme.basemap
                }] : []),         
            ],
            ...(settings.basemap.render ? {
                sky: basemapTheme.sky
            }: {})
        },
        maxZoom: 22,
        maxPitch: 75,

        interactive: !settings.locked
    })

    map.on('load', () => {
        new SourcesHandler(map)
        new ControlsHandler(map, settings)
        new InteractionsHandler(map)
        
        console.log(map)
    })   
}