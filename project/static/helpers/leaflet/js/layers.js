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
    
    iconClass='bi bi-circle-fill',
    iconOpacity=1,
    iconShadow=false,
    iconGlow=false,
    iconSize=10,
    iconStroke=1,
} = {}) => {
    return  {
        color,
        strokeWidth,
        strokePattern,
        strokeColor,
        strokeOpacity,
        fillColor,
        fillOpacity,
        iconClass,
        iconSize,
        iconOpacity,
        iconShadow,
        iconGlow,
        iconStroke,
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
        iconClass,
        iconSize,
        iconOpacity,
        iconShadow,
        iconGlow,
        iconStroke,

    } = styleParams

    const hslaColor = manageHSLAColor(color)

    if (featureType?.toLowerCase() === 'point') {
        const div = document.createElement('div')
        div.className = `h-100 w-100 d-flex justify-content-center align-items-center ${iconClass}`
        div.style.fontSize = `${iconSize}px`
        div.style.color = fillColor === true ? hslaColor?.toString({a:iconOpacity}) || color : fillColor || 'transparent'
        div.style.WebkitTextStroke = `${iconStroke}px ${strokeColor === true ? hslaColor?.toString({l:hslaColor.l/2, a:strokeOpacity}) || color : strokeColor || 'transparent'}`
        div.style.textShadow = removeWhitespace(`
            ${iconShadow ? `2px 2px 4px ${hslaColor?.toString({l:hslaColor.l/10}) || 'black'}` : ''}
            ${iconGlow ? `0 0 5px ${color}, 0 0 10px ${color}, 0 0 15px ${color}, 0 0 20px ${color}` : ''}
        `)
        console.lof(div.style.textShadow)
        console.lof(removeWhitespace(`
            ${iconShadow ? `2px 2px 4px ${hslaColor?.toString({l:hslaColor.l/10}) || 'black'}` : ''}
            ${iconGlow ? `0 0 5px ${color}, 0 0 10px ${color}, 0 0 15px ${color}, 0 0 20px ${color}` : ''}
        `))

        return L.divIcon({
            className: 'bg-transparent',
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