import axios from 'axios';
import { EventEmitter } from 'events';

// In-memory state for profile cache and blocked list
let profileCache: { [key: number]: any } = {};
let blocked: number[] = [];

// Event emitter to notify when authentication is complete
export const authEvents = new EventEmitter();

// Listen for the 'authenticated' event to fetch the initial block list
authEvents.on('authenticated', async () => {
    try {
        const response = await axios.get('https://primus.grindr.com/2.0/blocks');
        const { blockedBy, blocking } = response.data;
        // Find the intersection of users who have blocked you and you have blocked
        blocked = blockedBy.filter((id: number) => blocking.includes(id));
    } catch (error) {
        console.error("Failed to fetch block list:", error);
    }
});

export const profilesService = {
    nearby: async (params: any): Promise<any[]> => {
        const response = await axios.post('https://primus.grindr.com/2.0/nearbyProfiles', params);
        const profiles = response.data.profiles.filter((profile: any) => !blocked.includes(profile.profileId));
        
        // Update cache with new profiles
        profiles.forEach((profile: any) => {
            if (!profileCache[profile.profileId]) {
                profileCache[profile.profileId] = profile;
            }
        });

        return profiles;
    },

    get: async (id: number): Promise<any> => {
        if (profileCache[id]) {
            return Promise.resolve(profileCache[id]);
        }
        
        const response = await axios.post('https://primus.grindr.com/2.0/getProfiles', { targetProfileIds: [id] });
        const profile = response.data[0];
        if (profile) {
            profileCache[id] = profile; // Cache the fetched profile
        }
        return profile;
    },

    blockedBy: (id: number): void => {
        if (!blocked.includes(id)) {
            blocked.push(id);
        }
        delete profileCache[id];
    },

    block: async (id: number): Promise<void> => {
        profilesService.blockedBy(id); // Optimistically update UI
        await axios.post('https://primus.grindr.com/2.0/blockProfiles', { targetProfileIds: [id] });
    },

    isBlocked: (id: number): boolean => blocked.includes(id),
};
