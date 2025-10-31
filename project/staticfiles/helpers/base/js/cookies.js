const setCookie = (name, value, days) => {
    let prefix = document.cookie = name + "=" + value
    
    if (days) {
        const date = new Date()
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000))
        const expires = "expires=" + date.toUTCString()
        prefix = prefix + ";" + expires
    }
    
    document.cookie = prefix + ";path=/" 
}

const getCookie = (name) => {
    const nameEQ = name + "=";
    const cookiesArray = document.cookie.split(';');
    
    for (let i = 0; i < cookiesArray.length; i++) {
        let cookie = cookiesArray[i];
        
        while (cookie.charAt(0) === ' ') {
            cookie = cookie.substring(1, cookie.length);
        }
        
        if (cookie.indexOf(nameEQ) === 0) {
            return cookie.substring(nameEQ.length, cookie.length);
        }
    }
    
    return null;
}
