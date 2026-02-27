package com.geoengage.indooratlas;

import android.os.Bundle;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.UiThreadUtil;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import com.indooratlas.android.sdk.IALocation;
import com.indooratlas.android.sdk.IALocationListener;
import com.indooratlas.android.sdk.IALocationManager;
import com.indooratlas.android.sdk.IALocationRequest;
import com.indooratlas.android.sdk.IARegion;

public class IndoorAtlasModule extends ReactContextBaseJavaModule {
    
    private static final String MODULE_NAME = "IndoorAtlas";
    private static final String TAG = "IndoorAtlasModule";
    
    private final ReactApplicationContext reactContext;
    private IALocationManager locationManager;
    private boolean isPositioning = false;
    
    // Event names
    private static final String EVENT_LOCATION_CHANGED = "onLocationChanged";
    private static final String EVENT_GEOFENCE_ENTER = "onGeofenceEnter";
    private static final String EVENT_GEOFENCE_EXIT = "onGeofenceExit";
    private static final String EVENT_STATUS_CHANGED = "onStatusChanged";
    
    public IndoorAtlasModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }
    
    @NonNull
    @Override
    public String getName() {
        return MODULE_NAME;
    }
    
    /**
     * Initialize Indoor Atlas SDK with API credentials
     */
    @ReactMethod
    public void initialize(String apiKey, String apiSecret, Promise promise) {
        UiThreadUtil.runOnUiThread(() -> {
            try {
                Log.d(TAG, "Initializing Indoor Atlas SDK...");
                
                // Create Bundle with API credentials
                Bundle credentials = new Bundle();
                credentials.putString(IALocationManager.EXTRA_API_KEY, apiKey);
                credentials.putString(IALocationManager.EXTRA_API_SECRET, apiSecret);
                
                // Create location manager with credentials
                locationManager = IALocationManager.create(reactContext, credentials);
                
                // Register region listener for geofencing
                locationManager.registerRegionListener(regionListener);
                
                Log.d(TAG, "Indoor Atlas SDK initialized successfully");
                promise.resolve(true);
                
            } catch (Exception e) {
                Log.e(TAG, "Failed to initialize Indoor Atlas SDK: " + e.getMessage());
                promise.reject("INIT_ERROR", "Failed to initialize Indoor Atlas: " + e.getMessage(), e);
            }
        });
    }
    
    /**
     * Start positioning (location updates)
     */
    @ReactMethod
    public void startPositioning(Promise promise) {
        UiThreadUtil.runOnUiThread(() -> {
            try {
                if (locationManager == null) {
                    promise.reject("NOT_INITIALIZED", "Indoor Atlas SDK not initialized. Call initialize() first.");
                    return;
                }
                
                if (isPositioning) {
                    Log.w(TAG, "Positioning already started");
                    promise.resolve(false);
                    return;
                }
                
                // Request location updates with high accuracy
                IALocationRequest request = IALocationRequest.create();
                request.setFastestInterval(1000); // 1 second
                request.setSmallestDisplacement(0.5f); // 0.5 meters
                
                boolean success = locationManager.requestLocationUpdates(request, locationListener);
                
                if (!success) {
                    Log.w(TAG, "Failed to request location updates");
                }
                
                isPositioning = true;
                
                Log.d(TAG, "Positioning started");
                promise.resolve(true);
                
            } catch (Exception e) {
                Log.e(TAG, "Failed to start positioning: " + e.getMessage());
                promise.reject("START_ERROR", "Failed to start positioning: " + e.getMessage(), e);
            }
        });
    }
    
    /**
     * Stop positioning (location updates)
     */
    @ReactMethod
    public void stopPositioning(Promise promise) {
        UiThreadUtil.runOnUiThread(() -> {
            try {
                if (locationManager == null) {
                    promise.reject("NOT_INITIALIZED", "Indoor Atlas SDK not initialized.");
                    return;
                }
                
                if (!isPositioning) {
                    Log.w(TAG, "Positioning not started");
                    promise.resolve(false);
                    return;
                }
                
                boolean success = locationManager.removeLocationUpdates(locationListener);
                
                if (!success) {
                    Log.w(TAG, "Failed to remove location updates");
                }
                
                isPositioning = false;
                
                Log.d(TAG, "Positioning stopped");
                promise.resolve(true);
                
            } catch (Exception e) {
                Log.e(TAG, "Failed to stop positioning: " + e.getMessage());
                promise.reject("STOP_ERROR", "Failed to stop positioning: " + e.getMessage(), e);
            }
        });
    }
    
    /**
     * Get current location (one-time request)
     */
    @ReactMethod
    public void getCurrentLocation(Promise promise) {
        UiThreadUtil.runOnUiThread(() -> {
            try {
                if (locationManager == null) {
                    promise.reject("NOT_INITIALIZED", "Indoor Atlas SDK not initialized.");
                    return;
                }
                
                // Request immediate location update
                locationManager.requestLocationUpdates(
                    IALocationRequest.create(),
                    new IALocationListener() {
                        @Override
                        public void onLocationChanged(IALocation location) {
                            WritableMap locationData = createLocationMap(location);
                            promise.resolve(locationData);
                            locationManager.removeLocationUpdates(this);
                        }
                        
                        @Override
                        public void onStatusChanged(String provider, int status, Bundle extras) {
                            // Handle status changes if needed
                            Log.d(TAG, "Location status changed: " + provider + " status=" + status);
                        }
                    }
                );
            
            } catch (Exception e) {
                    Log.e(TAG, "Failed to get current location: " + e.getMessage());
                    promise.reject("LOCATION_ERROR", "Failed to get location: " + e.getMessage(), e);
            }
        });
    }
    
    /**
     * Location listener - receives position updates
     */
    private final IALocationListener locationListener = new IALocationListener() {
        @Override
        public void onLocationChanged(IALocation location) {
            WritableMap locationData = createLocationMap(location);
            sendEvent(EVENT_LOCATION_CHANGED, locationData);
        }
        
        @Override
        public void onStatusChanged(String provider, int status, Bundle extras) {
            // Send status change event to JavaScript
            WritableMap statusData = Arguments.createMap();
            statusData.putString("provider", provider);
            statusData.putInt("status", status);
            statusData.putString("statusText", getStatusText(status));
            sendEvent(EVENT_STATUS_CHANGED, statusData);
            
            Log.d(TAG, "Status changed: " + provider + " = " + getStatusText(status));
        }
    };
    
    /**
     * Region listener - receives geofence enter/exit events
     */
    private final IARegion.Listener regionListener = new IARegion.Listener() {
        @Override
        public void onEnterRegion(IARegion region) {
            Log.d(TAG, "Entered region: " + region.getName() + " (ID: " + region.getId() + ")");
            
            WritableMap regionData = Arguments.createMap();
            regionData.putString("id", region.getId());
            regionData.putString("name", region.getName());
            regionData.putInt("type", region.getType());
            regionData.putDouble("timestamp", System.currentTimeMillis());
            
            sendEvent(EVENT_GEOFENCE_ENTER, regionData);
        }
        
        @Override
        public void onExitRegion(IARegion region) {
            Log.d(TAG, "Exited region: " + region.getName() + " (ID: " + region.getId() + ")");
            
            WritableMap regionData = Arguments.createMap();
            regionData.putString("id", region.getId());
            regionData.putString("name", region.getName());
            regionData.putInt("type", region.getType());
            regionData.putDouble("timestamp", System.currentTimeMillis());
            
            sendEvent(EVENT_GEOFENCE_EXIT, regionData);
        }
    };
    
    /**
     * Helper: Convert status code to readable text
     */
    private String getStatusText(int status) {
        switch (status) {
            case IALocationManager.STATUS_AVAILABLE:
                return "AVAILABLE";
            case IALocationManager.STATUS_LIMITED:
                return "LIMITED";
            case IALocationManager.STATUS_OUT_OF_SERVICE:
                return "OUT_OF_SERVICE";
            case IALocationManager.STATUS_TEMPORARILY_UNAVAILABLE:
                return "TEMPORARILY_UNAVAILABLE";
            default:
                return "UNKNOWN";
        }
    }
    
    /**
     * Helper: Create location data map
     */
    private WritableMap createLocationMap(IALocation location) {
        WritableMap map = Arguments.createMap();
        map.putDouble("latitude", location.getLatitude());
        map.putDouble("longitude", location.getLongitude());
        map.putDouble("accuracy", location.getAccuracy());
        map.putDouble("bearing", location.getBearing());
        map.putInt("floorLevel", location.getFloorLevel());
        map.putDouble("timestamp", location.getTime());
        
        // Add floor certainty if available
        if (location.hasFloorCertainty()) {
            map.putDouble("floorCertainty", location.getFloorCertainty());
        }
        
        return map;
    }
    
    /**
     * Helper: Send event to JavaScript
     */
    private void sendEvent(String eventName, @Nullable WritableMap params) {
        if (reactContext.hasActiveReactInstance()) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
        }
    }
    
    /**
     * Cleanup when module is destroyed
     */
    @Override
    public void onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy();
        
        if (locationManager != null) {
            locationManager.removeLocationUpdates(locationListener);
            locationManager.unregisterRegionListener(regionListener);
            locationManager.destroy();
            locationManager = null;
        }
        
        isPositioning = false;
        Log.d(TAG, "Indoor Atlas Module destroyed");
    }
}
