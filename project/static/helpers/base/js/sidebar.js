const toggleSidebar = (sidebarSelector) => {
    const sidebar = document.querySelector(sidebarSelector)
    
    if (sidebar.classList.contains('offcanvas-lg')) {
        sidebar.classList.remove('offcanvas-lg')
        sidebar.classList.add('offcanvas')
    } else {
        sidebar.classList.remove('offcanvas')
        sidebar.classList.add('offcanvas-lg')
    }
}