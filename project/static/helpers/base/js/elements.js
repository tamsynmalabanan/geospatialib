const customCreateElement = ({
    tag = 'div',
    id,
    className = '',
    parent,
    style = {},
    innerHTML = '',
    attrs = {},
    events = {}
} = {}) => {
    const element = document.createElement(tag)
    element.id = id || generateRandomString()
    element.className = className
    parent?.appendChild(element)
    Object.keys(style).forEach(k => element.style[k] = style[k])
    Object.keys(attrs).forEach(k => element.setAttribute(k, attrs[k]))
    Object.keys(events).forEach(k => element.addEventListener(k, events[k]))
    element.innerHTML = innerHTML
    return element
}

const createButton = ({
    id,
    className = '',
    iconSpecs,
    title,
    disabled,
    parent,
    innerText,
    textClass = '',
    events = {},
    attrs = {},
    style = {},
    name,
} = {}) => {
    const btn = document.createElement('button')
    if (id) btn.id = id
    btn.className = `btn ${className}`
    btn.setAttribute('type', 'button')
    
    Object.keys(attrs).forEach(k => btn.setAttribute(k, attrs[k]))
    if (name) btn.setAttribute('name', name)
    if (title) btn.setAttribute('title', title)
    if (disabled) btn.setAttribute('disabled', true)
    if (iconSpecs) createIcon({className:`bi ${iconSpecs}`, parent:btn})
    if (innerText) createSpan(innerText, {
        parent:btn, 
        className:`${textClass}`
    })

    Object.keys(style).forEach(k => btn.style[k] = style[k])
    Object.keys(events).forEach(k => btn.addEventListener(k, events[k]))
    parent?.appendChild(btn)
    return btn
}

const createIcon = ({
    className='', 
    parent, 
    peNone=true, 
    title,
    style={},
    attrs={},
    events={},
} = {}) => {
    const icon = document.createElement('i')
    icon.className = `${className} ${peNone ? 'pe-none' : ''}`
    Object.keys(style).forEach(k => icon.style[k] = style[k])
    Object.keys(attrs).forEach(k => icon.setAttribute(k, attrs[k]))
    Object.keys(events).forEach(k => icon.addEventListener(k, events[k]))
    if (!peNone) icon.style.cursor = 'pointer'
    if (title) icon.setAttribute('title', title)
    parent?.appendChild(icon)

    return icon
}

const createSpan = (innerText, {id, className = '', parent} = {}) => {
    const label = document.createElement('span')
    if (id) label.id = id
    label.innerText = innerText
    label.className = `${className}`
    parent?.appendChild(label)

    return label
}

const createOffcanvasToggle = (id, {
    tag,
    className,
    themed,
    label,
    show,
    title,
    parent
} = {}) => {
    const toggle = document.createElement(tag)
    toggle.className = removeWhitespace(`
        ${className || ''}
        ${tag === 'button' ?  `btn` : ''}
        ${themed ? `${tag === 'button' ? 'btn' : 'text-bg'}-${getPreferredTheme()}` : ''}
        ${label ? 'rounded-pill' : 'rounded-circle'}
        ${show ? 'd-lg-none' : ''}
        shadow-lg d-flex flex-nowrap
    `)
    toggle.setAttribute(`${tag === 'button' ? 'type' : 'role'}`, 'button') 
    toggle.setAttribute('data-bs-toggle', 'offcanvas') 
    toggle.setAttribute('data-bs-target', `#${id}`) 
    toggle.setAttribute('aria-controls', id) 
    toggle.setAttribute('title', title)

    parent?.appendChild(toggle)

    return toggle
}

