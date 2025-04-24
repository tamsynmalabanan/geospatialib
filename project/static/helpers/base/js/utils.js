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

const removeWhitespace = (str) => (str.replace(/\s{2,}/g, ' ')).trim()

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
    return parsedNumber = parseFloat(match[0]);
}

const manageHSLAColor = (color) => {
    if (!color || !color.startsWith('hsla')) return
    
    const [h,s,l,a] = color.split(',').map(str => parseNumberFromString(str))
    const obj = {
        h,
        s,
        l,
        a,
    }
    obj.toString = (up) => {
        return `hsla(${up.h ?? obj.h}, ${up.s ?? obj.s}%, ${up.l ?? obj.l}%, ${up.a ?? obj.a})`
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
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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

const relationHandlers = (name) => {
    return {
        equals: (v1, v2, {caseSensitive=true}={}) => {
            const v1Str = String(v1)
            const v2Str = String(v2)
            if (caseSensitive) {
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
            const v1Num = Number(v1)
            const v2Num = Number(v2)
            if (isNaN(v1Num) || isNaN(v2Num)) throw new Error('NaN')
            return v1Num > v2Num
        },
        greaterThanEqualTo: (v1, v2) => {
            const v1Num = Number(v1)
            const v2Num = Number(v2)
            if (isNaN(v1Num) || isNaN(v2Num)) throw new Error('NaN')
            return v1Num >= v2Num
        },
        lessThan: (v1, v2) => {
            const v1Num = Number(v1)
            const v2Num = Number(v2)
            if (isNaN(v1Num) || isNaN(v2Num)) throw new Error('NaN')
            return v1Num < v2Num
        },
        lessThanEqualTo: (v1, v2) => {
            const v1Num = Number(v1)
            const v2Num = Number(v2)
            if (isNaN(v1Num) || isNaN(v2Num)) throw new Error('NaN')
            return v1Num <= v2Num
        },
    }[name]
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

const modifyImage = (src, {
    opacity = 1, 
    angle = 0,
    width = null,
    height = null,
} = {}, callback) => {
    if (!src) return

    console.log(src)

    if(src.startsWith('http')) {
        fetchCORSProxy(src)
        .then(response => console.log(response))
    }

    const img = new Image();
    img.src = src.startsWith('http') ? `/htmx/cors_proxy/?url=${encodeURIComponent(src)}` : src

    img.onload = () => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")

        const radians = (angle * Math.PI) / 180; // Convert angle to radians
        canvas.width = Math.max(Math.abs(img.width * Math.cos(radians)) + Math.abs(img.height * Math.sin(radians)), (width || 0))
        canvas.height = Math.max(Math.abs(img.width * Math.sin(radians)) + Math.abs(img.height * Math.cos(radians)), (height || 0))

        // Translate to the center of the canvas for rotation
        ctx.translate(canvas.width / 2, canvas.height / 2);

        // Apply rotation
        ctx.rotate((angle * Math.PI) / 180);


        // Set transparency
        ctx.globalAlpha = opacity;

        // Draw the image, adjusting for the center
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        // Pass the Data URL to the callback
        callback(canvas.toDataURL());
    };

    // img.onerror = (error) => {
    //     console.log(error)
    // }
}