const addLeafletBasemapLayer = (map) => L.tileLayer("//tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    className: `layer-${getPreferredTheme()}`
}).addTo(map)

const getDefaultLeafletLayerStyle = (featureType, {
    color = generateRandomColor(),
    opacity = 1,
    strokeWidth = 1,
    strokePattern = 'solid',
    strokeColor,
    pointClass = 'rounded-circle',
    iconSize = [12, 12],
    fillColor = true,
    fillOpacity = 0.25,
} = {}) => {
    const hslaColor = manageHSLAColor(color)

    if (featureType.toLowerCase() === 'point') {
        const div = document.createElement('div')
        div.className = `h-100 w-100 ${pointClass}`
        div.style.border = `${strokeWidth}px ${strokePattern} ${strokeColor || hslaColor?.toString({l:hslaColor.l/2}) || 'grey'}`
        div.style.backgroundColor = hslaColor?.toString({a:fillOpacity}) || color
        return L.divIcon({
            className: 'bg-transparent',
            iconSize: iconSize,
            html: div.outerHTML,
        });
    } else {
        const properties = {
            color: color,
            weight: strokeWidth,
            opacity: opacity
        }

        fillColor = fillColor === true ? hslaColor ? hslaColor.toString({
            l:(hslaColor.l/2*3) > 100 ? 100 : (hslaColor.l/2*3),
        }) : 'white' : fillColor ? fillColor : null
        
        if (fillColor) {
            properties.fillOpacity = fillOpacity
            properties.fillColor = fillColor
        } else {
            properties.fillOpacity = 0
        }

        return properties
    }
}