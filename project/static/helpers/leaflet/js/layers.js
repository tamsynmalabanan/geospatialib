const addLeafletBasemapLayer = (map) => L.tileLayer("//tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    className: `layer-${getPreferredTheme()}`
}).addTo(map)

const getLeafletStyleParams = ({
    color=generateRandomColor(),
    strokeWidth=1,
    strokePattern='solid',
    strokeColor=true,
    strokeOpacity=1,
    
    fillColor=true,
    fillOpacity=0.25,
    
    pointIcon='bi bi-geo-alt-fill',
    iconSize=[12, 12],
} = {}) => {
    return  {
        color,
        strokeWidth,
        strokePattern,
        strokeColor,
        strokeOpacity,
        fillColor,
        fillOpacity,
        pointIcon,
        iconSize,
    }    
}

const getLeafletLayerStyle = (featureType, options={}) => {
    const styleParams = getLeafletStyleParams(options)
    const {
        color,
        strokeWidth,
        strokePattern,
        strokeColor,
        strokeOpacity,
        fillColor,
        fillOpacity,
        pointIcon,
        iconSize,
    } = styleParams

    const hslaColor = manageHSLAColor(color)

    if (featureType?.toLowerCase() === 'point') {
        const div = document.createElement('div')
        div.className = `h-100 w-100 d-flex justify-content-center align-items-center ${pointIcon}`
        div.style.border = `${strokeWidth}px ${strokePattern} ${strokeColor === true ? hslaColor?.toString({l:hslaColor.l/2, a:strokeOpacity}) || color : strokeColor || 'transparent'}`
        div.style.backgroundColor = fillColor === true ? hslaColor?.toString({a:fillOpacity}) || color : fillColor || 'transparent'
        return L.divIcon({
            className: 'bg-transparent',
            iconSize: iconSize,
            html: div.outerHTML,
        });
    } else {
        const properties = {
            color: strokeColor === true ? hslaColor?.toString({l:hslaColor.l/2}) || color : strokeColor || 'transparent',
            weight: strokeWidth,
            opacity: strokeOpacity,
        }
        properties.fillOpacity = fillColor ? fillOpacity : 0
        properties.fillColor = fillColor === true ? color : fillColor || 'transparent'
        return properties
    }
}