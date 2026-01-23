const CURSOR = {
    x: null,
    y: null,
}

document.addEventListener("mousemove", (e) => {
    CURSOR.x = e.clientX
    CURSOR.y = e.clientY
})

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
    inputAttrs,
}={}) => {
    const container = customCreateElement({
        parent,
        className: 'd-flex flex-column flex-grow-1'
    })

    const label = customCreateElement({
        parent: container,
        tag: 'label',
        className: 'form-label fs-14  flex-grow-1',
        innerText: labelInnerText
    })

    const input = customCreateElement({
        tag: 'input',
        parent: container,
        className: 'form-control form-control-sm fs-14',
        attrs: inputAttrs
    })

    label.setAttribute('for', input.id)

    return container
}

const createFormSelect = ({
    parent,
    labelInnerText,
    selected,
    options = {}
}={}) => {
    const container = customCreateElement({
        parent,
        className: 'd-flex flex-column flex-grow-1'
    })

    const label = customCreateElement({
        parent: container,
        tag: 'label',
        className: 'form-label fs-14',
        innerText: labelInnerText
    })

    const select = customCreateElement({
        tag: 'select',
        parent: container,
        className: 'form-select form-select-sm fs-14 flex-grow-1',
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

    return container
}

const clampNumnerToRange = (number, max, min) => {
    if (number > max) return max
    if (number < min) return min
    return number
}