const MAP_DEFAULTS = {
    basemap: {
        default: {
            'raster-opacity': 1,
            'raster-hue-rotate': 0,
            'raster-brightness-min': 0,
            'raster-brightness-max': 1,
            'raster-saturation': 0,
            'raster-contrast': 0,
        },
        grayscale: {
            'raster-opacity': 1, // 0 to 1
            'raster-hue-rotate': 200, // 0 to 360
            'raster-brightness-min': 0, // 0 to 1
            'raster-brightness-max': 0.01, // 0 to 1
            'raster-saturation': -1, // -1 to 1
            'raster-contrast': 0.99, // -1 to 1
        }
    },
    sky: {
        default: {
            "sky-color": "#88C6FC",
            "horizon-color": "#ffffff",
            "fog-color": "#ffffff",
            "fog-ground-blend": 0.5,
            "horizon-fog-blend": 0.8,
            "sky-horizon-blend": 0.8,
            "atmosphere-blend": 0.8
        },
        grayscale: {
            "sky-color": "hsla(208, 95%, 15%, 1.00)",
            "horizon-color": "hsla(0, 0%, 50%, 1.00)",
            "fog-color": "hsla(0, 0%, 50%, 1.00)",
            "fog-ground-blend": 0.5,
            "horizon-fog-blend": 0.8,
            "sky-horizon-blend": 0.8,
            "atmosphere-blend": 0.8
        }
    },
    hillshade: {
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
    }
}

const createNewMap = (el) => {
    const map = new maplibregl.Map({
        container: el.id,
        zoom: 0,
        center: [0,0],
        pitch: 0,
        hash: false,
        style: {
            version: 8,
            sources: {
                basemap: {
                    type: 'raster',
                    tileSize: 256,
                    maxzoom: 20,
                    tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
                    attribution: '&copy; OpenStreetMap Contributors',
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
                {
                    id: 'basemap',
                    type: 'raster',
                    source: 'basemap',
                    paint: (
                        getPreferredTheme() === 'light' 
                        ? MAP_DEFAULTS.basemap.default 
                        : MAP_DEFAULTS.basemap.grayscale
                    )
                },         
            ],
            sky: (
                getPreferredTheme() === 'light' 
                ? MAP_DEFAULTS.sky.default 
                : MAP_DEFAULTS.sky.grayscale
            )
        },
        maxZoom: 22,
        maxPitch: 85
    })

    map.on('load', () => {
        map.sourcesHandler = new SourcesHandler(map)
        map.controlsHandler = new ControlsHandler(map)
        map.interactionsHandler = new InteractionsHandler(map)
        
        console.log(map)
    })   
}