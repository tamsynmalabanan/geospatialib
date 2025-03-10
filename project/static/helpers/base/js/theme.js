const getPreferredTheme = () => getCookie('theme') || 'light'

const themedElements = (theme, parent=document) => {
    let setThemeTimeout
    
    Array(
        [['bi-moon'], ['bi-moon-fill']],
        [['btn-light'],['btn-dark']],
        [['btn-outline-dark'],['btn-outline-light']],
        [['text-light'],['text-dark']],
        [['text-bg-light'],['text-bg-dark']],
        [['bg-light'],['bg-dark']],
        [['border-light'],['border-dark']],
        [['table-light'],['table-dark']],
        [['img-light'],['img-dark']],
        [['layer-light'],['layer-dark']],
    ).forEach(classes => {
        const [addClasses, removeClasses] = theme === 'light' ? classes : classes.reverse() //[classes[1], classes[0]]
        parent.querySelectorAll(`.${addClasses.join('.')}, .${removeClasses.join('.')}`).forEach(element => {
            element.classList.remove(...removeClasses)
            element.classList.add(...addClasses)
            
            clearTimeout(setThemeTimeout)
            setThemeTimeout = setTimeout(() => {
                const setThemeEvent = new Event('setTheme')
                document.dispatchEvent(setThemeEvent)
            }, 200)
        })
    })
}

const setTheme = (theme) => {
    theme = !theme || theme === 'auto' ? getPreferredTheme() : theme
    document.documentElement.setAttribute('data-bs-theme', theme)
    setCookie('theme', theme)
    themedElements(theme)
}

const toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute('data-bs-theme')
    setTheme(currentTheme === 'light' ? 'dark' : 'light')
}