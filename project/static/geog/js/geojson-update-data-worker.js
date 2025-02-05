onmessage = (message) => {
    console.log(message)
    postMessage('response')
};