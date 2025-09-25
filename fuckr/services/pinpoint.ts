import { create, all } from 'mathjs';
import { profilesService } from './profilesService'; // Assuming profiles service is in this file
import { getStoredGrindrParams } from './storageService'; // A helper for local storage

const math = create(all);

interface Location {
  lat: number;
  lon: number;
}

interface Beacon extends Location {
  dist: number;
}

// Based on http://gis.stackexchange.com/a/415/41129
const trilaterate = (beacons: Beacon[]): Location => {
    const earthR = 6371;
    const rad = (deg: number) => deg * Math.PI / 180;
    const deg = (rad: number) => rad * 180 / Math.PI;

    const [p1, p2, p3] = beacons.map(beacon => [
        earthR * Math.cos(rad(beacon.lat)) * Math.cos(rad(beacon.lon)),
        earthR * Math.cos(rad(beacon.lat)) * Math.sin(rad(beacon.lon)),
        earthR * Math.sin(rad(beacon.lat))
    ]);

    const ex = math.divide(math.subtract(p2, p1), math.norm(math.subtract(p2, p1)));
    const i = math.dot(ex, math.subtract(p3, p1));
    const ey = math.divide(math.subtract(math.subtract(p3, p1), math.multiply(i, ex)), math.norm(math.subtract(math.subtract(p3, p1), math.multiply(i, ex))));
    const ez = math.cross(ex, ey);
    const d = math.norm(math.subtract(p2, p1));
    const j = math.dot(ey, math.subtract(p3, p1));

    const x = (beacons[0].dist**2 - beacons[1].dist**2 + d**2) / (2 * d);
    const y = (beacons[0].dist**2 - beacons[2].dist**2 + i**2 + j**2) / (2 * j) - (i / j * x);
    const z = Math.sqrt(Math.abs(beacons[0].dist**2 - x**2 - y**2));

    const triPt = math.add(p1, math.multiply(x, ex), math.multiply(y, ey), math.multiply(z, ez)) as number[];

    return {
        lat: deg(Math.asin(triPt[2] / earthR)),
        lon: deg(Math.atan2(triPt[1], triPt[0]))
    };
};

const randomizedLocation = (): Location => {
    const grindrParams = getStoredGrindrParams(); // Helper to get params from localStorage
    return {
        lat: grindrParams.lat + ((Math.random() - 0.5) / 100), // +/- ~500m
        lon: grindrParams.lon + ((Math.random() - 0.5) / 100), // +/- ~500m
    };
};

export const pinpointService = async (id: number): Promise<Location> => {
    const beacons: Location[] = [randomizedLocation(), randomizedLocation(), randomizedLocation()];
    
    const promises = beacons.map(location => {
        const params = { ...getStoredGrindrParams(), ...location };
        return profilesService.nearby(params);
    });

    const results = await Promise.all(promises);

    const beaconsWithDist: Beacon[] = beacons.map((beacon, i) => {
        const profile = results[i].find(p => p.profileId === id);
        if (!profile) {
            throw new Error(`Profile with ID ${id} not found in beacon result ${i + 1}`);
        }
        return { ...beacon, dist: profile.distance };
    });

    return trilaterate(beaconsWithDist);
};
