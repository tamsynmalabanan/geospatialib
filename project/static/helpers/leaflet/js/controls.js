const handleLeafletZoombar = (map, {include=true}={}) => {
    if (!include) return map.removeControl(map.zoomControl)

    const container = map.zoomControl.getContainer()
    container.classList.add('border-0', 'shadow-lg')

    const defaultClass = ['border-0', 'd-flex', 'justify-content-center', 'align-items-center']
    const buttonClass = {
        _zoomInButton: {
            icon: createIcon({className: 'bi bi-plus-lg'}),
            class: defaultClass.concat(['rounded-top', 'rounded-bottom-0'])
        },
        _zoomOutButton: {
            icon: createIcon({className: 'bi bi-dash-lg'}),
            class: defaultClass.concat(['rounded-bottom', 'rounded-top-0'])
        },
    }

    for (const buttonName in buttonClass) {
        const data = buttonClass[buttonName]
        const button = map.zoomControl[buttonName]
        button.innerHTML = data.icon.outerHTML
        button.classList.add(...data.class)
    }
}

const handleLeafletScaleBar = (map, {include=true}={}) => {
    if (!include) return

    const scaleBar = L.control.scale({ position: 'bottomright' }).addTo(map)
    map._scaleBar = scaleBar
}

const handleLeafletSearchBar = (map, {include=true}={}) => {
    if (!include || !L.Control.geocoder) return

    const geocoder = L.Control.geocoder({
        defaultMarkGeocode: false,
        position: 'topleft',
    })
    .on('markgeocode', (e) => {
        var bbox = e.geocode.bbox;
        var poly = L.polygon([
            bbox.getSouthEast(),
            bbox.getNorthEast(),
            bbox.getNorthWest(),
            bbox.getSouthWest()
        ]);
        map.fitBounds(poly.getBounds());
    })
    .addTo(map);

    const geocoderContainer = geocoder.getContainer()
    const topLeftContainer = map._controlCorners.topleft
    if (topLeftContainer.firstChild !== geocoderContainer) {
        topLeftContainer.insertBefore(geocoderContainer, topLeftContainer.firstChild);
    }

    const button = geocoderContainer.querySelector('button')
    button.innerText = ''
    button.innerHTML = createIcon({className: 'bi bi-binoculars-fill'}).outerHTML

    const geocoderFieldsSelector = map.getContainer().parentElement.dataset.mapGeocoderFields
    if (geocoderFieldsSelector) {
        document.addEventListener('change', (event) => {
            if (!event.target.matches(geocoderFieldsSelector)) return

            const place = event.target.value
            if (place === '') return
         
            geocoder.setQuery(place)
            geocoder._geocode()
        })
        
        geocoder.on('markgeocode', (e) => {
            const geocoderFields = document.querySelectorAll(geocoderFieldsSelector)
            geocoderFields.forEach(field => {
                if (field.value.toLowerCase() === e.target._lastGeocode.toLowerCase()) {
                    field.value = e.geocode.name
                }
            })
        })
    }

    document.addEventListener('keydown', (e) => {
        if (e.altKey && e.key === 'a') {
            L.DomEvent.preventDefault(e)
            geocoder.getContainer().firstChild.click()
        }
    })
}

const handleLeafletRestViewBtn = (map, {include=true}={}) => {
    const resetViewControl = map.resetviewControl
    if (!include) return map.removeControl(resetViewControl)
    
    const container = resetViewControl.getContainer()
    const control = container.querySelector('a')
    control.innerHTML = createIcon({className: 'bi bi-globe-americas'}).outerHTML
    
    resetViewControl._defaultBounds = L.latLngBounds(L.latLng(-80, -220), L.latLng(85, 220))
    resetViewControl.getBounds = () => resetViewControl._defaultBounds

    control.addEventListener('click', () => {
        map._viewReset = true
    })

    document.addEventListener('keydown', (e) => {
        if (e.altKey && e.key === 's') {
            L.DomEvent.preventDefault(e)
            control.click()
        }
    })
}

