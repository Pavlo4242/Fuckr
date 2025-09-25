import axios from 'axios';
import { getLocalStorage, setLocalStorage, removeLocalStorage } from './storageService';

// Helper to generate UUIDs
const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
}).toUpperCase();

const initializeDeviceIdentifier = () => {
    let deviceId = getLocalStorage('deviceIdentifier');
    if (!deviceId) {
        deviceId = uuid();
        setLocalStorage('deviceIdentifier', deviceId);
    }
    return deviceId;
};

// NOTE: This logic is specific to Chrome extensions and won't work in a standard web app.
// It's included for completeness but would need to be replaced with a standard OAuth flow.
const setupChromeWebRequestListeners = (onSuccess: (response: any) => void) => {
    if (typeof chrome !== 'undefined' && chrome.webRequest) {
        const onSuccessfulLogin = (details: any) => {
            const locationHeader = details.responseHeaders.find((h: any) => h.name.toLowerCase() === 'location');
            if (locationHeader) {
                const url = new URL(locationHeader.value);
                const authToken = url.searchParams.get('authenticationToken');
                const profileId = url.searchParams.get('profileId');
                if (authToken && profileId) {
                    setLocalStorage('authenticationToken', authToken);
                    setLocalStorage('profileId', parseInt(profileId, 10));
                    onSuccess(details);
                }
            }
            return { cancel: true };
        };

        chrome.webRequest.onHeadersReceived.addListener(
            onSuccessfulLogin,
            { urls: ['https://account.grindr.com/sessions?locale=en', 'https://account.grindr.com/users?locale=en'] },
            ['responseHeaders', 'blocking']
        );

        chrome.webRequest.onAuthRequired.addListener(
            authService.logoutAndRestart,
            { urls: ["<all_urls>"] }
        );
    }
};

export const authService = {
    // This function attempts to create a new session using an existing token.
    createSession: async (): Promise<{ xmppToken: string }> => {
        const authToken = getLocalStorage('authenticationToken');
        const profileId = getLocalStorage('profileId');

        if (!authToken || !profileId) {
            throw new Error('No authentication token or profile ID found.');
        }

        try {
            const response = await axios.post('https://primus.grindr.com/2.0/session', {
                appName: "Grindr",
                appVersion: "2.2.3",
                authenticationToken: authToken,
                deviceIdentifier: initializeDeviceIdentifier(),
                platformName: "Android",
                platformVersion: "19",
                profileId: profileId,
            });

            const sessionId = response.headers['session-id'];
            axios.defaults.headers.common['Session-Id'] = sessionId;
            // Note: Setting cookies directly like this from client-side JS is not standard.
            // This is usually handled by the browser automatically if the server sends a Set-Cookie header.
            axios.defaults.headers.common['Cookies'] = `Session-Id=${sessionId}`;
            
            return { xmppToken: response.data.xmppToken };
        } catch (error) {
            setLocalStorage('authenticationToken', null); // Clear invalid token
            throw new Error('Failed to create session. Token might be invalid or expired.');
        }
    },

    // This would be part of the initial login UI component.
    setupLoginListener: (navigate: (path: string) => void) => {
        setupChromeWebRequestListeners(async () => {
            try {
                await authService.createSession();
                navigate('/profiles');
            } catch {
                alert('Your account is probably banned.');
            }
        });
    },

    logoutAndRestart: () => {
        removeLocalStorage('authenticationToken');
        window.location.reload();
    },

    isAuthenticated: (): boolean => !!getLocalStorage('authenticationToken'),
};
