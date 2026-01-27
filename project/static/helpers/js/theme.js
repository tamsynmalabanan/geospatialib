const getPreferredTheme = () => getCookie('theme') ?? 'light'

const themeClasses = Array(
    [['bg-light'],['bg-dark']],
    [['bg-light-75'],['bg-dark-75']],
    
    [['btn-light'],['btn-dark']],
    [['btn-outline-dark'],['btn-outline-light']],
    
    [['text-dark'],['text-light']],
    [['text-bg-light'],['text-bg-dark']],
    
    [['border-light'],['border-dark']],
    [['border-top-light'],['border-top-dark']],
    
    [['table-light'],['table-dark']],
    [['img-light'],['img-dark']],
    [['bi-sun'],['bi-moon']],
)

const toggleThemedElements = (theme, parent=document) => {
    themeClasses.forEach(classes => {
        const [addClasses, removeClasses] = theme === 'light' ? classes : structuredClone(classes).reverse()
        parent.querySelectorAll(`.${addClasses.join('.')}:not(.ignore-theme), .${removeClasses.join('.')}:not(.ignore-theme)`).forEach(element => {
            element.classList.remove(...removeClasses)
            element.classList.add(...addClasses)
            
        })
    })
    
    const event = new Event('themeToggled')
    parent.dispatchEvent(event)
}

const setTheme = (theme) => {
    theme = !theme || theme === 'auto' ? getPreferredTheme() : theme
    setCookie('theme', theme)
    
    document.documentElement.setAttribute('data-bs-theme', theme)
    toggleThemedElements(theme)
}

const toggleTheme = () => {
    setTheme(
        getPreferredTheme() !== 'light' 
        ? 'light' 
        : 'dark'
    )
}