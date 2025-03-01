const toggleSidebar = (sidebarSelector) => {
    const sidebar = document.querySelector(sidebarSelector)
    const button = sidebar.querySelector(`[onclick='toggleSidebar("${sidebarSelector}")']`)
    const sidebarGutter = sidebar.parentElement.querySelector('.sidebar-gutter')
    const dismiss = sidebar.querySelector(`[data-bs-dismiss="offcanvas"][data-bs-target="${sidebarSelector}"]`)
    const toggle = document.querySelector(`[data-bs-toggle="offcanvas"][data-bs-target="${sidebarSelector}"]`)

    if (sidebar.classList.contains('offcanvas-lg')) {
        sidebar.classList.remove('offcanvas-lg')
        sidebar.classList.add('offcanvas')
        sidebar.classList.contains('show') && toggle.click()
        
        button.classList.remove('bi-layout-sidebar-inset')
        button.classList.add('bi-window-sidebar')
        
        sidebarGutter && sidebarGutter.classList.remove('d-lg-block')
        dismiss.classList.remove('d-lg-none')
        toggle.classList.remove('d-lg-none')
    } else {
        sidebar.classList.remove('offcanvas')
        sidebar.classList.add('offcanvas-lg')
        
        button.classList.remove('bi-window-sidebar')
        button.classList.add('bi-layout-sidebar-inset')
        
        sidebarGutter && sidebarGutter.classList.add('d-lg-block')
        dismiss.classList.add('d-lg-none')
        toggle.classList.add('d-lg-none')
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
        document.body.classList.add('user-select-none')
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
        document.body.classList.remove('user-select-none')

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