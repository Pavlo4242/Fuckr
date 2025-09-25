import axios from 'axios';
import { authEvents } from './profilesService'; // Assuming authEvents is exported from here
import { getLocalStorage } from './storageService';

let intervalId: NodeJS.Timeout | null = null;

const updateLocation = () => {
    const { lat, lon } = getLocalStorage('grindrParams');
    const profileId = getLocalStorage('profileId');
    if (lat && lon && profileId) {
        axios.put('https://primus.grindr.com/2.0/location', { lat, lon, profileId });
    }
};

export const updateLocationService = {
    start: () => {
        // Stop any existing interval to prevent duplicates
        if (intervalId) {
            clearInterval(intervalId);
        }
        // Start the interval
        intervalId = setInterval(updateLocation, 90000);
    },
    stop: () => {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }
};

// Start updating location once the user is authenticated
authEvents.on('authenticated', () => {
    updateLocationService.start();
});
