const contextMenuHandler = (e, menuItems, {
    title,
    dismissBtn = false,
    style = {},
    movable = false,
} = {}) => {
    L.DomEvent.stopPropagation(e)
    L.DomEvent.preventDefault(e)

    document.querySelector(`.custom-context-menu`)?.remove()
    
    const menuContainer = document.createElement('ul')
    menuContainer.className = removeWhitespace(`
        text-bg-${getPreferredTheme()} 
        custom-context-menu
        dropdown-menu show
        small shadow-sm
    `)
    Object.keys(style).forEach(k => menuContainer.style[k] = style[k])

    if (title || dismissBtn) {
        const header = customCreateElement({
            parent: menuContainer,
            className: 'd-flex flex-nowrap px-3 mb-2',
            style: {fontSize:'14px'}
        })

        if (title) {
            const titleSpan = createSpan(title, {
                parent: header,
                className: 'fw-medium'
            })
        }

        if (dismissBtn) {
            const dismissIcon = createIcon({
                parent: header,
                peNone: false,
                className: 'bi bi-x ms-auto custom-context-menu-dismiss',
                events: {
                    click: (e) => menuContainer.remove()
                }
            })
        }
    }

    if (movable) {
        makeMovable(menuContainer)
    }

    for (const item in menuItems) {
        const data = menuItems[item]
        if (!data) continue

        const btnCallback = data.btnCallback
        if (btnCallback) {
            delete data.btnCallback
            data.btnCallback = (e) => {
                L.DomEvent.stopPropagation(e)
                L.DomEvent.preventDefault(e)
                if (!data.keepMenuOn) menuContainer.remove()
                btnCallback(e)
            }
        }
        const li = createDropdownMenuLi({...data, parent:menuContainer})
    }
    
    document.body.appendChild(menuContainer)
    
    const menuContainerWidth = menuContainer.offsetWidth
    const menuContainerHeight = menuContainer.offsetHeight
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight

    const x = e.x
    const y = e.y

    const left = x === 0 
    ? ((windowWidth - menuContainerWidth) * 0.5) 
    : ((windowWidth - x - menuContainerWidth - 10) >= 0 ? x : x - menuContainerWidth)

    const top = y === 0
    ? ((windowHeight - menuContainerHeight) * 0.30)
    : ((windowHeight - y - menuContainerHeight - 10) >= 0 ? y : y - menuContainerHeight)

    menuContainer.style.left = `${left > 10 ? left : 10}px`
    menuContainer.style.top = `${top > 10 ? top : 10}px`

    return menuContainer
}

document.addEventListener('DOMContentLoaded', () => {
    const handler = (e) => {
        const menu = document.querySelector(`.custom-context-menu`)
        if (menu) {
            alert(e.type)
            const dismissBtn = menu.querySelector('.custom-context-menu-dismiss')
            const escape = e.type === 'resize'
            // const escape = e.type !== 'click' || !document.elementsFromPoint(
            //     e.localX, e.clientY
            // ).find(i => i === menu)
            if (!dismissBtn || escape) menu.remove()
        }
    }

    ['wheel', 'click'].forEach(trigger => {
        document.addEventListener(trigger, handler)
    })

    window.addEventListener("resize", handler)
})
