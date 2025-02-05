self.onmessage = (message) => {
    console.log(message)
    if (message.data.type === 'geojson-update') {
        console.log(message.data.data);
    }
};