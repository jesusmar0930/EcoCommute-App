// Declare global variables for map components
let map;
let directionsService;
let directionsRenderer;

// Initialize the map and the directions services
function initMap() {
    // Initialize the map
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: 33.8722983, lng: -117.907814},
        zoom: 13
    });

    // Initialize the Directions Service and Renderer
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map);

    // Initialize autocomplete for input fields
    const startInput = document.getElementById('start');
    const endInput = document.getElementById('end');

    const autocompleteStart = new google.maps.places.Autocomplete(startInput);
    const autocompleteEnd = new google.maps.places.Autocomplete(endInput);

    // Set up event listeners for place changes
    autocompleteStart.addListener('place_changed', function() {
        const place = autocompleteStart.getPlace();
        if (!place.geometry) {
            console.error("Autocomplete's place has no geometry.");
            return;
        }
        console.log("Start Place selected: " + place.name);
    });

    autocompleteEnd.addListener('place_changed', function() {
        const place = autocompleteEnd.getPlace();
        if (!place.geometry) {
            console.error("Autocomplete's place has no geometry.");
            return;
        }
        console.log("End Place selected: " + place.name);
    });
}

function updateEmissions(emissions) {
    fetch('/update-emissions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `emissions=${emissions}`,
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('totalEmissions').textContent = data.total_emissions.toFixed(2);
    });
}

function calculateAndDisplayRoute() {
    const start = document.getElementById('start').value;
    const end = document.getElementById('end').value;
    const mode = document.getElementById('mode').value;

    directionsService.route({
        origin: start,
        destination: end,
        travelMode: google.maps.TravelMode[mode]
    }, function(response, status) {
        if (status === 'OK') {
            directionsRenderer.setDirections(response);
            displayInstructions(response);
            calculateEmissions(response, mode);
            if (mode === 'DRIVING') {
                compareEmissions(response);
            }
        } else {
            console.error('Directions request failed due to ' + status);
            window.alert('Directions request failed due to ' + status);
        }
    });
}

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('routeForm');
    form.addEventListener('submit', function(event) {
        event.preventDefault();  // This stops the form from submitting in the traditional way
        calculateAndDisplayRoute();
    });
});

// Display route instructions
function displayInstructions(response) {
    const instructions = document.getElementById('instructions');
    instructions.innerHTML = '<b>Route Instructions:</b><br>';
    response.routes[0].legs[0].steps.forEach((step, index) => {
        instructions.innerHTML += `${index + 1}. ${step.instructions} <br>`;
    });
}

// Calculate and display estimated carbon emissions
function calculateEmissions(response, mode) {
    const route = response.routes[0];
    let totalDistance = 0;
    route.legs.forEach(leg => totalDistance += leg.distance.value);
    totalDistance = totalDistance / 1000; // Convert to kilometers

    const emissionFactors = {
        DRIVING: 271,  // grams per km
        TRANSIT: 101,  // assume bus
        BICYCLING: 0,
        WALKING: 0
    };

    const emissions = totalDistance * (emissionFactors[mode] || 0);
    displayEmissions(emissions, mode);
    updateEmissions(emissions);
}

function compareEmissions(response) {
    const route = response.routes[0];
    let totalDistance = 0;
    route.legs.forEach(leg => totalDistance += leg.distance.value);
    totalDistance = totalDistance / 1000; // Convert to kilometers

    const emissionFactors = {
        DRIVING: 271,
        TRANSIT: 101,
        BICYCLING: 0,
        WALKING: 0
    };

    const drivingEmissions = totalDistance * emissionFactors['DRIVING'];
    const transitEmissions = totalDistance * emissionFactors['TRANSIT'];
    const savingsTransit = drivingEmissions - transitEmissions;

    const message = `By choosing transit over driving, you would reduce your carbon emissions by ${savingsTransit.toFixed(2)} grams of CO2 for this trip.`;
    displaySavings(message);
}

// Update UI with emission data
function displayEmissions(emissions, mode) {
    const emissionsContainer = document.getElementById('emissions');
    emissionsContainer.innerHTML = `Estimated Carbon Emissions for ${mode}: ${emissions.toFixed(2)} grams of CO2.`;
}

function displaySavings(message) {
    const savingsContainer = document.getElementById('savings');
    savingsContainer.innerHTML = message;
}