const createOffcanvasElement = (id, {
    show,
    className = '', 
    themed, 
    titleText, 
    titleClass,
    toggleIcon = 'bi-layout-sidebar-inset',
} = {}) => {
    const offcanvas = document.createElement('div')
    offcanvas.id = id
    offcanvas.className = removeWhitespace(`
        ${className}
        ${show ? 'offcanvas-lg' : 'offcanvas'}
        ${themed ? `text-bg-${getPreferredTheme()}` : ''}
        shadow-lg border-0 p-0 d-flex flex-column
    `)
    offcanvas.setAttribute('aria-labelledby', `${id}Label`)
    offcanvas.setAttribute('data-bs-scroll', `true`)
    offcanvas.setAttribute('data-bs-backdrop', `false`)

    const header = document.createElement('div')
    header.className = 'offcanvas-header d-flex justify-content-between'
    offcanvas.appendChild(header)

    const title = document.createElement('h5')
    title.id = `${id}Label`
    title.className = `offcanvas-title ${titleClass || ''}`
    title.innerText = titleText
    header.appendChild(title)

    const toggleContainer = document.createElement('div')
    toggleContainer.className = 'd-flex flex-nowrap ms-5'
    header.appendChild(toggleContainer)
    const toggleClassName = 'border-0 bg-transparent fs-20 p-0 ms-3 text-muted bi'

    const sidebarToggle = document.createElement('button')
    sidebarToggle.className = `${toggleClassName} ${show ? toggleIcon : 'bi-window-sidebar'} d-none d-lg-inline`
    sidebarToggle.setAttribute('type', 'button')
    sidebarToggle.setAttribute('onclick', `toggleSidebar("#${id}")`)
    sidebarToggle.setAttribute('title', `Toggle ${titleText}`)
    toggleContainer.appendChild(sidebarToggle)

    const dismissToggle = document.createElement('button')
    dismissToggle.className = `${toggleClassName} ${show ? 'd-lg-none' : ''} bi-x-lg`
    dismissToggle.setAttribute('type', 'button')
    dismissToggle.setAttribute('data-bs-dismiss', 'offcanvas')
    dismissToggle.setAttribute('data-bs-target', `#${id}`)
    dismissToggle.setAttribute('aria-label', 'Close')
    toggleContainer.appendChild(dismissToggle)

    const nav = document.createElement('div')
    nav.className = 'offcanvas-nav'
    offcanvas.appendChild(nav)

    const body = document.createElement('div')
    body.className = 'offcanvas-body overflow-auto flex-grow-1 d-flex p-0 rounded-bottom'
    offcanvas.appendChild(body)

    return offcanvas
}

const createOffcanvas = (id, {
    themed,
    show,
    offcanvasClass,
    toggleTag = 'button',
    toggleClass = '',
    toggleLabelText,
    toggleTitle = `Toggle ${toggleLabelText ? toggleLabelText : 'sidebar'}`,
    toggleParent,
    toggleiconSpecs,
    toggleLabelClass = '',
    titleText = toggleLabelText,
    titleClass,
    offcanvasToggleIcon,
} = {}) => {
    const toggle = createOffcanvasToggle(id, {
        themed: themed,
        show: show,
        tag: toggleTag,
        className: toggleClass,
        title: toggleTitle,
        parent: toggleParent,
        label: toggleLabelText
    })

    if (toggleiconSpecs) createIcon({className: `bi ${toggleiconSpecs}`, parent: toggle})
    if (toggleLabelText) createSpan(toggleLabelText, {className: `ms-2 text-nowrap ${toggleLabelClass}`, parent: toggle})

    const offcanvas = createOffcanvasElement(id, {
        show: show,
        className: offcanvasClass,
        themed: themed,
        titleText: titleText,
        titleClass: titleClass,
        toggleIcon: offcanvasToggleIcon,
    })

    return [toggle, offcanvas]
}

const createNavItem = ({
    parent
} = {}) => {
    const navItem = document.createElement('li')
    navItem.className = 'nav-item'
    parent?.appendChild(navItem)

    return navItem
}

