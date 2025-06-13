const svgNS = "http://www.w3.org/2000/svg"

const elementResizeObserver = (element, callback) => {
    let resizeTimeout
    
    const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
            if (entry.target === element) {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    callback(element)
                }, 100)
            }
        }
    });

    resizeObserver.observe(element);
}

const animateElement = (element, animation, {
    initTime = 3000,
    timeoutMs = 4000,
    effect = 'ease-in-out',
    resetTrigger,
    callback,
} = {}) => {
    let handlerTimeout
    const handler = () => setTimeout(() => {
        element.classList.add(animation)
        element.style.animation = `${animation} ${timeoutMs}ms ${effect}`
        
        setTimeout(() => {
            if (element.classList.contains(animation)) {
                element.classList.remove(animation)
                callback && callback(element)
            }
        }, timeoutMs-100)
    }, initTime)

    if (resetTrigger !== false) {
        element.addEventListener(!resetTrigger || resetTrigger === true ? 'mouseover' : resetTrigger, () => {
            clearTimeout(handlerTimeout)
            element.classList.remove(animation)
            element.style.animation = ''
        })
        
        element.addEventListener('mouseout', () => {
            handlerTimeout = handler()
        })
    }

    handlerTimeout = handler()
}

const addClassListToSelection = (parent, selector, classList) => {
    parent.querySelectorAll(selector).forEach(el => el.classList.add(...classList))
}

const isViewHeight = (element) => element.offsetHeight === window.innerHeight

const generateRandomString = (length=16) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    let result = ''

    const charactersLength = characters.length
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength))
    }

    return result
}

const generateRandomColor = () => `hsla(${Math.floor(Math.random() * 361)}, 100%, 50%, 1)`

const parseNumberFromString = (string) => {
    const regex = /\d+(\.\d+)?/;
    const match = string.match(regex);
    return match?.length ? parseFloat(match[0]) : null
}

const manageHSLAColor = (color) => {
    if (!color || !color.startsWith('hsla')) return
    
    const [h,s,l,a] = color.split(',').map(str => parseNumberFromString(str))
    
    const obj = {
        h: h || 1,
        s,
        l,
        a: a ?? 1,
    }

    obj.toString = ({
        h=obj.h,
        s=obj.s,
        l=obj.l,
        a=obj.a,
    }={}) => {
        return `hsla(${h}, ${s}%, ${l}%, ${a})`
    }
    
    return obj
}

const pushURLParams = (url, params) => {
    const urlObj = new URL(url)
    for (const key in params) {
        urlObj.searchParams.set(key, params[key])
    }
    return urlObj.toString()
}

const formatNumberWithCommas = (number) => {
    let [integer, decimal] = number.toString().split(".")
    integer = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    return integer + (decimal ? "." + decimal : '')
}

const toggleCollapseElements = (parent) => {
    const collapseElements = Array.from(parent.querySelectorAll('.collapse'))
    const hide = collapseElements.some(el => el.classList.contains('show'))
    collapseElements.forEach(el => {
        if (el.classList.contains('show') === hide) {
            const instance = bootstrap.Collapse.getOrCreateInstance(el)
            hide ? instance.hide() : instance.show()
        }
    })
}

const hslToHex = ({h, s, l}={}) => {
    if (!h || !s || !l) return
    l /= 100
    const a = s * Math.min(l, 1 - l) / 100
    const f = n => {
      const k = (n + h / 30) % 12
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
      return Math.round(255 * color).toString(16).padStart(2, '0')
    }
    return `#${f(0)}${f(8)}${f(4)}`
}

