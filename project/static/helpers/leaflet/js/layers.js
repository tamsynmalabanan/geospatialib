const addLeafletBasemapLayer = (map) => L.tileLayer("//tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    className: `layer-${getPreferredTheme()}`
}).addTo(map)

const getDefaultLeafletLayerStyle = (featureType, {
    color = generateRandomColor(),
    strokeWidth = weight || 1,
    weight = strokeWidth || 1,
    pointClass = 'rounded-circle',
    strokeColor,
    strokePattern = 'solid',
    bodyColor = color,
    bodyOpacity = 0.5,
    iconSize = [12, 12]
} = {}) => {
    const hslaColor = manageHSLAColor(color)
    const hslaBodyColor = manageHSLAColor(bodyColor)

    if (featureType.toLowerCase() === 'point') {
        const div = document.createElement('div')
        div.className = `h-100 w-100 ${pointClass}`
        div.style.border = `${strokeWidth}px ${strokePattern} ${strokeColor || hslaColor?.toString({l:hslaColor.l/2}) || 'grey'}`
        div.style.backgroundColor = hslaBodyColor?.toString({a:bodyOpacity}) || bodyColor

        return L.divIcon({
            className: 'bg-transparent',
            iconSize: iconSize,
            html: div.outerHTML,
        });
    } else {
        let opacity = options.opacity
        if (!opacity) {
            opacity = 1
        }

        const properties = {
            color: color,
            weight: strokeWidth,
            opacity: opacity
        }

        let fillColor = options.fillColor
        if (fillColor) {
            if (typeof fillColor === 'boolean') {
                if (color.startsWith('hsla')) {
                    [h,s,l,a] = color.split(',').map(str => parseNumberFromString(str))
                    l = (l / 2 * 3)
                    fillColor = `hsla(${h}, ${s}%, ${l > 100 ? 100 : l}%, ${a})`
                } else {
                    fillColor = white
                }
            }

            const fillOpacity = options.fillOpacity || 0.25
            properties.fillOpacity = fillOpacity
            properties.fillColor = fillColor
        } else {
            properties.fillOpacity = 0
        }

        return properties
    }
}