const createAccordionNavTabs = (id, tabData, {
    themed,
    parent
} = {}) => {
    const navTabs = document.createElement('ul')
    navTabs.className = `nav nav-tabs card-header-tabs d-flex flex-nowrap`
    parent?.appendChild(navTabs)

    Object.keys(tabData).forEach(suffix => {
        const data = tabData[suffix]

        const navItem = createNavItem({
            parent: navTabs,
        })

        const navButton = document.createElement('button')
        navButton.className = removeWhitespace(`
            accordion-button rounded-top me-2 pe-2 ps-3 py-1
            ${themed ? `text-bg-${getPreferredTheme()}` : ''}
            ${data.active ? '' : 'collapsed'}
            ${data.active || data.disabled ? 'disabled' : ''}
        `)
        if (data.active || data.disabled) navButton.setAttribute('disabled', 'true')
        navButton.setAttribute('type', 'button')
        navButton.setAttribute('data-bs-toggle', 'collapse')
        navButton.setAttribute('data-bs-target', `#${id}-${suffix}`)
        navButton.setAttribute('aria-expanded', `${data.active ? 'true' : 'false'}`)
        navButton.setAttribute('aria-controls', `${id}-${suffix}`)
        navButton.innerText = data.label
        navItem.appendChild(navButton)

        navButton.addEventListener('click', () => {
            navTabs.querySelectorAll(`.accordion-button`).forEach(btn => {
                if (navButton === btn) {
                    btn.disabled = true
                } else {
                    btn.disabled = false
                }
            })
        })
    })

    createNavItem({
        parent: navTabs,
    })

    return navTabs
}

const createAccordionElement = (id, tabData, {
    themed,
    parent,
    accordionCollapseClass = '',
} = {}) => {
    const accordion = document.createElement('div')
    accordion.id = id
    accordion.className = removeWhitespace(`
        accordion accordion-flush px-0 flex-grow-1 d-flex flex-column
        ${themed ? `text-bg-${getPreferredTheme()}` : ''}
    `)
    parent?.appendChild(accordion)

    Object.keys(tabData).forEach(suffix => {
        const data = tabData[suffix]

        const accordionCollapse = document.createElement('div')
        accordionCollapse.id = `${id}-${suffix}`
        accordionCollapse.className = removeWhitespace(`
            accordion-collapse collapse flex-grow-1 fade
            ${accordionCollapseClass}
            ${data.active ? 'show' : ''}
        `)
        accordionCollapse.setAttribute('data-bs-parent', `#${id}`)
        accordion.appendChild(accordionCollapse)

        const accordionBody = document.createElement('div')
        accordionBody.className = 'accordion-body h-100 p-0 d-flex flex-column flex-grow-1'
        accordionCollapse.appendChild(accordionBody)

    })

    return accordion
}

const createAccordion = (id, tabData, {
    themed = false,
    accordionCollapseClass = '',
} = {}) => {
    const tabs = createAccordionNavTabs(id, tabData, {themed})
    const accordion = createAccordionElement(id, tabData, {
        themed,
        accordionCollapseClass,
    })
    return [tabs, accordion]
}

const createDropdownMenuLi = ({
    innerText, 
    innerHTML,
    child,
    parent,
    btnCallback,
    divider = false,
}={}) => {
    const li = document.createElement('li')
    parent?.appendChild(li)
    
    let element
    if (divider) {
        element = document.createElement('hr')
        element.className = 'dropdown-divider'
    } else if (innerHTML) {
        element = customCreateElement({innerHTML}).firstChild
    } else if (child) {
        element = child
    } else if (innerText || btnCallback) {
        element = document.createElement('button')
        element.className = 'dropdown-item bg-transparent border-0 btn btn-sm fs-12'
        if (btnCallback) element.addEventListener('click', btnCallback)
            
        const label = createSpan(innerText ?? '', {className:'pe-none'})
        element.appendChild(label)
    }
    
    li.appendChild(element)
    return li
}

const createDropdown = ({
    btnClassName = '',
    btniconSpecs,
    btnTitle, 
    menuClassName,
} = {}) => {
    const dropdown = document.createElement('div')
    dropdown.className = 'dropdown'

    const toggle = createButton({
        className: `dropdown-toggle ${btnClassName}`,
        iconSpecs: btniconSpecs,
        attrs: {
            title: btnTitle,
        }
    })
    toggle.setAttribute('data-bs-toggle', 'dropdown')
    toggle.setAttribute('aria-expanded', 'false')
    dropdown.appendChild(toggle)

    const menu = document.createElement('ul')
    menu.className = `dropdown-menu ${menuClassName}`
    dropdown.appendChild(menu)

    return [dropdown, toggle, menu]
}

