const customCreateElement = (tag, {
    className = ''
} = {}) => {
    const element = document.createElement(tag)
    element.className = className
    return element
}

const createButton = ({
    id,
    className = '',
    iconClass,
    title,
    disabled,
    clickHandler,
    parent,
} = {}) => {
    const btn = document.createElement('button')
    if (id) btn.id = id
    btn.className = `btn ${className}`
    btn.setAttribute('type', 'button')
    if (title) btn.setAttribute('title', title)
    if (disabled) btn.setAttribute('disabled', true)
    if (iconClass) createIcon({className:`bi ${iconClass}`, parent:btn})
    if (clickHandler) btn.addEventListener('click', clickHandler)
    parent?.appendChild(btn)
    return btn
}

const createIcon = ({className='', parent, peNone=true, title} = {}) => {
    const icon = document.createElement('i')
    icon.className = `${className} ${peNone ? 'pe-none' : ''}`
    if (!peNone) icon.style.cursor = 'pointer'
    if (title) icon.setAttribute('title', title)
    parent?.appendChild(icon)

    return icon
}

const createSpan = (innerText, {id, className = '', parent} = {}) => {
    const label = document.createElement('span')
    if (id) label.id = id
    label.innerText = innerText
    label.className = `${className}`
    parent?.appendChild(label)

    return label
}

const createOffcanvasToggle = (id, {
    tag,
    className,
    themed,
    label,
    show,
    title,
    parent
} = {}) => {
    const toggle = document.createElement(tag)
    toggle.className = removeWhitespace(`
        ${className || ''}
        ${tag === 'button' ?  `btn` : ''}
        ${themed ? `${tag === 'button' ? 'btn' : 'text-bg'}-${getPreferredTheme()}` : ''}
        ${label ? 'rounded-pill' : 'rounded-circle'}
        ${show ? 'd-lg-none' : ''}
        shadow-lg d-flex flex-nowrap
    `)
    toggle.setAttribute(`${tag === 'button' ? 'type' : 'role'}`, 'button') 
    toggle.setAttribute('data-bs-toggle', 'offcanvas') 
    toggle.setAttribute('data-bs-target', `#${id}`) 
    toggle.setAttribute('aria-controls', id) 
    toggle.setAttribute('title', title)

    parent?.appendChild(toggle)

    return toggle
}

const createOffcanvasElement = (id, {
    show,
    className = '', 
    themed, 
    titleText, 
    titleClass,
    toggleIcon = 'bi-layout-sidebar-inset',
} = {}) => {
    const offcanvas = document.createElement('div')
    offcanvas.id = id
    offcanvas.className = removeWhitespace(`
        ${className}
        ${show ? 'offcanvas-lg' : 'offcanvas'}
        ${themed ? `text-bg-${getPreferredTheme()}` : ''}
        shadow-lg border-0 p-0 d-flex flex-column
    `)
    offcanvas.setAttribute('aria-labelledby', `${id}Label`)
    offcanvas.setAttribute('data-bs-scroll', `true`)
    offcanvas.setAttribute('data-bs-backdrop', `false`)

    const header = document.createElement('div')
    header.className = 'offcanvas-header d-flex justify-content-between'
    offcanvas.appendChild(header)

    const title = document.createElement('h5')
    title.id = `${id}Label`
    title.className = `offcanvas-title ${titleClass || ''}`
    title.innerText = titleText
    header.appendChild(title)

    const toggleContainer = document.createElement('div')
    toggleContainer.className = 'd-flex flex-nowrap ms-5'
    header.appendChild(toggleContainer)
    const toggleClassName = 'border-0 bg-transparent fs-20 p-0 ms-3 text-muted bi'

    const sidebarToggle = document.createElement('button')
    sidebarToggle.className = `${toggleClassName} ${show ? toggleIcon : 'bi-window-sidebar'} d-none d-lg-inline`
    sidebarToggle.setAttribute('type', 'button')
    sidebarToggle.setAttribute('onclick', `toggleSidebar("#${id}")`)
    sidebarToggle.setAttribute('title', `Toggle ${titleText}`)
    toggleContainer.appendChild(sidebarToggle)

    const dismissToggle = document.createElement('button')
    dismissToggle.className = `${toggleClassName} ${show ? 'd-lg-none' : ''} bi-x-lg`
    dismissToggle.setAttribute('type', 'button')
    dismissToggle.setAttribute('data-bs-dismiss', 'offcanvas')
    dismissToggle.setAttribute('data-bs-target', `#${id}`)
    dismissToggle.setAttribute('aria-label', 'Close')
    toggleContainer.appendChild(dismissToggle)

    const nav = document.createElement('div')
    nav.className = 'offcanvas-nav'
    offcanvas.appendChild(nav)

    const body = document.createElement('div')
    body.className = 'offcanvas-body overflow-auto flex-grow-1 d-flex p-0'
    offcanvas.appendChild(body)

    return offcanvas
}