const handleLeafletLocateBtn = (map, {include=true}={}) => {
    if (!include) return

    const locateControl = L.control.locate({
        position: 'topleft',
        setView: 'untilPanOrZoom',
        cacheLocation: true,
        locateOptions: {
            maxZoom: 18
        },
        strings: {
            title: "Zoom to my location (alt+d)"
        },
        showPopup: false,
        drawCircle: false,
    }).addTo(map);

    document.addEventListener('keydown', (e) => {
        if (e.altKey && e.key === 'd') {
            L.DomEvent.preventDefault(e)
            locateControl._link.click()
        }
    })
}

const handleLeafletDrawBtns = (map, {
    include=true,
    targetLayer=L.geoJSON(),
} = {}) => {
    const drawControlChangesKey = `draw-control-changes-${map.getContainer().id}`
    
    if (map._drawControl) {
        map.removeControl(map._drawControl)
        delete map._drawControl
        localStorage.removeItem(drawControlChangesKey)
    }

    if (!include) return

    const styleParams = getLeafletStyleParams({fillColor: 'hsla(60, 100%, 50%, 1)', strokeWidth: 3})

    const drawControl = map._drawControl = new L.Control.Draw({
        position: 'topleft',
        draw: {
            polyline: {shapeOptions: getLeafletLayerStyle({geometry: {type: 'polyline'}}, styleParams)},
            polygon: {shapeOptions: getLeafletLayerStyle({geometry: {type: 'polygon'}}, styleParams)},
            rectangle: {shapeOptions: getLeafletLayerStyle({geometry: {type: 'polygon'}}, styleParams)},
            marker: {icon: getLeafletLayerStyle({geometry: {type: 'point'}}, styleParams, {allowCircleMarker:false})},

            circle: false,
            circlemarker: false,
        },
        edit: {
            featureGroup: targetLayer,
        }
    })

    const updateDrawControlChanges = (data, {geojson} = {}) => {
        if (!data) return

        const current = JSON.parse(localStorage.getItem(drawControlChangesKey) ?? '[]')
        current.push(data)
        localStorage.setItem(drawControlChangesKey, JSON.stringify(current))
    
        targetLayer._group.getLayers().forEach(i => {
            if (i._dbIndexedKey !== targetLayer._dbIndexedKey) return
            updateLeafletGeoJSONLayer(i, {geojson, updateCache: false})
        })
    }

    const drawEvents = {
        'created': (async (e) => {
            const geojson = turf.featureCollection([e.layer.toGeoJSON()])
            
            if (!targetLayer._dbIndexedKey) return targetLayer.addData(geojson)
            
            await normalizeGeoJSON(geojson)

            await updateGISDB(
                targetLayer._dbIndexedKey, 
                turf.clone(geojson),
                turf.bboxPolygon(turf.bbox(geojson)).geometry,
            )

            updateDrawControlChanges({
                type: 'created', 
                features: [{
                    old: null, 
                    new: geojson.features[0]
                }]
            })
        }),
        'deleted': async (e) => {
            if (!targetLayer._dbIndexedKey) return
            
            const geojson = e.layers.toGeoJSON()

            const {gisData, queryExtent} = await getFromGISDB(targetLayer._dbIndexedKey)
            gisData.features = gisData.features.filter(feature1 => {
                return !(geojson.features.find(feature2 => {
                    const propertiesEqual = JSON.stringify(feature1.properties) === JSON.stringify(feature2.properties)
                    const geometriesEqual = turf.booleanEqual(feature1.geometry, feature2.geometry)
                    return propertiesEqual && geometriesEqual
                }))           
            })
            
            saveToGISDB(gisData, {
                id: targetLayer._dbIndexedKey,
                queryExtent: turf.bboxPolygon(turf.bbox(gisData))
            })

            updateDrawControlChanges({
                type: 'deleted',
                features: geojson.features.map(i => {
                    return {old: i, new: null}
                }, {geojson: gisData})
            })
        },
        'edited': async (e) => {
            if (!targetLayer._dbIndexedKey) return
            
            const features = e.layers.getLayers().map(i => {
                return {old: i.feature, new: i.toGeoJSON()}
            })

            const {gisData, queryExtent} = await getFromGISDB(targetLayer._dbIndexedKey)
            gisData.features = [...gisData.features.filter(feature1 => {
                return !(features.find(i => {
                    const feature2 = i.old
                    const propertiesEqual = JSON.stringify(feature1.properties) === JSON.stringify(feature2.properties)
                    const geometriesEqual = turf.booleanEqual(feature1.geometry, feature2.geometry)
                    return propertiesEqual && geometriesEqual
                }))           
            }), ...features.map(i => i.new)]
            
            saveToGISDB(gisData, {
                id: targetLayer._dbIndexedKey,
                queryExtent: turf.bboxPolygon(turf.bbox(gisData))
            })
    
            updateDrawControlChanges({
                type: 'edited',
                features,
            }, {geojson: gisData})
        },
        // 'drawstart': (e) => {
        //     disableMapInteractivity(map)
        // },
        // 'drawstop': (e) => {
        //     enableMapInteractivity(map)
        // },
        // 'editstart': (e) => {
        //     disableMapInteractivity(map)
        // },
        // 'editstop': (e) => {
        //     enableMapInteractivity(map)
        // },
        // 'deletestart': (e) => {
        //     disableMapInteractivity(map)
        // },
        // 'deletestop': (e) => {
        //     enableMapInteractivity(map)
        // },
    }

    Object.keys(drawEvents).forEach(i => map.on(`draw:${i}`, drawEvents[i]))
    drawControl.onRemove = (map) => Object.keys(drawEvents).forEach(i => map.off(`draw:${i}`))
    
    drawControl.addTo(map)
    return drawControl
}

