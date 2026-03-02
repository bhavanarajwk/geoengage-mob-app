/**
 * Coordinate Converter Utility
 * Converts latitude/longitude from Indoor Atlas to screen X/Y coordinates
 */

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Store the first location as reference point
let referenceLocation = null;
let referencePosition = {
    x: SCREEN_WIDTH / 2,
    y: SCREEN_HEIGHT / 2
};

/**
 * Convert Indoor Atlas lat/lng coordinates to screen X/Y positions
 * Uses relative positioning from the first location received
 * 
 * @param {number} latitude - From Indoor Atlas location
 * @param {number} longitude - From Indoor Atlas location
 * @param {Object} calibration - Optional calibration data from your venue
 * @returns {{ x: number, y: number }} - Screen coordinates
 */
export function latLngToScreen(latitude, longitude, calibration = null) {
    // If calibration data is provided, use it
    if (calibration) {
        const { minLat, maxLat, minLng, maxLng, floorWidth, floorHeight } = calibration;

        // Normalize lat/lng to 0-1 range
        const normalizedLat = (latitude - minLat) / (maxLat - minLat);
        const normalizedLng = (longitude - minLng) / (maxLng - minLng);

        // Map to screen coordinates
        // Note: latitude typically maps to Y (inverted), longitude to X
        const x = normalizedLng * SCREEN_WIDTH;
        const y = (1 - normalizedLat) * SCREEN_HEIGHT; // Invert Y axis

        return { x, y };
    }

    // Set reference location on first call
    if (!referenceLocation) {
        referenceLocation = { latitude, longitude };

        return referencePosition;
    }

    // Calculate offset from reference in meters
    // 1 degree latitude ≈ 111,320 meters
    // 1 degree longitude ≈ 111,320 * cos(latitude) meters
    const latDiff = latitude - referenceLocation.latitude;
    const lngDiff = longitude - referenceLocation.longitude;

    const latMeters = latDiff * 111320; // meters north/south
    const lngMeters = lngDiff * 111320 * Math.cos(latitude * Math.PI / 180); // meters east/west

    // Scale factor: how many pixels per meter (adjust this for your floor plan)
    // For a typical office floor plan, let's use 10 pixels per meter
    const pixelsPerMeter = 10;

    // Calculate screen position
    // Longitude (east/west) maps to X, Latitude (north/south) maps to Y (inverted)
    let x = referencePosition.x + (lngMeters * pixelsPerMeter);
    let y = referencePosition.y - (latMeters * pixelsPerMeter); // Invert Y axis

    // Keep position within screen bounds with padding
    const padding = 50;
    x = Math.max(padding, Math.min(SCREEN_WIDTH - padding, x));
    y = Math.max(padding, Math.min(SCREEN_HEIGHT - padding, y));

    // Position updates are too frequent to log

    return { x, y };
}

/**
 * Reset the reference location (call this to recenter)
 */
export function resetReference() {
    referenceLocation = null;

}

/**
 * Calculate calibration data for your venue
 * Walk to the corners of your floor plan and note the lat/lng values
 * 
 * @param {Object} corners - Corner coordinates from Indoor Atlas
 * @returns {Object} - Calibration data
 */
export function createCalibration(corners) {
    const { topLeft, topRight, bottomLeft, bottomRight } = corners;

    const minLat = Math.min(bottomLeft.latitude, bottomRight.latitude);
    const maxLat = Math.max(topLeft.latitude, topRight.latitude);
    const minLng = Math.min(topLeft.longitude, bottomLeft.longitude);
    const maxLng = Math.max(topRight.longitude, bottomRight.longitude);

    return {
        minLat,
        maxLat,
        minLng,
        maxLng,
        floorWidth: SCREEN_WIDTH,
        floorHeight: SCREEN_HEIGHT
    };
}

/**
 * Simple distance calculation between two lat/lng points (in meters)
 * Uses Haversine formula for accuracy
 */
export function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
}
