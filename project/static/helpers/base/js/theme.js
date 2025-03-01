const getPreferredTheme = () => {
    const storedTheme = localStorage.getItem('theme')
    const colorScheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    return storedTheme || colorScheme
}

const getThemeControls = (parent=document) => {
    return [
        {
            elements: parent.querySelectorAll(`[onclick='toggleDarkMode(event)']`),
            classes: {
                light: ['bi-moon'],
                dark: ['bi-moon-fill'],
            }
        },
    ]
}

const toggleThemedElements = (theme, parent=document) => {
    let setThemeTimeout
    getThemeControls(parent).forEach(control => {
        control.elements.forEach(element => {
            for (let themeName in control.classes) {
                const themeClasses = control.classes[themeName];

                if (themeName === theme) {  
                    themeClasses.forEach(className => {
                        element.classList.add(className);
                    })
                } else {
                    themeClasses.forEach(className => {
                        element.classList.remove(className);
                    })
                }
            }

            clearTimeout(setThemeTimeout)
            setThemeTimeout = setTimeout(() => {
                const setThemeEvent = new Event('setTheme')
                document.dispatchEvent(setThemeEvent)
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