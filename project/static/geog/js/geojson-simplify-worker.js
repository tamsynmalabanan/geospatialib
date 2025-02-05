self.onmessage = async function (e) {
    const { geojson, maxDistance } = e.data;

    turf.clustersDbscan(geojson, maxDistance, {
        mutate: true,
        minPoints: 2
    });

    const features = geojson.features.filter(feature => feature.properties.dbscan === 'noise');
    turf.clusterEach(geojson, 'cluster', (cluster, clusterValue, currentIndex) => {
        features.push(turf.centroid(cluster, {
            properties: {
                cluster: clusterValue,
                count: cluster.features.length
            }
        }));
    });

    geojson.features = features;
    geojson.prefix = 'Aggregate';

    self.postMessage(geojson);
};