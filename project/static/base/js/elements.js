const assignAttrsToElement = (element, attrs) => {
    for (const key in attrs) {
        if (!attrs.hasOwnProperty(key)) {continue}
        
        const value = attrs[key];
        element.setAttribute(key, value)
    }
}

const createDropdownMenuListItem = (options={}) => {
    const li = document.createElement('li')

    const button = document.createElement('button')
    button.className = `dropdown-item ${options.buttonClass}`

    options.buttonClickHandler && button.addEventListener('click', options.buttonClickHandler);

    options.label && button.appendChild((() => {
        const span = document.createElement('span')
        span.className = 'ms-2'
        span.innerText = options.label
        return span
    })())

    options.buttonAttrs && assignAttrsToElement(button, options.buttonAttrs)

    li.appendChild(button)
    options.parent?.appendChild(li)

    return li
}

const createAccordionCollapse = (id, parentId, collapsed=true) => {
    const collapse = document.createElement('div')
    collapse.id = id
    collapse.classList.add('accordion-collapse', 'collapse', ...(!collapsed ? ['show'] : []));
    collapse.setAttribute('data-bs-parent', `#${parentId}`)
    return collapse
}

const createAccordionToggle = (target, collapsed=true) => {
    const toggle = document.createElement('button')
    toggle.classList.add('accordion-button', ...(!collapsed ? ['show'] : []))
    toggle.setAttribute('type', 'button')
    toggle.setAttribute('data-bs-toggle', 'collapse')
    toggle.setAttribute('data-bs-target', `#${target}`)
    toggle.setAttribute('aria-controls', target)
    toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true')
    return toggle
}

const labelElement = (element, options={}) => {
    element.classList.add('d-flex', 'flex-nowrap', 'fw-medium')

    options.iconClass && element.appendChild((() => {
        const icon = document.createElement('i')
        icon.className = options.iconClass
        return icon
    })())

    options.label && element.appendChild((() => {
        const span = document.createElement('span')
        span.className = (options.labelClass || '') + (options.iconClass ? 'ms-2' : '')
        span.innerText = options.label
    })())
}

const createImgElement = (url, alt, options={}) => {
    const img = document.createElement('img')
    img.className = options.className || ''
    img.setAttribute('src', url)
    img.setAttribute('alt', alt)
    return img
}

const createButtonAndCollapse = (id, options={}) => {
    let containerTag = options.containerTag
    if (!containerTag) {
        containerTag = 'div'
    }

    const container = document.createElement(containerTag)
    container.id = id
    container.className = `d-flex flex-column gap-2 ${options.containerClass}`

    const collapse = document.createElement('div')
    collapse.id = `${id}_collapse`
    collapse.classList.add('collapse')
    if (!options.collapsed) {
        collapse.classList.add('show')
    }

    const btnContainer = document.createElement('div')
    btnContainer.className = 'd-flex gap-2'

    const button = document.createElement('button')
    button.className = `bg-transparent border-0 px-0 ${options.buttonClassName }`
    button.setAttribute('type', 'button')
    button.setAttribute('data-bs-toggle', 'collapse')
    button.setAttribute('data-bs-target', `#${collapse.id}`)
    button.setAttribute('aria-controls', collapse.id)
    if (options.collapsed) {
        button.classList.add('collapsed')
        button.setAttribute('aria-expanded', 'false')
    } else {
        button.setAttribute('aria-expanded', 'true')
    }
    if (options.label) {
        const span = document.createElement('span')
        span.classList.add('me-2', 'fs-14')
        span.innerText = options.label
        button.appendChild(span)
    }

    const dropdownIcon = document.createElement('i')
    dropdownIcon.className = 'dropdown-toggle ms-auto'
    button.appendChild(dropdownIcon)

    setAsThemedControl(button)

    btnContainer.appendChild(button)
    container.appendChild(btnContainer)
    container.appendChild(collapse)

    return container
}

const createFormCheck = (id, options={}) => {
    const formCheck = document.createElement(options.formCheckTag || 'div')
    formCheck.className = `d-flex gap-2 flex-grow-1 ${options.formCheckClass}`

    let checkboxClass = options.checkboxClass
    if (!checkboxClass) {
        checkboxClass = ''
    }

    const checkbox = document.createElement('input')
    checkbox.id = id
    checkbox.className = `form-check-input ${checkboxClass}`
    checkbox.setAttribute('type', 'checkbox')
    if (options.checkboxAttrs) {
        for (const key in options.checkboxAttrs) {
            checkbox.setAttribute(key, options.checkboxAttrs[key])
        }
    }
    formCheck.appendChild(checkbox)

    const label = document.createElement('label')
    label.className = `w-auto text-truncate ${options.labelClass}`
    label.setAttribute('for', id)
    formCheck.appendChild(label)
    if (options.button) {
        label.classList.add('me-3')
    }

    if (options.label) {
        const span = document.createElement('span')
        span.classList.add('w-100', 'text-wrap')
        span.innerText = options.label
        label.appendChild(span)
    }

    if (options.parent) {
        options.parent.appendChild(formCheck)
    }

    return formCheck
}

const createInlineBtn = (options={}) => {
    const button = document.createElement('button')
    button.setAttribute('type', 'button')
    button.className = `ms-5 bg-transparent border-0 p-0 ${options.buttonClass}`
    
    if (options.buttonInnerText) {
        const span = document.createElement('span')
        span.className = 'ms-2 d-none d-lg-inline'
        span.innerText = options.buttonInnerText
        button.appendChild(span)
    }
    
    if (options.buttonCallback) {
        button.addEventListener('click', options.buttonCallback)
    }

    if (options.buttonAttrs) {
        for (const key in options.buttonAttrs) {
            button.setAttribute(key, options.buttonAttrs[key])
        }
    }    

    container = options.container
    if (container) {
        container.appendChild(button)
    }

    return button
}

const createButton = (options={}) => {
    const button = document.createElement('button')
    button.className = `btn ${options.buttonClass}`
    setAsThemedControl(button)

    if (options.label) {
        const span = document.createElement('span')
        span.className = `ms-2 ${options.labelClass}`
        span.innerText = options.label
        button.appendChild(span)
    }

    if (options.buttonAttrs) {
        for (const key in options.buttonAttrs) {
            button.setAttribute(key, options.buttonAttrs[key])
        }
    }

    if (options.parent) {
        options.parent.appendChild(button)
    }

    return button
}

const createSpanElement = (options={}) => {
    const span = document.createElement('span')
    span.className = `${options.className}`
    
    if (options.label) {
        span.innerText = options.label
    }

    if (options.parent) {
        options.parent.appendChild(span)
    }

    return span
}

const createDropdownDivider = () => {
    const divider = document.createElement('li')
    divider.classList.add('dropdown-divider')
    return divider
}