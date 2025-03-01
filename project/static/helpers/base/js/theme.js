const getPreferredTheme = () => {
    const storedTheme = localStorage.getItem('theme')
    const colorScheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    return storedTheme || colorScheme
}

const toggleThemedElements = (theme, parent=document) => {
    let setThemeTimeout
    Array(
        [['bi-moon'], ['bi-moon-fill']],
        [['btn-light'],['btn-dark']],
        [['btn-outline-light'],['btn-outline-dark']],
        [['text-light'],['text-dark']],
        [['text-bg-light'],['text-bg-dark']],
        [['bg-light'],['bg-dark']],
        [['border-light'],['border-dark']],
        [['table-light'],['table-dark']],
        [['img-light'],['img-dark']],
        [['leaflet-basemap-light'],['leaflet-basemap-dark']],
    ).forEach(classes => {
        const [addClasses, removeClasses] = theme === 'light' ? [classes[0], classes[1]] : [classes[1], classes[0]]
        parent.querySelectorAll(`.${addClasses.join('.')}, .${removeClasses.join('.')}`).forEach(element => {
            element.classList.remove(...removeClasses)
            element.classList.add(...addClasses)
            
            clearTimeout(setThemeTimeout)
            setThemeTimeout = setTimeout(() => {
                const setThemeEvent = new Event('setTheme')
                element.dispatchEvent(setThemeEvent)
            }, 200)
        })
    })
}

const setTheme = (theme) => {
    theme = theme ? theme : getPreferredTheme()
    document.documentElement.setAttribute('data-bs-theme', theme)
    theme = theme === 'auto' ? getPreferredTheme() : theme
    localStorage.setItem('theme', theme)
    toggleThemedElements(theme)
}

const toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute('data-bs-theme')
    setTheme(currentTheme === 'light' ? 'dark' : 'light')
}