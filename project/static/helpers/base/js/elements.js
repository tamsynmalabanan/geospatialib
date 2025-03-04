const createIcon = ({className, parent} = {}) => {
    const icon = document.createElement('i')
    icon.className = className || ''
    parent?.appendChild(icon)
}

const createLabel = (innerText, {className, parent} = {}) => {
    const label = document.createElement('span')
    label.innerText = innerText
    label.className = className || ''
    parent?.appendChild(label)
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
    titleClass
} = {}) => {
    const offcanvas = document.createElement('div')
    offcanvas.id = id
    offcanvas.className = `
        ${className || ''}
        ${show ? 'offcanvas-lg' : 'offcanvas'}
        ${themed ? `text-bg-${getPreferredTheme()}` : ''}
        shadow-lg border-0 p-0 d-flex flex-column
    `
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
    sidebarToggle.className = `${toggleClassName} ${show ? 'bi-layout-sidebar-inset' : 'bi-window-sidebar'} d-none d-lg-inline`
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
    body.className = 'offcanvas-body px-3 overflow-auto flex-grow-1 mb-3'
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
        titleClass: titleClass
    })

    return [toggle, offcanvas]
}

const createAccordionNavTabs = (tabs, {
    parent
} = {}) => {
    const navTabs = document.createElement('ul')
    navTabs.className = `nav nav-tabs card-header-tabs ps-3`
    parent?.appendChild(navTabs)

    Object.keys(tabs).forEach(label => {
        const properties = tabs[label]

        const navItem = document.createElement('li')
        navItem.className - 'nav-item'
        navTabs.appendChild(navItem)

        const navButton = document.createElement('button')
        navButton.className = removeWhitespace(`
            accordion-button rounded-top z-3 me-2 pe-2 ps-3 py-1 text-bg-${getPreferredTheme()}
            ${properties.active ? '' : 'collapsed'}
            ${properties.disabled ? 'disabled' : ''}
        `)
        navButton.setAttribute('type', 'button')
        navButton.setAttribute('data-bs-toggle', 'collapse')
        navButton.setAttribute('data-bs-target', `#${properties.id}`)
        navButton.setAttribute('aria-expanded', `${properties.active ? 'true' : 'false'}`)
        navButton.setAttribute('aria-controls', properties.id)
        navButton.innerText = label
        navItem.appendChild(navButton)
    })

    return navTabs
}