const hexToHSLA = (hex) => {
    // Convert hex to RGB
    let r = parseInt(hex.substring(1, 3), 16) / 255;
    let g = parseInt(hex.substring(3, 5), 16) / 255;
    let b = parseInt(hex.substring(5, 7), 16) / 255;
  
    // Find max and min values of RGB
    let max = Math.max(r, g, b);
    let min = Math.min(r, g, b);
    let delta = max - min;
  
    // Calculate Lightness
    let l = (max + min) / 2;
  
    // Calculate Saturation
    let s = 0;
    if (delta !== 0) {
      s = l < 0.5 ? delta / (max + min) : delta / (2 - max - min);
    }
  
    // Calculate Hue
    let h = 0;
    if (delta !== 0) {
      if (max === r) {
        h = (g - b) / delta;
      } else if (max === g) {
        h = 2 + (b - r) / delta;
      } else if (max === b) {
        h = 4 + (r - g) / delta;
      }
    }
    h = Math.round(h * 60);
    if (h < 0) {
      h += 360;
    }
  
    // Convert to percentages
    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);
  
    return `hsla(${h}, ${s}%, ${l}%, 1)`;
}

const outerHTMLToDataURL = async (outerHTML, {
    backgroundColor=null,
    width=null,
    height=null,
    x=0,
    y=0,
}={}) => {
    const element = customCreateElement({innerHTML:outerHTML}).firstChild
    if (element instanceof Element) {
        document.body.appendChild(element)
        try {
            const canvas = await html2canvas(element, {
                backgroundColor,
                width,
                height,
                x,
                y,
            })
            return canvas.toDataURL('image/png')
        } catch (error) {
            console.log(error)
        } finally {
            element.remove()
        }
    }
}

const createNewImage = (src, {
    opacity = 1, 
    angle = 0,
    width = null,
    height = null,
} = {}) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        // img.src = src.startsWith('http') ? `/htmx/cors_proxy/?url=${encodeURIComponent(src)}` : src
        img.src = src
        console.log('createNewImage',img)

        img.onload = () => {
            const canvas = document.createElement("canvas")
            const ctx = canvas.getContext("2d")
    
            const radians = (angle * Math.PI) / 180
            canvas.width = Math.max(Math.abs(img.width * Math.cos(radians)) + Math.abs(img.height * Math.sin(radians)), (width || 0))
            canvas.height = Math.max(Math.abs(img.width * Math.sin(radians)) + Math.abs(img.height * Math.cos(radians)), (height || 0))
    
            ctx.translate(canvas.width / 2, canvas.height / 2)
            ctx.rotate(radians)
            ctx.globalAlpha = opacity
    
            ctx.drawImage(img, -img.width/2, -img.height/2);
    
            const dataUrl = canvas.toDataURL("image/png")
            resolve(dataUrl)
        }

        img.onerror = (e) => {
            console.log(e)
            resolve(`data:image/png;base64,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`)
        }
    })
}

const svgToDataURL = (svg) => {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")

        const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" })
        const blobURL = URL.createObjectURL(svgBlob)

        const img = new Image()
        img.onload = () => {
            canvas.width = img.width
            canvas.height = img.height
            ctx.drawImage(img, 0, 0)
            URL.revokeObjectURL(blobURL)

            const dataUrl = canvas.toDataURL("image/png")
            resolve(dataUrl)
        }

        img.onerror = () => {
            URL.revokeObjectURL(blobURL)
            reject(new Error("Failed to load the SVG into the Image object"))
        }

        img.src = blobURL
    })
}

const resetController = ({
    controller, 
    message = 'Aborted.'
} = {}) => {
    if (controller) controller.abort(message)
    controller = new AbortController()
    controller.id = generateRandomString()
    return controller
}

