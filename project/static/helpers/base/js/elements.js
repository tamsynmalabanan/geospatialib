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
        ${className}
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

const createOffcanvas = (id, {
    themed,
    show,
    toggleTag = 'button',
    toggleClass = '',
    toggleLabelText,
    toggleTitle = `Toggle ${toggleLabelText ? toggleLabelText : 'sidebar'}`,
    toggleParent,
    toggleIconClass,
    toggleLabelClass = ''
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

    

    return [toggle, null]
}