const createOffcanvas = (id, {
    themed,
    show,
    offcanvasClass,
    toggleTag = 'button',
    toggleClass = '',
    toggleLabelText,
    toggleTitle = `Toggle ${toggleLabelText ? toggleLabelText : 'sidebar'}`,
    toggleParent,
    toggleIconClass,
    toggleLabelClass = '',
    titleText = toggleLabelText,
    titleClass,
    offcanvasToggleIcon,
} = {}) => {
    const toggle = createOffcanvasToggle(id, {
        themed: themed,
        show: show,
        tag: toggleTag,
        className: toggleClass,
        title: toggleTitle,
        parent: toggleParent,
        label: toggleLabelText
    })

    if (toggleIconClass) createIcon({className: `bi ${toggleIconClass}`, parent: toggle})
    if (toggleLabelText) createSpan(toggleLabelText, {className: `ms-2 text-nowrap ${toggleLabelClass}`, parent: toggle})

    const offcanvas = createOffcanvasElement(id, {
        show: show,
        className: offcanvasClass,
        themed: themed,
        titleText: titleText,
        titleClass: titleClass,
        toggleIcon: offcanvasToggleIcon,
    })

    return [toggle, offcanvas]
}

const createNavItem = ({
    parent
} = {}) => {
    const navItem = document.createElement('li')
    navItem.className = 'nav-item'
    parent?.appendChild(navItem)

    return navItem
}

const createAccordionNavTabs = (id, tabData, {
    themed,
    parent
} = {}) => {
    const navTabs = document.createElement('ul')
    navTabs.className = `nav nav-tabs card-header-tabs d-flex flex-nowrap`
    parent?.appendChild(navTabs)

    Object.keys(tabData).forEach(suffix => {
        const data = tabData[suffix]

        const navItem = createNavItem({
            parent: navTabs,
        })

        const navButton = document.createElement('button')
        navButton.className = removeWhitespace(`
            accordion-button rounded-top me-2 pe-2 ps-3 py-1
            ${themed ? `text-bg-${getPreferredTheme()}` : ''}
            ${data.active ? '' : 'collapsed'}
            ${data.active || data.disabled ? 'disabled' : ''}
        `)
        if (data.active || data.disabled) navButton.setAttribute('disabled', 'true')
        navButton.setAttribute('type', 'button')
        navButton.setAttribute('data-bs-toggle', 'collapse')
        navButton.setAttribute('data-bs-target', `#${id}-${suffix}`)
        navButton.setAttribute('aria-expanded', `${data.active ? 'true' : 'false'}`)
        navButton.setAttribute('aria-controls', `${id}-${suffix}`)
        navButton.innerText = data.label
        navItem.appendChild(navButton)

        navButton.addEventListener('click', () => {
            navTabs.querySelectorAll(`.accordion-button`).forEach(btn => {
                if (navButton === btn) {
                    btn.disabled = true
                } else {
                    btn.disabled = false
                }
            })
        })
    })

    createNavItem({
        parent: navTabs,
    })

    return navTabs
}

const createAccordionElement = (id, tabData, {
    themed,
    parent,
    accordionCollapseClass = '',
} = {}) => {
    const accordion = document.createElement('div')
    accordion.id = id
    accordion.className = removeWhitespace(`
        accordion accordion-flush px-0 flex-grow-1 d-flex flex-column
        ${themed ? `text-bg-${getPreferredTheme()}` : ''}
    `)
    parent?.appendChild(accordion)

    Object.keys(tabData).forEach(suffix => {
        const data = tabData[suffix]

        const accordionCollapse = document.createElement('div')
        accordionCollapse.id = `${id}-${suffix}`
        accordionCollapse.className = removeWhitespace(`
            accordion-collapse collapse flex-grow-1 fade
            ${accordionCollapseClass}
            ${data.active ? 'show' : ''}
        `)
        accordionCollapse.setAttribute('data-bs-parent', `#${id}`)
        accordion.appendChild(accordionCollapse)

        const accordionBody = document.createElement('div')
        accordionBody.className = 'accordion-body h-100 p-0 d-flex flex-column flex-grow-1'
        accordionCollapse.appendChild(accordionBody)

    })

    return accordion
}

