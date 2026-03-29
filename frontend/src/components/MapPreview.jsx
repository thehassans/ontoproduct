import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import api from "../../utils/api";

export default function MapPreview({
  lat,
  lng,
  address = "",
  onLocationSelect, // function(lat, lng, address)
  readOnly = false,
  height = "300px",
  className = "",
  zoom = 13
}) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerInstance = useRef(null);
  const [internalLat, setInternalLat] = useState(lat || 24.7136); // Default Riyadh
  const [internalLng, setInternalLng] = useState(lng || 46.6753);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  // Sync props to internal state if they change externally
  useEffect(() => {
    if (lat && lng) {
      setInternalLat(lat);
      setInternalLng(lng);
    }
  }, [lat, lng]);

  useEffect(() => {
    // Only initialize map once, if window.L is available (Leaflet loaded via CDN)
    if (!mapRef.current || !window.L || mapInstance.current) return;

    // Initialize Map
    mapInstance.current = window.L.map(mapRef.current).setView([internalLat, internalLng], zoom);

    // Add Tile Layer (OpenStreetMap)
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(mapInstance.current);

    // Add Marker
    markerInstance.current = window.L.marker([internalLat, internalLng], {
      draggable: !readOnly,
    }).addTo(mapInstance.current);

    // Handle marker drag
    markerInstance.current.on("dragend", async (e) => {
      if (readOnly) return;
      const position = markerInstance.current.getLatLng();
      const newLat = position.lat;
      const newLng = position.lng;
      setInternalLat(newLat);
      setInternalLng(newLng);
      await handleLocationUpdate(newLat, newLng);
    });

    // Handle map click
    mapInstance.current.on("click", async (e) => {
      if (readOnly) return;
      const newLat = e.latlng.lat;
      const newLng = e.latlng.lng;
      markerInstance.current.setLatLng([newLat, newLng]);
      setInternalLat(newLat);
      setInternalLng(newLng);
      await handleLocationUpdate(newLat, newLng);
    });

  }, []); // Empty dependency array, initialize ONCE

  // Watch for external lat/lng changes and animate map there
  useEffect(() => {
    if (mapInstance.current && markerInstance.current && lat && lng) {
      const currentCenter = mapInstance.current.getCenter();
      // Only pan if it's significantly different to avoid stuttering during drags
      if (Math.abs(currentCenter.lat - parseFloat(lat)) > 0.0001 || Math.abs(currentCenter.lng - parseFloat(lng)) > 0.0001) {
        mapInstance.current.setView([lat, lng], zoom);
        markerInstance.current.setLatLng([lat, lng]);
      }
    }
  }, [lat, lng, zoom]);

  const handleLocationUpdate = async (newLat, newLng) => {
    if (!onLocationSelect) return;
    
    setIsLoadingAddress(true);
    let newAddress = address; // Fallback
    try {
      // Reverse geocode via backend
      const { data } = await api.get(`/api/geocode/reverse?lat=${newLat}&lng=${newLng}`);
      if (data && data.success && data.formatted_address) {
        newAddress = data.formatted_address;
      }
    } catch (err) {
      console.error("Reverse geocoding failed", err);
      toast.error("Failed to fetch address. Please enter manually.");
    } finally {
      setIsLoadingAddress(false);
      onLocationSelect(newLat, newLng, newAddress);
    }
  };

  return (
    <div className={`relative w-full rounded-md overflow-hidden border border-slate-200 shadow-sm ${className}`} style={{ height }}>
      {isLoadingAddress && (
        <div className="absolute top-2 right-2 z-50 bg-white/90 px-3 py-1 rounded-full shadow text-xs font-medium text-slate-700 flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          Fetching Address...
        </div>
      )}
      {!readOnly && (
        <div className="absolute top-2 left-14 z-[400] bg-white/90 px-3 py-1 rounded shadow text-xs font-medium text-slate-700 pointer-events-none">
          Click or drag marker to update location
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
