const toggleSidebar = (sidebarSelector) => {
    const sidebar = document.querySelector(sidebarSelector)
    const button = sidebar.querySelector(`[onclick='toggleSidebar("${sidebarSelector}")']`)
    const toggle = document.querySelector(`[data-bs-toggle="offcanvas"][data-bs-target="${sidebarSelector}"]`)
    const dismiss = document.querySelector(`[data-bs-dismiss="offcanvas"][data-bs-target="${sidebarSelector}"]`)

    if (sidebar.classList.contains('offcanvas-lg')) {
        button.classList.remove('bi-layout-sidebar-inset')
        button.classList.add('bi-window-sidebar')
        
        sidebar.classList.remove('offcanvas-lg')
        sidebar.classList.contains('show') && toggle.click()
        sidebar.classList.add('offcanvas')
        
        toggle.classList.remove('d-lg-none')
        dismiss.classList.remove('d-lg-none')
    } else {
        button.classList.remove('bi-window-sidebar')
        button.classList.add('bi-layout-sidebar-inset')

        sidebar.classList.remove('offcanvas')
        sidebar.classList.add('offcanvas-lg')

        toggle.classList.add('d-lg-none')
        dismiss.classList.add('d-lg-none')
    }
}

const resizeSidebar = (sidebarSelector) => {
    const sidebar = document.querySelector(sidebarSelector)
    const sidebarWidth = sidebar.offsetWidth
            
    let startX = event.clientX
    if (event.type === 'touchstart') {
        startX = event.touches[0].clientX
    }
    
    const onMouseMoveResizeSidebar = (event) => {
        let moveX = event.clientX - startX
        if (event.type === 'touchmove') {
            moveX = event.touches[0].clientX - startX
        }

        sidebar.style.width =`${sidebarWidth + moveX}px`;
    }
    
    Array('mousemove', 'touchmove').forEach(moveTrigger => {
        document.addEventListener(moveTrigger, onMouseMoveResizeSidebar)
    })
    
    const onMouseUpResizeSidebar = () => {
        const rowWidth = sidebar.parentElement.offsetWidth
        const sidebarWidth = sidebar.offsetWidth

        let col = Math.floor(sidebarWidth/(rowWidth/12))

        if (col > 0) {
            if (col < 4) {
                col = 4
            }

            if (col > 9) {
                col = 9
            }

            sidebar.classList.forEach(className => {
                if (className.includes('col-lg-')) {
                    sidebar.classList.remove(className)
                }
            })

            sidebar.classList.add(`col-lg-${col}`)
        } else {
            toggleSidebar(sidebarSelector)
        }

        
        sidebar.style.width = ''
        document.removeEventListener('mousemove', onMouseMoveResizeSidebar);
        document.removeEventListener('mouseup', onMouseUpResizeSidebar)
    }

    Array('mouseup', 'touchend').forEach(endTrigger => {
        document.addEventListener(endTrigger, onMouseUpResizeSidebar)
    })
}