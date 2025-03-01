const getPreferredTheme = () => {
    const storedTheme = localStorage.getItem('theme')
    const colorScheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    return storedTheme || colorScheme
}

const themeClasses = [
    [['bi-moon', 'text-bg-light'], ['bi-moon-fill', 'text-bg-dark']],

    // {
    //     elements: parent.querySelectorAll(`[onclick='toggleTheme()']`),
    //     classes: {
    //         light: ['bi-moon'],
    //         dark: ['bi-moon-fill'],
    //     }
    // },
    // {
    //     elements: Array.from(parent.querySelectorAll(`.btn-light, .btn-dark`)),
    //     classes: {
    //         light: ['btn-light'],
    //         dark: ['btn-dark'],
    //     }
    // },
]

const toggleThemedElements = (theme, parent=document) => {
    let setThemeTimeout
    themeClasses.forEach(classes => {
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

document.addEventListener('htmx:afterSwap', (event) => {
    const target = event.target.parentElement || event.target
    toggleThemedElements(getPreferredTheme(), parent=target)
})