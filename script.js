// Global variables
let map;
let geothermalLayer;
let originalData = null;
let currentData = null;
let osmLayer, satelliteLayer;

// Initialize the map
function initMap() {
    // Create map centered on Kenya
    map = L.map('map').setView([0.0236, 37.9062], 7);

    // OSM Base Layer (default)
    osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

    // Google Satellite Layer
    satelliteLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google',
        maxZoom: 20
    });

    // Layer control for basemap switching
    const baseMaps = {
        "OpenStreetMap": osmLayer,
        "Satellite Imagery": satelliteLayer
    };

    L.control.layers(baseMaps).addTo(map);

    // Load GeoJSON data
    loadGeothermalData();
}

// Load GeoJSON data from file
async function loadGeothermalData() {
    try {
        const response = await fetch('Geothermal.geojson');
        
        if (!response.ok) {
            throw new Error('Failed to load geothermal data');
        }
        
        const geojsonData = await response.json();
        originalData = geojsonData;
        currentData = geojsonData;
        
        // Populate filter dropdowns with unique values
        populateFilters(geojsonData);
        
        // Display data on map
        displayGeothermalData(geojsonData);
        
        // Hide loading indicator
        document.getElementById('loading').classList.add('hidden');
        
    } catch (error) {
        console.error('Error loading geothermal data:', error);
        document.getElementById('loading').innerHTML = 
            'Error loading data. Please ensure Geothermal.geojson is in C:\\WebBased Map folder.';
    }
}

// Populate filter dropdowns with unique values from the dataset
function populateFilters(geojsonData) {
    const companies = new Set();
    const numbers = new Set();
    const years = new Set();

    // Extract unique values from all features
    geojsonData.features.forEach(feature => {
        const props = feature.properties;
        
        if (props.LIC_COM) companies.add(props.LIC_COM);
        if (props.LIC_NUMB) numbers.add(props.LIC_NUMB);
        if (props.LIC_YEAR) years.add(props.LIC_YEAR);
    });

    // Populate company dropdown
    const companySelect = document.getElementById('licCompany');
    Array.from(companies).sort().forEach(company => {
        const option = document.createElement('option');
        option.value = company;
        option.textContent = company;
        companySelect.appendChild(option);
    });

    // Populate licence number dropdown
    const numberSelect = document.getElementById('licNumber');
    Array.from(numbers).sort().forEach(number => {
        const option = document.createElement('option');
        option.value = number;
        option.textContent = number;
        numberSelect.appendChild(option);
    });

    // Populate year dropdown
    const yearSelect = document.getElementById('licYear');
    Array.from(years).sort().reverse().forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });
}

// Display geothermal data on map with styling and popups
function displayGeothermalData(geojsonData) {
    // Remove existing layer if present
    if (geothermalLayer) {
        map.removeLayer(geothermalLayer);
    }

    // Add new GeoJSON layer with custom styling
    geothermalLayer = L.geoJSON(geojsonData, {
        style: function(feature) {
            return {
                color: getFeatureColor(feature),
                weight: 2,
                opacity: 0.8,
                fillOpacity: 0.5
            };
        },
        pointToLayer: function(feature, latlng) {
            return L.circleMarker(latlng, {
                radius: 8,
                fillColor: getFeatureColor(feature),
                color: '#000',
                weight: 1,
                opacity: 1,
                fillOpacity: 0.7
            });
        },
        onEachFeature: function(feature, layer) {
            const props = feature.properties;
            
            // Create popup content with all filter fields
            const popupContent = `
                <div class="popup-title">${props.LIC_COM || 'Unknown Company'}</div>
                <div class="popup-field">
                    <span class="popup-label">Licence Number:</span>
                    <span class="popup-value">${props.LIC_NUMB || 'N/A'}</span>
                </div>
                <div class="popup-field">
                    <span class="popup-label">Licence Year:</span>
                    <span class="popup-value">${props.LIC_YEAR || 'N/A'}</span>
                </div>
                <div class="popup-field">
                    <span class="popup-label">Issue/Expiry Date:</span>
                    <span class="popup-value">${props.ISS_DATE || 'N/A'}</span>
                </div>
            `;
            
            layer.bindPopup(popupContent);
            
            // Add hover effect
            layer.on('mouseover', function() {
                this.setStyle({
                    weight: 4,
                    fillOpacity: 0.8
                });
            });
            
            layer.on('mouseout', function() {
                this.setStyle({
                    weight: 2,
                    fillOpacity: 0.5
                });
            });
        }
    }).addTo(map);

    // Fit map to data bounds with padding
    if (geojsonData.features.length > 0) {
        map.fitBounds(geothermalLayer.getBounds(), { padding: [50, 50] });
    }
}

// Get feature color based on licence year
function getFeatureColor(feature) {
    const year = feature.properties.LIC_YEAR;
    
    // Return gray if no year data
    if (!year) return '#95a5a6';
    
    const currentYear = new Date().getFullYear();
    
    // Color coding based on licence age
    if (year >= currentYear - 2) {
        return '#e74c3c'; // Recent licenses (last 2 years) - Red
    } else if (year >= currentYear - 5) {
        return '#3498db'; // Medium age (3-5 years) - Blue
    } else {
        return '#2ecc71'; // Older licenses (5+ years) - Green
    }
}

// Apply filters to the dataset
function applyFilters() {
    const company = document.getElementById('licCompany').value;
    const number = document.getElementById('licNumber').value;
    const year = document.getElementById('licYear').value;
    const date = document.getElementById('issDate').value;

    // Filter the original data based on selected criteria
    let filteredData = {
        type: "FeatureCollection",
        features: originalData.features.filter(feature => {
            const props = feature.properties;
            
            // Check each filter criterion
            if (company && props.LIC_COM !== company) return false;
            if (number && props.LIC_NUMB !== number) return false;
            if (year && props.LIC_YEAR !== parseInt(year)) return false;
            if (date && props.ISS_DATE !== date) return false;
            
            return true;
        })
    };

    // Update current data and redisplay
    currentData = filteredData;
    displayGeothermalData(filteredData);
    
    // Show message if no results
    if (filteredData.features.length === 0) {
        alert('No licenses match the selected filters. Please adjust your criteria.');
    }
}

// Clear all filters and reset to original data
function clearFilters() {
    // Reset all filter inputs
    document.getElementById('licCompany').value = '';
    document.getElementById('licNumber').value = '';
    document.getElementById('licYear').value = '';
    document.getElementById('issDate').value = '';
    
    // Reset to original data
    currentData = originalData;
    displayGeothermalData(originalData);
}

// Toggle legend visibility
function toggleLegend() {
    const legend = document.getElementById('legend');
    legend.classList.toggle('hidden');
}

// Initialize map when page loads
window.onload = initMap;