const createOffcanvas = (options={}) => {
    const toggleTag = options.toggleTag || 'button'
    const toggleThemed = options.toggleThemed

    const toggle = document.createElement('button')
    toggle.className = `
        ${toggleTag === 'button' ?  `btn` : ''}
        ${toggleThemed ? `text-bg-${getPreferredTheme()}` : ''}
        rounded-pill shadow-lg
    `

    console.log(toggle)
}