const relationHandlers = (name) => {
    return {
        equals: (v1, v2, {caseSensitive=true}={}) => {
            const v2IsNum = !isNaN(Number(v2))
            const v1Str = v2IsNum ? parseFloat(v1) : String(v1)
            const v2Str = v2IsNum ? parseFloat(v2) : String(v2)
            if (v2IsNum || caseSensitive) {
                return v1Str === v2Str
            } else {
                return v1Str.toLowerCase() === v2Str.toLowerCase()
            }
        },
        contains: (v1, v2, {caseSensitive=true}={}) => {
            const v1Str = String(v1)
            const v2Str = String(v2)
            if (caseSensitive) {
                return v1Str.includes(v2Str)
            } else {
                return v1Str.toLowerCase().includes(v2Str.toLowerCase())
            }
        },
        greaterThan: (v1, v2) => {
            const v1Num = parseFloat(v1)
            const v2Num = parseFloat(v2)
            if (isNaN(v1Num) || isNaN(v2Num)) throw new Error('NaN')
            return v1Num > v2Num
        },
        greaterThanEqualTo: (v1, v2) => {
            const v1Num = parseFloat(v1)
            const v2Num = parseFloat(v2)
            if (isNaN(v1Num) || isNaN(v2Num)) throw new Error('NaN')
            return v1Num >= v2Num
        },
        lessThan: (v1, v2) => {
            const v1Num = parseFloat(v1)
            const v2Num = parseFloat(v2)
            if (isNaN(v1Num) || isNaN(v2Num)) throw new Error('NaN')
            return v1Num < v2Num
        },
        lessThanEqualTo: (v1, v2) => {
            const v1Num = parseFloat(v1)
            const v2Num = parseFloat(v2)
            if (isNaN(v1Num) || isNaN(v2Num)) throw new Error('NaN')
            return v1Num <= v2Num
        },
    }[name]
}

const removeWhitespace = (str) => (str.replace(/\s{2,}/g, ' ')).trim()

const makeMovable = (element) => {
    let isDragging = false, offsetX, offsetY
  
    element.addEventListener("mousedown", (e) => {
        if (e.target.getAttribute('name')) return
    
        isDragging = true
        offsetX = e.clientX - element.offsetLeft
        offsetY = e.clientY - element.offsetTop
        element.style.cursor = "grabbing"
    })
  
    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return
        element.style.left = `${e.clientX - offsetX}px`
        element.style.top = `${e.clientY - offsetY}px`
    })
  
    document.addEventListener("mouseup", () => {
      isDragging = false
      element.style.cursor = ""
    })
}

const isCompressedFile = (file) => {
    const compressedExtensions = ['zip', 'rar', '7z', 'tar', 'gz']
    const fileName = file.name.toLowerCase()
    const fileExtension = fileName.split('.').pop()
    return compressedExtensions.includes(fileExtension)
}

const getZippedFiles = async (zipFile, basePath) => {
    try {
        const zip = await JSZip.loadAsync(zipFile)
        const filesArray = []

        for (const relativePath in zip.files) {
            const filename = [basePath, relativePath].filter(i => i).join('/')
            const entry = zip.files[relativePath]
            if (!entry.dir) { 
                const content = await entry.async('blob')
                const file = new File([content], filename, {
                    lastModified: entry.date.getTime(),
                })

                if (isCompressedFile(file)) {
                    (await getZippedFiles(file, filename)).forEach(i => filesArray.push(i))
                } else {
                    filesArray.push(file)
                }
            }
        }
        return filesArray
    } catch (error) {
        throw new Error(`Error processing zip file: ${error.message}`)
    }
}

const getValidFilesArray = async (filesArray) => {
    const files = []

    const handler = async (filesArray) => {
        for (const file of filesArray) {
            if (isCompressedFile(file)) {
                const zippedFiles = await getZippedFiles(file, file.name)
                await handler(zippedFiles)
            } else {
                files.push(file)
            }
        }
    }

    await handler(filesArray)
    return files
}

const getFileRawData = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        
        reader.onload = async (e) => {
            try {
                resolve(e.target.result)
            } catch (error) {
                console.log(error)
                reject(error)
            }
            reject(new Error('unsupported file'))
        }

        reader.onerror = async (e) => {
            console.log(e)
            reject(error)
        }

        reader.readAsText(file)
    })
}

const removeQueryParams = (urlString) => {
    const url = new URL(urlString)
    url.search = ''
    return url.toString()
}

const pushQueryParamsToURLString = (url, params) => {
    const url_obj = new URL(url)
    for (const key in params) {
        url_obj.searchParams.set(key, params[key])
    }
    return url_obj.toString()
}

const parseXML = (xmlString) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    const rootElement = xmlDoc.documentElement;
    
    let namespace
    const namespaces = rootElement.attributes;
    for (let i = 0; i < namespaces.length; i++) {
        const name = namespaces.item(i).name
        if (name.startsWith('xmlns')) {
            namespace = namespaces.item(i).value
        }
    }

    return [namespace, rootElement]
}