const createCheckboxOptions = ({
    options,
    name,
    containerClass = '',
    parent,
    type = 'checkbox',
} = {}) => {
    const container = document.createElement('div')
    container.className = `d-flex ${containerClass}`
    parent?.appendChild(container)

    name = name || generateRandomString()

    for (const option in options) {
        const data = options[option]

        const formCheck = document.createElement('div')
        formCheck.className = 'form-check m-0'
        container.appendChild(formCheck)

        const id = data.id || generateRandomString()

        const input = document.createElement('input')
        input.id = id
        input.value = option
        input.className = 'form-check-input'
        input.setAttribute('type', type)
        input.setAttribute('name', type === 'radio' ? name : `${name}-${generateRandomString()}`)
        input.checked = data.checked || false
        input.disabled = data.disabled || false
        if (data.inputAttrs) Object.keys(data.inputAttrs).forEach(attr => input.setAttribute(attr, data.inputAttrs[attr]))
        formCheck.appendChild(input)

        if (data.events) {
            Object.keys(data.events).forEach(k => input.addEventListener(k, data.events[k]))
        }
        
        const label = document.createElement('label')
        label.className = 'form-check-label'
        label.setAttribute('for', id)
        label.innerText = option
        if (data.labelAttrs) Object.keys(data.labelAttrs).forEach(attr => label.setAttribute(attr, data.labelAttrs[attr]))
        formCheck.appendChild(label)
    } 

    return container
}

const createFormCheck = ({
    parent,
    inputValue = '',
    inputId =  generateRandomString(),
    labelInnerText = '',
    fieldClass = '',
    formCheckClass = '',
    disabled=false,
    checked = false,
    labelClass = '',
    events = {},
    role,
    name,
    style={},
} = {}) => {
    const formCheck = document.createElement('div')
    formCheck.className = `form-check m-0 ${formCheckClass} ${role == 'switch' ? 'form-switch' : ''}`
    parent?.appendChild(formCheck)
    
    const input = document.createElement('input')
    input.id = inputId
    input.className = `form-check-input ${fieldClass}`
    input.setAttribute('type', 'checkbox')
    if (role) input.setAttribute('role', role)
    if (name) input.setAttribute('name', name)
    input.value = inputValue
    input.disabled = disabled
    input.checked = checked
    formCheck.appendChild(input)
    Object.keys(events).forEach(k => input.addEventListener(k, events[k]))
    Object.keys(style).forEach(k => input.style[k] = style[k])

    const label = document.createElement('label')
    label.className =  `form-check-label ${labelClass}`
    label.setAttribute('for', input.id)
    label.innerText = labelInnerText
    formCheck.appendChild(label)

    return formCheck
}

const createObjectTRs = (object, parent, {
} = {}) => {
    const handler = (key, value, {prefixes = []} = {}) => {
        if (!value) return
        
        if (typeof value === 'object') {
            prefixes.push(key)
            Object.keys(value).forEach(subKey => {
                const subValue = value[subKey]
                handler(subKey, subValue, {prefixes})
            })
        } else {
            const tr = document.createElement('tr')
            parent.appendChild(tr)

            const label = innerText = [...new Set([...prefixes, key])].map(i => `${i[0].toUpperCase()}${i.slice(1)}`).join(' ')
            
            const th = document.createElement('th')
            th.className = 'bg-transparent'
            th.setAttribute('scope', 'row')
            th.innerText = label
            tr.appendChild(th)
            
            const td = document.createElement('td')
            td.className = 'bg-transparent'
            td.innerText = value.toString()
            tr.appendChild(td)
        }
    }

    for (const key in object) handler(key, object[key])
}

