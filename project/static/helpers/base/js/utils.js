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
    hex = hex.split('(')[hex.split('(').length-1]

    let r = parseInt(hex.split(',')[0], 16) / 255;
    let g = parseInt(hex.split(',')[1], 16) / 255;
    let b = parseInt(hex.split(',')[2], 16) / 255;
  
    console.log(hex, r, g, b)

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
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.src = src

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
            reject()
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
            reject()
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