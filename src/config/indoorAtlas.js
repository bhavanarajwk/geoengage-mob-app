import { INDOORATLAS_API_KEY, INDOORATLAS_API_SECRET } from '@env';

/**
 * Indoor Atlas Configuration
 * API credentials loaded from .env file
 */
export const INDOOR_ATLAS_CONFIG = {
  apiKey: INDOORATLAS_API_KEY,
  apiSecret: INDOORATLAS_API_SECRET,
};

/**
 * Indoor Atlas Settings
 */
export const INDOOR_ATLAS_SETTINGS = {
  // Location update interval (milliseconds)
  updateInterval: 1000, // 1 second
  
  // Minimum displacement for updates (meters)
  minDisplacement: 0.5,
  
  // Enable automatic floor detection
  autoFloorDetection: true,
};

/**
 * Validate that API credentials are configured
 */
export const validateConfig = () => {
  if (!INDOOR_ATLAS_CONFIG.apiKey || !INDOOR_ATLAS_CONFIG.apiSecret) {
    throw new Error(
      'Indoor Atlas API credentials not found. Please check your .env file.'
    );
  }
  
  if (INDOOR_ATLAS_CONFIG.apiKey === 'your_api_key_here') {
    throw new Error(
      'Please update .env file with your actual Indoor Atlas credentials.'
    );
  }
};
