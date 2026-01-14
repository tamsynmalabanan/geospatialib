const generateRandomString = (length=16) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    let result = ''

    const charactersLength = characters.length
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength))
    }

    return result
}

const customCreateElement = ({
    parent,
    tag = 'div',
    id = generateRandomString(),
    className = '',
    innerHTML = '',
    innerText = '',
    children = [],
    style = {},
    attrs = {},
    events = {},
    handlers = {},
} = {}) => {
    const element = document.createElement(tag)
    element.id = id
    element.className = className
    
    Object.keys(style).forEach(k => {
        element.style[k] = style[k]
    })

    Object.keys(attrs).forEach(k => {
        element.setAttribute(k, attrs[k])
    })
    
    Object.keys(events).forEach(k => {
        element.addEventListener(k, events[k])
    })
    
    if (innerHTML) {
        element.innerHTML = innerHTML
    }

    if (children.length) {
        children.forEach(c => element.appendChild(c))
    }

    if (innerText) {
        element.innerText = innerText
    }
    
    parent?.appendChild(element)

    Object.values(handlers).forEach(handler => {
        handler(element)
    })

    return element
}

const canonicalize = (obj) => {
    const jsonStr = JSON.stringify(obj, Object.keys(obj).sort())
    if (_.isEqual(obj, JSON.parse(jsonStr))) {
        return jsonStr
    } else {
        return JSON.stringify(obj)
    }
}

const hashJSON = async (jsonObj) => {
    const jsonStr = canonicalize(jsonObj)
    const encoder = new TextEncoder()
    const data = encoder.encode(jsonStr)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

const hslaColor = (color='hsla(0, 0%, 100%, 1)') => {
    if (!color || !color.startsWith('hsla')) return
    
    const [h,s,l,a] = color.split(',').map(str => parseNumber(str))
    
    const obj = {
        h: h || 1,
        s,
        l,
        a: a ?? 1,
    }

    obj.toString = ({
        h=obj.h,
        s=obj.s,
        l=obj.l,
        a=obj.a,
    }={}) => {
        return `hsla(${h}, ${s}%, ${l}%, ${a})`
    }
    
    return obj
}

const parseNumber = (string) => {
    const regex = /\d+(\.\d+)?/;
    const match = string.match(regex);
    return match?.length ? parseFloat(match[0]) : null
}