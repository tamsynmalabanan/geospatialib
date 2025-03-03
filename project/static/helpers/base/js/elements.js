const createOffcanvas = (id, options={}) => {
    const toggleTag = options.toggleTag || 'button'
    const toggleClass = options.toggleClass || ''
    const toggleThemed = options.toggleThemed
    const toggleIconClass = options.toggleIconClass
    const toggleLabelText = options.toggleLabelText
    const toggleLabelClass = options.toggleLabelClass || ''
    const toggleTitle = options.toggleTitle || `Toggle ${toggleLabelText ? toggleLabelText : 'sidebar'}`
    const toggleParent = options.toggleParent
    const showOffcanvas = options.showOffcanvas

    const toggle = document.createElement(toggleTag)
    toggle.className = removeWhitespace(`
        ${toggleClass}
        ${toggleTag === 'button' ?  `btn` : ''}
        ${toggleThemed ? `text-bg-${getPreferredTheme()}` : ''}
        ${toggleLabelText ? 'rounded-pill' : 'rounded-circle'}
        ${showOffcanvas ? 'd-lg-none' : ''}
        shadow-lg d-flex flex-nowrap
    `)
    toggle.setAttribute(`${toggleTag === 'button' ? 'type' : 'role'}`, 'button') 
    toggle.setAttribute('data-bs-toggle', 'offcanvas') 
    toggle.setAttribute('data-bs-target', `#${id}`) 
    toggle.setAttribute('aria-controls', id) 
    toggle.setAttribute('title', toggleTitle)
    
    if (toggleIconClass) {
        const toggleIcon = document.createElement('i')
        toggleIcon.className = `bi ${toggleIconClass}`
        toggle.appendChild(toggleIcon)
    }
    
    if (toggleLabelText) {
        const toggleLabel = document.createElement('span')
        toggleLabel.className = `ms-2 text-nowrap ${toggleLabelClass}`
        toggleLabel.innerText = toggleLabelText
        toggle.appendChild(toggleLabel)
    }

    if (toggleParent) toggleParent.appendChild(toggle)

    return [toggle]
}