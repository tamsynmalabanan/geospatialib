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
    },
    legend: {
        sources: {},
        layers: {}
    },
}

class MapLibreMap extends maplibregl.Map {
    constructor(el) {
        const settings = (() => {
            const mapId = el.dataset.mapId
            if (mapId) {
                console.log('fetch map settings')
            } else {
                const storedSettings = localStorage.getItem('mapSettings')
                if (storedSettings) {
                    return JSON.parse(storedSettings)
                }
            }
    
            return structuredClone(MAP_DEFAULT_SETTINGS)
        })()

        const basemapTheme = settings.basemap.paints[(
            settings.basemap.theme === 'light' || (
                settings.basemap.theme === 'auto' 
                && getPreferredTheme?.() !== 'dark'
            )
        ) ? 'light' : 'dark']

        const options = {
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
        }
        
        super(options)
        this.on('load', () => {
            new SourcesHandler(this)
            new ControlsHandler(this)
            new InteractionsHandler(this)
        }) 
        
        this._settings = settings
        this.configAddLayer()
        this.configRemoveLayer()
        this.configFitBounds()
    }

    getBbox() {
        return this.getBounds().toArray().flatMap(i => i)
    }

    bboxToGeoJSON() {
        const bbox = this.getBbox()
        const normalBbox = normalizeBbox(bbox)
        const [w,s,e,n] = normalBbox
        
        return turf.featureCollection([
            turf.bboxPolygon(normalBbox), 
            ...Object.keys(bbox).map(i => {
                const diff = bbox[i] - normalBbox[i]

                if (diff != 0) {
                    if (i == 0) {
                        return turf.bboxPolygon([180+diff, s, 180, n])
                    }
                    
                    if (i == 2) {
                        return turf.bboxPolygon([-180, s, -180+diff, n])
                    }
                }
            }).filter(Boolean)
        ])
    }

    configAddLayer() {
        const originalAddLayer = this.addLayer.bind(this)

        this.addLayer = (layer, beforeId) => {
            const result = originalAddLayer(layer, beforeId)
            this.fire('layeradded', { layer })
            return result
        }
    }

    configRemoveLayer() {
        const originalRemoveLayer = this.removeLayer.bind(this)

        this.removeLayer = (layerId) => {
            const result = originalRemoveLayer(layerId)
            this.fire('layerremoved', { layerId })
            return result
        }
    }

    configFitBounds() {
        const original = this.fitBounds.bind(this)

        this.fitBounds = (bounds, options) => {
            if (this._settings.locked) {
                console.log('map view locked.')
                return
            } else {
                const result = original(bounds, options)
                return result
            }
        }
    }
}