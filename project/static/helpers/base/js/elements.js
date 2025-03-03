const createOffcanvas = (id, options={}) => {
    const toggleTag = options.toggleTag || 'button'
    const toggleThemed = options.toggleThemed
    const toggleIconClass = options.toggleIcon
    const toggleLabel = options.toggleLabel
    const toggleLabelClass = options.toggleLabelClass || ''
    const toggleTitle = options.toggleTitle || `Toggle ${toggleLabel ? toggleLabel : 'sidebar'}`
    const showOffcanvas = options.showOffcanvas

    const toggle = document.createElement(toggleTag)
    toggle.className = removeWhitespace(`
        ${toggleTag === 'button' ?  `btn` : ''}
        ${toggleThemed ? `text-bg-${getPreferredTheme()}` : ''}
        ${toggleLabel ? 'rounded-pill' : 'rounded-circle'}
        ${showOffcanvas ? 'd-lg-none' : ''}
        shadow-lg d-flex flex-nowrap
    `)
    toggle.setAttribute(`${toggleTag === 'button' ? 'type' : 'role'}`, 'button') 
    toggle.setAttribute('data-bs-toggle', 'offcanvas') 
    toggle.setAttribute('data-bs-target', `#${id}`) 
    toggle.setAttribute('aria-controls', id) 
    toggle.setAttribute('title', toggleTitle)
    
    const toggleIcon = document.createElement('i')
    toggleIcon.className = `bi ${toggleIconClass}`

    if (toggleLabel) {
        const toggleLabel = document.createElement('span')
        toggleLabel.className = `ms-2 text-nowrap ${toggleLabelClass}`
        toggleLabel.innerText = toggleLabel
    }
    
    console.log(toggle)
}