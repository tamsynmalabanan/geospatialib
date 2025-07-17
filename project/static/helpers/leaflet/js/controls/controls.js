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

const handleLeafletMeasureTool = (map, {include=true} ={}) => {
    if (!include) return

    const measureControl = new L.Control.LinearMeasurement({
        position: 'topleft',
        unitSystem: 'metric',
        color: '#0d6efd',
        type: 'line'
    }).addTo(map)

    const icon = measureControl._container.querySelector('.icon-ruler')
    icon.style.backgroundImage = 'none !important'
    icon.style.borderRadius = 'var(--bs-border-radius) !important'
    icon.classList.add('bi','bi-rulers')
}

const leafletControls = {
    zoom: handleLeafletZoombar,
    scale: handleLeafletScaleBar,
    search: handleLeafletSearchBar,
    reset: handleLeafletRestViewBtn,
    locate: handleLeafletLocateBtn,
    measure: handleLeafletMeasureTool,
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

const toggleMapInteractivity = (map, {
    controls = Array.from(map.getContainer().querySelectorAll('.leaflet-control'))
} = {}) => {
    controls.forEach(control => {
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