const createAccordion = (id, tabData, {
    themed = false,
    accordionCollapseClass = '',
} = {}) => {
    const tabs = createAccordionNavTabs(id, tabData, {themed})
    const accordion = createAccordionElement(id, tabData, {
        themed,
        accordionCollapseClass,
    })
    return [tabs, accordion]
}

const createDropdownMenuLi = ({
    innerText, 
    parent,
    btnCallback,
    divider = false,
}={}) => {
    const li = document.createElement('li')
    parent?.appendChild(li)
    
    let element
    if (divider) {
        element = document.createElement('hr')
        element.className = 'dropdown-divider'
    } else {
        element = document.createElement('button')
        element.className = 'dropdown-item bg-transparent border-0 btn btn-sm fs-12'
        if (btnCallback) element.addEventListener('click', btnCallback)
            
        const label = createSpan(innerText, {className:'pe-none'})
        element.appendChild(label)
    }
    
    li.appendChild(element)
    return li
}

const createDropdown = ({
    btnClassName = '',
    btnIconClass,
    btnTitle, 
    menuClassName,
} = {}) => {
    const dropdown = document.createElement('div')
    dropdown.className = 'dropdown'

    const toggle = createButton({
        className: `dropdown-toggle ${btnClassName}`,
        iconClass: btnIconClass,
        title: btnTitle,
    })
    toggle.setAttribute('data-bs-toggle', 'dropdown')
    toggle.setAttribute('aria-expanded', 'false')
    dropdown.appendChild(toggle)

    const menu = document.createElement('ul')
    menu.className = `dropdown-menu ${menuClassName}`
    dropdown.appendChild(menu)

    return [dropdown, toggle, menu]
}

const createRadios = (radios, {
    name,
    containerClassName = ''
} = {}) => {
    const container = document.createElement('div')
    container.className = `${containerClassName}`

    name = name || generateRandomString()

    for (const option in radios) {
        const data = radios[option]

        const formCheck = document.createElement('div')
        formCheck.className = 'form-check'
        container.appendChild(formCheck)

        const id = data.id || generateRandomString()

        const input = document.createElement('input')
        input.id = id
        input.className = 'form-check-input'
        input.setAttribute('type', 'radio')
        input.setAttribute('name', name)
        input.checked = data.checked || false
        if (data.inputAttrs) Object.keys(data.inputAttrs).forEach(attr => input.setAttribute(attr, data.inputAttrs[attr]))
        formCheck.appendChild(input)
        
        const label = document.createElement('label')
        label.className = 'form-check-label'
        label.setAttribute('for', id)
        label.innerText = option
        if (data.labelAttrs) Object.keys(data.labelAttrs).forEach(attr => label.setAttribute(attr, data.labelAttrs[attr]))
        formCheck.appendChild(label)
    } 

    return container
}

const createFormCheck = ({
    parent,
    inputValue = '',
    inputId =  generateRandomString(),
    labelInnerText = '',
    fieldClass = '',
    formCheckClass = '',
    disabled=false,
} = {}) => {
    const formCheck = document.createElement('div')
    formCheck.className = `form-check ${formCheckClass}`
    parent?.appendChild(formCheck)
    
    const input = document.createElement('input')
    input.id = inputId
    input.className = `form-check-input ${fieldClass}`
    input.setAttribute('type', 'checkbox')
    input.value = inputValue
    input.disabled = disabled
    formCheck.appendChild(input)

    const label = document.createElement('label')
    label.className = 'form-check-label'
    label.setAttribute('for', input.id)
    label.innerText = labelInnerText
    formCheck.appendChild(label)

    return formCheck
}

const createObjectTRs = (object, parent, {
} = {}) => {
    const handler = (key, value, {prefixes = []} = {}) => {
        if (typeof value === 'object') {
            prefixes.push(key)
            Object.keys(value).forEach(subKey => {
                const subValue = value[subKey]
                handler(subKey, subValue, {prefixes})
            })
        } else {
            const tr = document.createElement('tr')
            parent.appendChild(tr)

            const label = innerText = [...new Set([...prefixes, key])].map(i => `${i[0].toUpperCase()}${i.slice(1)}`).join(' ')
            
            const th = document.createElement('th')
            th.setAttribute('scope', 'row')
            th.innerText = label
            tr.appendChild(th)
            
            const td = document.createElement('td')
            td.innerText = value.toString()
            tr.appendChild(td)
        }
    }

    for (const key in object) handler(key, object[key])
}

