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

const sortObjectKeys = (obj) => {
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        return Object.keys(obj).sort().reduce((acc, key) => {
            acc[key] = sortObjectKeys(obj[key])
            return acc
        }, {})
    } else if (Array.isArray(obj)) {
        return obj.map(sortObjectKeys)
    }

    return obj
}

const canonicalize = (obj) => {
    return JSON.stringify(sortObjectKeys(obj))
}

const hashJSON = async (jsonObj) => {
    const jsonStr = canonicalize(jsonObj)
    const encoder = new TextEncoder()
    const data = encoder.encode(jsonStr)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

const hslaColor = (color='hsl(0, 0%, 100%)') => {
    if (!color || !color.startsWith('hsl')) return
    
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

const createModal = ({
    modalId = generateRandomString(),
    titleInnerText,
    isStatic=false,
}={}) => {
    const modal = customCreateElement({
        id: modalId,
        parent: document.body,
        className: 'modal fade',
        attrs: {
            tabindex: -1,
            ...(isStatic ? {'data-bs-backdrop': 'static'} : {})
        }
    })

    const dialog = customCreateElement({
        parent: modal,
        className: 'modal-fullscreen-sm-down modal-dialog modal-dialog-centered modal-dialog-scrollable'
    })

    const content = customCreateElement({
        parent: dialog,
        className: 'modal-content'
    })

    const header = customCreateElement({
        parent: content,
        className: 'modal-header'
    })

    const title = customCreateElement({
        tag: 'h6',
        parent: header,
        className: 'modal-title',
        innerText: titleInnerText
    })

    const close = customCreateElement({
        tag: 'button',
        parent: header,
        className: 'btn-close',
        attrs: {
            'data-bs-dismiss': 'modal'
        }
    })

    const body = customCreateElement({
        parent: content,
        className: 'modal-body',
    })

    const footer = customCreateElement({
        parent: content,
        className: 'modal-footer',
    })

    const dismiss = customCreateElement({
        tag: 'button',
        parent: footer,
        className: 'btn btn-sm btn-primary',
        attrs: {
            'data-bs-dismiss': 'modal',
        },
        innerText: 'Close',
    })

    const bsModal = new bootstrap.Modal(modal)
    bsModal.show()

    return modal
}

const createFormControl = ({
    parent,
    labelInnerText,
    inputAttrs = {},
    invalidFeedbackContent,
    fs = 'fs-14',
    events = {},
}={}) => {
    const container = customCreateElement({
        parent,
        className: 'd-flex flex-column flex-grow-1'
    })

    const label = customCreateElement({
        parent: container,
        tag: 'label',
        className: `form-label flex-grow-1 ${fs}`,
        innerText: labelInnerText
    })

    const input = customCreateElement({
        tag: 'input',
        parent: container,
        className: `form-control form-control-sm ${fs}`,
        attrs: inputAttrs
    })

    if (invalidFeedbackContent) {
        const invalidFeedback = customCreateElement({
            parent: container,
            className: 'invalid-feedback',
            innerHTML: invalidFeedbackContent
        })
    }

    label.setAttribute('for', input.id)

    Object.entries(events).forEach(([type, handler]) => {
        input.addEventListener(type, handler)
    })


    return container
}

const createFormSelect = ({
    parent,
    labelInnerText,
    selected,
    options = {},
    inputAttrs = {},
    fs = 'fs-14',
    events = {},
}={}) => {
    const container = customCreateElement({
        parent,
        className: 'd-flex flex-column flex-grow-1'
    })

    const label = customCreateElement({
        parent: container,
        tag: 'label',
        className: `form-label ${fs}`,
        innerText: labelInnerText
    })

    const select = customCreateElement({
        tag: 'select',
        parent: container,
        className: `form-select form-select-sm ${fs}`,
        attrs: inputAttrs,
    })

    Object.entries(options).forEach(([value,innerText]) => {
        customCreateElement({
            tag: 'option',
            parent: select,
            attrs: {
                value,
                ...(selected === value ? {
                    selected: true,
                } : {})
            },
            innerText,
        })
    })

    label.setAttribute('for', select.id)

    Object.entries(events).forEach(([type, handler]) => {
        select.addEventListener(type, handler)
    })

    return container
}

const clampNumnerToRange = (number, max, min) => {
    if (number > max) return max
    if (number < min) return min
    return number
}

const toTitleCase = (str) => {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const hslToHex = ({h=0, s=100, l=50}={}) => {
    l /= 100
    const a = s * Math.min(l, 1 - l) / 100
    const f = n => {
      const k = (n + h / 30) % 12
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
      return Math.round(255 * color).toString(16).padStart(2, '0')
    }
    return `#${f(0)}${f(8)}${f(4)}`
}

const hexToRGB = (hex) => {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('')
    }
    const bigint = parseInt(hex, 16)
    const r = (bigint >> 16) & 255
    const g = (bigint >> 8) & 255
    const b = bigint & 255

    return `rgb(${r}, ${g}, ${b})`
}

const rgbToHSLA = (rgb) => {
    rgb = rgb.split('(')[rgb.split('(').length-1].split(',')
    
    let r = parseInt(rgb[0]) / 255
    let g = parseInt(rgb[1]) / 255
    let b = parseInt(rgb[2]) / 255
  
    let max = Math.max(r, g, b)
    let min = Math.min(r, g, b)
    let delta = max - min
  
    let l = (max + min) / 2;
  
    let s = 0
    if (delta !== 0) {
      s = l < 0.5 ? delta / (max + min) : delta / (2 - max - min);
    }
  
    let h = 0
    if (delta !== 0) {
      if (max === r) {
        h = (g - b) / delta
      } else if (max === g) {
        h = 2 + (b - r) / delta
      } else if (max === b) {
        h = 4 + (r - g) / delta
      }
    }
    h = Math.round(h * 60)
    if (h < 0) {
      h += 360
    }
  
    s = +(s * 100).toFixed(1)
    l = +(l * 100).toFixed(1)
  
    return `hsla(${h}, ${s}%, ${l}%, 1)`
}

const hexToHSLA = (hex) => {
    return rgbToHSLA(hexToRGB(hex))
}

const validateURL = (url) => {
    try {
        const parsed = new URL(url.trim())
     
        if (!Array("http:", "https:").includes(parsed.protocol)) {
            return null
        }

        const normalized = decodeURIComponent(
            parsed.href.replace(/^http:/, "https:")
        )

        return normalized
    } catch (error) {
        return null
    }
}

const getBestMatch = (text, options) => {
    let bestScore = 0
    let bestOption = ""

    const textLower = text.toLowerCase()

    for (const [option, keywords] of Object.entries(options)) {
        let score = 0

        for (const kw of [option, ...keywords]) {
            const similarity = stringSimilarity.compareTwoStrings(textLower, kw.toLowerCase())
            score = Math.max(score, similarity)
        }

        if (score > bestScore) {
            bestScore = score
            bestOption = option
        }
    }

    return bestScore > 0.1 ? bestOption : ''
}

const slugify = (str) => {
  return str
    .toLowerCase()
    .trim() 
    .replace(/[^a-z0-9\s-]/g, '') // remove non-alphanumeric chars
    .replace(/\s+/g, '-') // replace spaces with hyphens
    .replace(/-+/g, '-') // collapse multiple hyphens
}

const isValidImg = (url, callback) => {
    if (!url) return callback(null, false)
    
    const img = new Image()
    img.onload = () => callback(img, true)
    img.onerror = () => callback(img, false)
    img.src = url

    return img
}