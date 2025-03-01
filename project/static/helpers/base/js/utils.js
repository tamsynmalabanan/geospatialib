const elementResizeObserver = (element, handler) => {
    let resizeTimeout
    
    const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
            if (entry.target === element) {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    console.log('element')
                    handler()
                }, 100)
            }
        }
    });

    resizeObserver.observe(element);
}