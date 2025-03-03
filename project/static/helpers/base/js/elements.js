const createOffcanvas = (id, options={}) => {
    const toggleTag = options.toggleTag || 'button'
    const toggleThemed = options.toggleThemed
    const toggleIconClass = options.toggleIcon
    const toggleLabel = options.toggleLabel

    const toggle = document.createElement(toggleTag)
    toggle.className = removeWhitespace(`
        ${toggleTag === 'button' ?  `btn` : ''}
        ${toggleThemed ? `text-bg-${getPreferredTheme()}` : ''}
        ${toggleLabel ? 'rounded' : 'rounded-circle'}
        ${toggleIconClass ? toggleIconClass : ''}
        shadow-lg
    `)
    if (toggleTag === 'button') toggle.type = 'button' 
    if (toggleTag !== 'button') toggle.role = 'button'
    toggle.setAttribute('data-bs-toggle', 'offcanvas') 
    toggle.setAttribute('data-bs-target', `#${id}`) 
    toggle.setAttribute('aria-controls', id) 
    
}