const createModal = ({
    titleText,
    parent,
    contentBody,
    footerBtnText = 'Save',
    show = false,
    static = false,
    closeBtn = true,
    centered = true,
    footerBtns = {},
    className = '', 
}={}) => {
    const modal = document.createElement('div')
    modal.className = `modal fade ${className}`
    modal.setAttribute('tabindex', '-1')
    if (static) {
        modal.setAttribute('data-bs-backdrop', 'static')
        modal.setAttribute('data-bs-keyboard', 'false')
    }
    parent?.appendChild(modal)

    const dialog = document.createElement('div')
    dialog.className = `modal-dialog modal-dialog-scrollable ${centered ? 'modal-dialog-centered' : ''}`
    modal.appendChild(dialog)

    const content = document.createElement('div')
    content.className = 'modal-content'
    dialog.appendChild(content)

    const header = document.createElement('div')
    header.className = 'modal-header'
    content.appendChild(header)

    const title = document.createElement('h5')
    title.className = 'modal-title'
    if (titleText) title.innerText = titleText
    header.appendChild(title)

    if (closeBtn) {
        const close = document.createElement('button')
        close.className = 'btn-close'
        close.setAttribute('type', 'button')
        close.setAttribute('data-bs-dismiss', 'modal')
        close.setAttribute('aria-label', 'Close')
        header.appendChild(close)
    }

    if (contentBody instanceof Element) {
        content.appendChild(contentBody)
    } else {
        const body = document.createElement('div')
        content.appendChild(body)
        if (typeof contentBody === 'string') {
            body.outerHTML = contentBody
        }
    }

    const footer = document.createElement('div')
    footer.className = `modal-footer d-flex justify-content-start`
    content.appendChild(footer)

    if (Object.keys(footerBtns).length) {
        Object.values(footerBtns).forEach(btn => {
            footer.appendChild(btn)
        })
    } else {
        const btn = document.createElement('div')
        btn.className = `btn btn-${getPreferredTheme()}`
        btn.innerText = footerBtnText
        footer.appendChild(btn)
    }

    if (show) {
        const bsModal = new bootstrap.Modal(modal)
        bsModal.show()
    }

     return modal
}

const createFormFloating = ({
    parent,
    fieldTag = 'input',
    fieldAttrs = {},
    fieldId,
    fieldClass = '',
    labelText = '',
    labelClass = '',
    events = {},
    options,
    currentValue = '',
    fieldStyle = {},
    containerClass = '',
    disabled = false,
    fieldMultiple = false,
} = {}) => {
    const container = document.createElement('div')
    container.className = `form-floating ${containerClass}`
    parent?.appendChild(container)

    const field = document.createElement(fieldTag)
    field.id = fieldId || generateRandomString()
    field.className = `${fieldClass} ${fieldTag === 'select' ? 'form-select' : 'form-control'}`
    Object.keys(fieldAttrs).forEach(k => field.setAttribute(k, fieldAttrs[k]))
    Object.keys(fieldStyle).forEach(k => field.style[k] = fieldStyle[k])
    container.appendChild(field)
    field.disabled = disabled
    if (fieldTag === 'select') field.multiple = fieldMultiple

    if (fieldTag === 'select' && options) {
        for (const value in options) {
            const option = document.createElement('option')
            option.value = value
            option.text = options[value]
            
            field.appendChild(option)

            if (fieldMultiple && currentValue.includes(value)) {
                option.selected = true
            } else if (value === currentValue) {
                option.selected = true
            }
        }
    } else {
        if (currentValue) field.value = currentValue
    }
    

    Object.keys(events).forEach(trigger => {
        field.addEventListener(trigger, events[trigger])
    })

    const label = document.createElement('label')
    label.className = `${labelClass}`
    label.setAttribute('for', field.id)
    if (labelText instanceof Element) {
        label.appendChild(labelText)
    } else {
        label.innerText = labelText
    }
    container.appendChild(label)
    
    return container
}

