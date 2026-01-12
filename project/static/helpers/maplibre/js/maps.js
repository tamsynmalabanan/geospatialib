const initMapLibreMap = (el) => {
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
                    encoding: 'terrarium' // important: AWS uses Terrarium encoding
                },
            },
            layers: [
                {
                    id: 'basemap',
                    type: 'raster',
                    source: 'basemap',
                },
                
            ],
            sky: {
                "sky-color": "#88C6FC",
                "horizon-color": "#ffffff",
                "fog-color": "#ffffff",
                "fog-ground-blend": 0.5,
                "horizon-fog-blend": 0.8,
                "sky-horizon-blend": 0.8,
                "atmosphere-blend": 0.8
            }
        },
        maxZoom: 22,
        maxPitch: 85
    })

    map.on('style.load', () => {
        const settings = new SettingsControl()
        map.addControl(settings, 'bottom-right')
        settings.syncTheme()
        console.log(map)
    })   
}