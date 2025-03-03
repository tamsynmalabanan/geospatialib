const createIcon = (opt={}) => {
    const icon = document.createElement('i')
    icon.className = opt.className || ''
    opt.parent?.appendChild(icon)
}

const createLabel = (innerText, opt={}) => {
    const label = document.createElement('span')
    label.innerText = innerText
    label.className = opt.className || ''
    opt.parent?.appendChild(label)
}

const createOffcanvasToggle = (id, opt={}) => {
    const toggle = document.createElement(opt.tag)
    toggle.className = removeWhitespace(`
        ${opt.class}
        ${opt.tag === 'button' ?  `btn` : ''}
        ${opt.themed ? `${opt.tag === 'button' ? 'btn' : 'text-bg'}-${getPreferredTheme()}` : ''}
        ${opt.label ? 'rounded-pill' : 'rounded-circle'}
        ${opt.show ? 'd-lg-none' : ''}
        shadow-lg d-flex flex-nowrap
    `)
    toggle.setAttribute(`${opt.tag === 'button' ? 'type' : 'role'}`, 'button') 
    toggle.setAttribute('data-bs-toggle', 'offcanvas') 
    toggle.setAttribute('data-bs-target', `#${id}`) 
    toggle.setAttribute('aria-controls', id) 
    toggle.setAttribute('title', opt.title)

    toggleParent?.appendChild(toggle)

    return toggle
}

const createOffcanvas = (id, opt={}) => {
    const themed = opt.themed
    const show = opt.show
    const toggleTag = opt.toggleTag || 'button'
    const toggleClass = opt.toggleClass || ''
    const toggleTitle = opt.toggleTitle || `Toggle ${toggleLabelText ? toggleLabelText : 'sidebar'}`
    const toggleParent = opt.toggleParent
    const toggleIconClass = opt.toggleIconClass
    const toggleLabelText = opt.toggleLabelText
    const toggleLabelClass = opt.toggleLabelClass || ''

    const toggle = createOffcanvasToggle(id, {
        themed: themed,
        show: show,
        tag: toggleTag,
        class: toggleClass,
        title: toggleTitle,
        parent: toggleParent,
        label: toggleLabelText
    })
    if (toggleIconClass) createIcon({className: `bi ${toggleIconClass}`, parent: toggle})
    if (toggleLabelText) createLabel(toggleLabelText, {className: `ms-2 text-nowrap ${toggleLabelClass}`, parent: toggle})

    return [toggle, null]
}