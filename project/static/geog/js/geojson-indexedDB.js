const requestGeoJSONDB = () => indexedDB.open('geojsonDB', 1)

requestGeoJSONDB().onupgradeneeded = (event) => {
  const db = event.target.result;
  if (!db.objectStoreNames.contains('geojsons')) {
    db.createObjectStore('geojsons', {keyPath:'id'});
  }
}

const saveGeoJSON = (id, geojson) => {
    const geojsonDB = requestGeoJSONDB()
  
    geojsonDB.onsuccess = function(event) {
      const db = event.target.result;
        const transaction = db.transaction(['geojsons'], 'readwrite');
        const objectStore = transaction.objectStore('geojsons');
        objectStore.put({ id, geojson });
    
        transaction.oncomplete = function() {
            console.log('GeoJSON saved successfully!');
        };
    
        transaction.onerror = function(event) {
            console.error('Transaction error:', event.target.errorCode);
        };
    };
  
    geojsonDB.onerror = function(event) {
        console.error('Database error:', event.target.errorCode);
    };
}

function getGeoJSON(id) {
    const geojsonDB = requestGeoJSONDB()
  
    geojsonDB.onsuccess = function(event) {
        const db = event.target.result;
        const transaction = db.transaction(['geojsons'], 'readonly');
        const objectStore = transaction.objectStore('geojsons');
        const geojsonRequest = objectStore.get(id);
    
        geojsonRequest.onsuccess = function(event) {
            const result = event.target.result;
            if (result) {
                console.log('GeoJSON retrieved successfully:', result.geojson);
            } else {
                console.log('No GeoJSON found with ID:', id);
            }
        };
    
        geojsonRequest.onerror = function(event) {
                console.error('GeoJSON retrieval error:', event.target.errorCode);
        };
    };
  
    geojsonDB.onerror = function(event) {
        console.error('Database error:', event.target.errorCode);
    };
}

function deleteGeoJSON(id) {
    const geojsonDB = requestGeoJSONDB()
    
    geojsonDB.onsuccess = function(event) {
        const db = event.target.result;
        const transaction = db.transaction(['geojsons'], 'readwrite');
        const objectStore = transaction.objectStore('geojsons');
        const deleteRequest = objectStore.delete(id);
    
        deleteRequest.onsuccess = function() {
            console.log('GeoJSON deleted successfully!');
        };
    
        deleteRequest.onerror = function(event) {
            console.error('GeoJSON deletion error:', event.target.errorCode);
        };
    };
  
    geojsonDB.onerror = function(event) {
        console.error('Database error:', event.target.errorCode);
    };
}
  