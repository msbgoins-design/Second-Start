import React, { useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Circle } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '250px',
  borderRadius: '1rem'
};

export const SafePathMap: React.FC = () => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  });

  // Default to a central location until the browser loads the real one
  const [currentLoc, setCurrentLoc] = useState({ lat: 39.9612, lng: -82.9988 });
  const [locationError, setLocationError] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      // watchPosition tracks the user as they move
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setCurrentLoc({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationError(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocationError(true);
        },
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  if (!isLoaded) return <div className="h-[250px] animate-pulse bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>;

  return (
    <div className="bg-white dark:bg-brand-cardDark border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Safe Path & Transit</h3>
        {locationError && (
          <span className="text-xs text-red-500 font-medium">Location access denied</span>
        )}
      </div>
      
      <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={currentLoc}
          zoom={14}
          options={{
            disableDefaultUI: true,
            styles: [ /* Optional: Add custom dark mode map JSON styles here */ ]
          }}
        >
          {/* User's Current Location Marker */}
          <Marker position={currentLoc} />
          
          {/* Simulated Safe Zone Alert Radius */}
          <Circle
            center={currentLoc}
            radius={800} // 800 meters
            options={{
              fillColor: '#34D399',
              fillOpacity: 0.15,
              strokeColor: '#10B981',
              strokeOpacity: 0.8,
              strokeWeight: 2,
            }}
          />
        </GoogleMap>
        
        {/* Overlay Alert Badge (Like your Stitch design) */}
        <div className="absolute top-3 left-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-red-100 dark:border-red-900/30 shadow-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
            Curfew Alert: Return by 9 PM
          </p>
        </div>
      </div>
    </div>
  );
};