const createModal = ({
    titleText,
    parent,
    bodyContent,
    footerBtnText = 'Save',
}={}) => {
    const modal = document.createElement('div')
    modal.className = 'modal'
    modal.setAttribute('tabindex', '-1')
    parent?.appendChild(modal)

    const dialog = document.createElement('div')
    dialog.className = 'modal-dialog'
    modal.appendChild(dialog)

    const content = document.createElement('div')
    content.className = 'modal-content'
    dialog.appendChild(content)

    const header = document.createElement('div')
    header.className = 'modal-header'
    content.appendChild(header)

    const title = document.createElement('h5')
    title.className = 'modal-title'
    if (titleText) title.innerText = titleText
    header.appendChild(title)

    const close = document.createElement('button')
    close.className = 'btn-close'
    close.setAttribute('type', 'button')
    close.setAttribute('data-bs-dismiss', 'modal')
    close.setAttribute('aria-label', 'Close')
    header.appendChild(close)

    const body = document.createElement('div')
    if (bodyContent) body.innerHTML = bodyContent
    content.appendChild('body')

    const footer = document.createElement('div')
    footer.className = 'modal-footer'
    content.appendChild(footer)

    const btn = document.createElement('div')
    btn.className = `btn btn-${getPreferredTheme()}`
    btn.innerText = footerBtnText
    footer.appendChild(btn)

     return modal
}

const createFormFloating = ({
    parent,
    fieldTag = 'input',
    fieldAttrs = {},
    fieldId,
    fieldClass = '',
    labelText = '',
    events = {},
    options,
    selectedValue = '',
    value,
    fieldStyle = {},
} = {}) => {
    const container = document.createElement('div')
    container.className = `form-floating flex-grow-1`
    parent?.appendChild(container)

    const field = document.createElement(fieldTag)
    field.id = fieldId || generateRandomString()
    field.className = `${fieldClass} ${fieldTag === 'select' ? 'form-select' : 'form-control'}`
    Object.keys(fieldAttrs).forEach(k => field.setAttribute(k, fieldAttrs[k]))
    Object.keys(fieldStyle).forEach(k => field.style[k] = fieldStyle[k])
    container.appendChild(field)

    if (fieldTag === 'select' && options) {
        for (const value in options) {
            const option = document.createElement('option')
            option.value = value
            option.text = options[value]
            if (value === selectedValue) option.setAttribute('selected', true)
            field.appendChild(option)
        }
    }
    

    if (value) field.value = value

    Object.keys(events).forEach(trigger => {
        field.addEventListener(trigger, events[trigger])
    })

    const label = document.createElement('label')
    label.setAttribute('for', field.id)
    label.innerText = labelText
    container.appendChild(label)
    
    return container
}

const createInputGroup = ({
    parent,
    prefixHTML,
    inputTag = 'input',
    fieldClass = '',
    suffixHTML,
    events = {},
    fieldAttrs = {},
}={}) => {
    const inputGroup = document.createElement('div')
    inputGroup.className = `input-group`
    parent?.appendChild(inputGroup)

    let prefix
    let suffix

    if (prefixHTML) {
        prefix = document.createElement('div')
        prefix.className = `input-group-text`
        prefix.id = generateRandomString()
        prefix.innerHTML = prefixHTML
        inputGroup.appendChild(prefix)
    }

    const field = document.createElement(inputTag)
    Object.keys(fieldAttrs).forEach(k => field.setAttribute(k, fieldAttrs[k]))
    field.className = `${inputTag === 'select' ? 'form-select' : 'form-control'} ${fieldClass}`
    inputGroup.appendChild(field)

    Object.keys(events).forEach(trigger => {
        field.addEventListener(trigger, events[trigger])
    })

    if (suffixHTML) {
        suffix = document.createElement('div')
        suffix.className = `input-group-text`
        suffix.id = generateRandomString()
        suffix.innerHTML = suffixHTML
        inputGroup.appendChild(suffix)
    }

    field.setAttribute('aria-describedby', prefix?.id || suffix?.id)

    return inputGroup
}