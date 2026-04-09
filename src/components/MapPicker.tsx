import React, { useState, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Autocomplete } from '@react-google-maps/api';
import { Button } from '@/components/ui/button';
import { MapPin, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

const containerStyle = {
  width: '100%',
  height: '400px'
};

// Phu Quoc center
const center = {
  lat: 10.2191,
  lng: 103.9651
};

type Library = "places" | "drawing" | "geometry" | "visualization";
const libraries: Library[] = ["places"];

interface MapPickerProps {
  onConfirm: (address: string) => void;
  initialAddress?: string;
}

export function MapPicker({ onConfirm, initialAddress }: MapPickerProps) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: libraries as any
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markerPos, setMarkerPos] = useState<google.maps.LatLngLiteral>(center);
  const [address, setAddress] = useState(initialAddress || '');
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const onLoad = useCallback(function callback(map: google.maps.Map) {
    setMap(map);
  }, []);

  const onUnmount = useCallback(function callback() {
    setMap(null);
  }, []);

  const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setMarkerPos(pos);
      
      // Reverse geocoding
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: pos }, (results, status) => {
        if (status === "OK" && results?.[0]) {
          setAddress(results[0].formatted_address);
        }
      });
    }
  }, []);

  const onAutocompleteLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        const pos = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };
        setMarkerPos(pos);
        setAddress(place.formatted_address || '');
        map?.panTo(pos);
        map?.setZoom(16);
      }
    }
  };

  if (!isLoaded) {
    return (
      <div className="h-[400px] w-full flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 bg-white border-b flex gap-2">
        <Autocomplete
          onLoad={onAutocompleteLoad}
          onPlaceChanged={onPlaceChanged}
          className="flex-grow"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              ref={searchInputRef}
              placeholder="Search for a hotel or location..." 
              className="pl-10"
              defaultValue={address}
            />
          </div>
        </Autocomplete>
      </div>

      <div className="relative flex-grow">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={markerPos}
          zoom={13}
          onLoad={onLoad}
          onUnmount={onUnmount}
          onClick={onMapClick}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false
          }}
        >
          <Marker position={markerPos} />
        </GoogleMap>

        <div className="absolute bottom-4 left-4 right-4 bg-white p-4 rounded-xl shadow-2xl flex items-center gap-4 border border-primary/10">
          <div className="bg-primary/10 p-2 rounded-lg shrink-0">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-grow min-w-0">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Selected Address</p>
            <p className="text-sm font-medium truncate">{address || 'Click on map or search...'}</p>
          </div>
          <Button 
            size="sm" 
            disabled={!address}
            onClick={() => onConfirm(address)}
          >
            Confirm
          </Button>
        </div>
      </div>
      
      {!(import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY && (
        <div className="p-2 bg-orange-50 text-[10px] text-orange-700 text-center border-t border-orange-100">
          ⚠️ Google Maps API Key missing. Please add it in Settings.
        </div>
      )}
    </div>
  );
}
