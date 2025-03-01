const getPreferredTheme = () => {
    const storedTheme = localStorage.getItem('theme')
    const colorScheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    return storedTheme || colorScheme
}

const setTheme = (theme) => {
    theme = theme === 'auto' ? getPreferredTheme() : theme
    localStorage.setItem('theme', theme)
    console.log(theme)
    // toggleThemedElements(theme)
}

const toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute('data-bs-theme')
    setTheme(currentTheme === 'light' ? 'dark' : 'light')
}