const leafletControls = {
    zoom: handleLeafletZoombar,
    scale: handleLeafletScaleBar,
    search: handleLeafletSearchBar,
    reset: handleLeafletRestViewBtn,
    locate: handleLeafletLocateBtn,
}

const handleLeafletMapControls = async (map) => {
    const container = map.getContainer()
    const dataset = container.parentElement.dataset
    const includedControls = dataset.mapControlsIncluded
    const excludedControls = dataset.mapControlsExcluded

    Object.keys(leafletControls).forEach(controlName => {
        const excluded = excludedControls && (excludedControls.includes(controlName) || excludedControls === 'all')
        const included = !includedControls || includedControls.includes(controlName) || includedControls === 'all'
        leafletControls[controlName](map, {include:(included && !excluded)})
    })

    applyThemeToLeafletControls(container)
    toggleMapInteractivity(map)
}

const applyThemeToLeafletControls = (container) => {
    const themeClass = [`text-bg-${getPreferredTheme()}`, 'text-reset']

    container.querySelectorAll('.leaflet-control').forEach(control => {
        Array.from(control.children).forEach(child => child.classList.add(...themeClass))
    })

    container.querySelectorAll(removeWhitespace(`
        .leaflet-control-attribution,
        .leaflet-control-geocoder
    `)).forEach(element => element.classList.add(...themeClass))
}

const toggleMapInteractivity = (map) => {
    map.getContainer().querySelectorAll('.leaflet-control').forEach(control => {
        Array.from(control.children).forEach(child => {
            Array('mouseover', 'touchstart', 'touchmove', 'wheel').forEach(trigger => {
                child.addEventListener(trigger, (e) => {
                    disableMapInteractivity(map)
                })
            })    
    
            Array('mouseout', 'touchend').forEach(trigger => {
                child.addEventListener(trigger, (e) => {
                    enableMapInteractivity(map)
                })
            })
        })
    })
}