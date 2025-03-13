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
    clichHandler,
} = {}) => {
    const btn = document.createElement('button')
    if (id) btn.id = id
    btn.className = `btn ${className}`
    btn.setAttribute('type', 'button')
    if (title) btn.setAttribute('title', title)
    if (disabled) btn.setAttribute('disabled', true)
    if (iconClass) createIcon({className:`bi ${iconClass}`, parent:btn})
    if (clichHandler) btn.addEventListener('click', clichHandler)
    return btn
}

const createIcon = ({className='', parent, peNone=true} = {}) => {
    const icon = document.createElement('i')
    icon.className = `${className} ${peNone ? 'pe-none' : ''}`
    parent?.appendChild(icon)

    return icon
}

const createLabel = (innerText, {className, parent} = {}) => {
    const label = document.createElement('span')
    label.innerText = innerText
    label.className = className || ''
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
    className, 
    themed, 
    titleText, 
    titleClass,
    toggleIcon = 'bi-layout-sidebar-inset',
} = {}) => {
    const offcanvas = document.createElement('div')
    offcanvas.id = id
    offcanvas.className = removeWhitespace(`
        ${className || ''}
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
    if (toggleLabelText) createLabel(toggleLabelText, {className: `ms-2 text-nowrap ${toggleLabelClass}`, parent: toggle})

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
    parent
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
        accordionCollapse.className = `accordion-collapse collapse flex-grow-1 fade ${data.active ? 'show' : ''}`
        accordionCollapse.setAttribute('data-bs-parent', `#${id}`)
        accordion.appendChild(accordionCollapse)

        const accordionBody = document.createElement('div')
        accordionBody.className = 'accordion-body h-100 p-0'
        accordionCollapse.appendChild(accordionBody)

    })

    return accordion
}

const createAccordion = (id, tabData, {themed = false} = {}) => {
    const tabs = createAccordionNavTabs(id, tabData, {themed})
    const accordion = createAccordionElement(id, tabData, {themed})
    return [tabs, accordion]
}

const createDropdownMenuLi = ({innerText, parent}={}) => {
    const li = document.createElement('li')
    parent?.appendChild(li)
    
    const btn = document.createElement('button')
    btn.className = 'dropdown-item bg-transparent border-0 btn btn-sm fs-12'
    li.appendChild(btn)

    const label = createLabel(innerText)
    btn.appendChild(label)

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
} = {}) => {
    const formCheck = document.createElement('div')
    formCheck.className = 'form-check'
    parent?.appendChild(formCheck)
    
    const input = document.createElement('input')
    input.id = inputId
    input.className = 'form-check-input'
    input.setAttribute('type', 'checkbox')
    input.value = inputValue
    formCheck.appendChild(input)

    const label = document.createElement('label')
    label.className = 'form-check-label'
    label.setAttribute('for', input.id)
    label.innerText = labelInnerText

    return formCheck
}