const createInputGroup = ({
    parent,
    prefixHTML,
    fieldTag = 'input',
    fieldClass = '',
    suffixHTML,
    events = {},
    fieldAttrs = {},
    disabled = false,
    inputGroupClass = '',
    currentValue,
    options,
    fieldMultiple = false,
}={}) => {
    const inputGroup = document.createElement('div')
    inputGroup.className = `input-group ${inputGroupClass}`
    parent?.appendChild(inputGroup)

    let prefix
    let suffix

    if (prefixHTML) {
        prefix = document.createElement('div')
        prefix.className = `input-group-text`
        prefix.id = generateRandomString()
        if (prefixHTML instanceof Element) {
            prefix.appendChild(prefixHTML)
        } else {
            prefix.innerHTML = prefixHTML
        }
        inputGroup.appendChild(prefix)
    }

    const field = document.createElement(fieldTag)
    Object.keys(fieldAttrs).forEach(k => field.setAttribute(k, fieldAttrs[k]))
    field.className = `${fieldTag === 'select' ? 'form-select' : 'form-control'} ${fieldClass}`
    inputGroup.appendChild(field)

    if (fieldTag === 'select' && options) {
        for (const value in options) {
            const option = document.createElement('option')
            option.value = value
            option.text = options[value]
            field.appendChild(option)

            if (fieldMultiple && currentValue.includes(value)) {
                option.selected = true
            } else if (value === currentValue) {
                option.selected = true
            }
        }
    } else {
        if (currentValue) field.value = currentValue
    }

    field.disabled = disabled

    Object.keys(events).forEach(trigger => {
        field.addEventListener(trigger, events[trigger])
    })

    if (suffixHTML) {
        suffix = document.createElement('div')
        suffix.className = `input-group-text`
        suffix.id = generateRandomString()
        if (suffixHTML instanceof Element) {
            suffix.appendChild(suffixHTML)
        } else {
            suffix.innerHTML = suffixHTML
        }
        inputGroup.appendChild(suffix)
    }

    field.setAttribute('aria-describedby', prefix?.id || suffix?.id)

    return inputGroup
}

const createTagifyField = ({
    parent,
    name,
    inputTag = 'input',
    placeholder,
    enabled,
    currentValue,
    inputClass = '',
    delimiters = null,
    whitelist = [],
    callbacks = {},
    dropdownClass = '', 
    userInput = true,
    disabled = false,
    scopeStyle = {},
    maxItems = Infinity,
    maxTags = 100,
    events = {},
} = {}) => {

    const input = document.createElement(inputTag)
    input.className = `${inputClass}`
    if (name) input.setAttribute('name', name)
    if (placeholder) input.setAttribute('placeholder', placeholder)
    if (currentValue) input.value = currentValue
    parent?.appendChild(input)
    input.disabled = disabled

    const tagifyObj = new Tagify(input, {
        whitelist,
        userInput,
        delimiters,
        callbacks,
        maxTags,
        dropdown: {
            maxItems,
            classname: dropdownClass, // <- custom classname for this dropdown, so it could be targeted
            enabled,             // <- show suggestions on focus
            closeOnSelect: false    // <- do not hide the suggestions dropdown once an item has been selected
        }
    })

    Object.keys(events).forEach(i => tagifyObj.DOM.scope.addEventListener(i, events[i]))
    Object.keys(scopeStyle).forEach(i => tagifyObj.DOM.scope.style[i] = scopeStyle[i])
}

const createBadgeSelect = ({
    id = generateRandomString(),
    selectClass = '',
    attrs = {},
    disabled = false,
    parent,
    options = {},
    currentValue,
    events = {},
    rounded = true
} = {}) => {
    const select = document.createElement('select')
    select.id = id
    select.className = `badge ${rounded ? 'rounded-pill' : ''} ${selectClass}`
    Object.keys(attrs).forEach(k => select.setAttribute(k, attrs[k]))
    Object.keys(events).forEach(k => select.addEventListener(k, events[k]))
    select.disabled = disabled
    parent?.appendChild(select)

    for (const i in options) {
        const option = document.createElement('option')
        option.value = i
        option.text = options[i]
        if ( currentValue && i === currentValue) option.setAttribute('selected', true)
        select.appendChild(option)
    }

    return select
}

const getSpinnerHTML = ({text='Loading...'} = {}) => {
    return removeWhitespace(`
        <div class="d-flex justify-content-center m-3 gap-2">
            <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
            <span role="status">${text}</span>
        </div>
    `)
}
