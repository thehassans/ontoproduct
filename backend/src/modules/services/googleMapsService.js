import Setting from "../models/Setting.js";

class GoogleMapsService {
  constructor() {
    this.apiKey = null;
    this.baseUrl = "https://maps.googleapis.com/maps/api";
    this.cache = new Map(); // simple in-memory cache
  }

  extractLatLng(input) {
    try {
      const s = String(input || "").trim();
      if (!s) return null;

      const direct = s.match(/(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
      if (direct) {
        const lat = Number(direct[1]);
        const lng = Number(direct[2]);
        if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
          return { lat, lng };
        }
      }

      const at = s.match(/@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
      if (at) {
        const lat = Number(at[1]);
        const lng = Number(at[2]);
        if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
          return { lat, lng };
        }
      }

      const q = s.match(/[?&](?:q|query|ll)=(-?\d{1,3}\.\d+)(?:%2C|,)(-?\d{1,3}\.\d+)/i);
      if (q) {
        const lat = Number(q[1]);
        const lng = Number(q[2]);
        if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
          return { lat, lng };
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  scoreReverseResult(result) {
    try {
      const types = Array.isArray(result?.types) ? result.types : [];
      const typeSet = new Set(types);
      const addr = String(result?.formatted_address || "").toLowerCase();
      const locType = String(result?.geometry?.location_type || "");

      const locScoreMap = {
        ROOFTOP: 40,
        RANGE_INTERPOLATED: 30,
        GEOMETRIC_CENTER: 20,
        APPROXIMATE: 10,
      };
      const locScore = locScoreMap[locType] || 0;

      let typeScore = 0;
      if (typeSet.has("street_address") || typeSet.has("premise") || typeSet.has("subpremise")) typeScore += 60;
      if (typeSet.has("route")) typeScore += 35;
      if (typeSet.has("intersection")) typeScore += 30;
      if (typeSet.has("establishment") || typeSet.has("point_of_interest")) typeScore += 25;
      if (typeSet.has("neighborhood")) typeScore += 15;
      if (typeSet.has("sublocality") || typeSet.has("sublocality_level_1")) typeScore += 12;
      if (typeSet.has("locality")) typeScore += 10;
      if (typeSet.has("administrative_area_level_2")) typeScore += 6;

      let waterPenalty = 0;
      if (typeSet.has("plus_code")) waterPenalty -= 60;
      if (typeSet.has("natural_feature")) waterPenalty -= 25;
      if (addr.includes("arabian sea") || addr.includes("persian gulf") || addr.includes("gulf of") || addr.includes("sea") || addr.includes("ocean")) {
        waterPenalty -= 20;
      }
      const lenBonus = Math.min(10, Math.floor(addr.length / 20));

      return locScore + typeScore + waterPenalty + lenBonus;
    } catch {
      return 0;
    }
  }

  async getApiKey() {
    try {
      // Try to get from database first
      const doc = await Setting.findOne({ key: "ai" }).lean();
      const dbKey = doc?.value?.googleMapsApiKey;

      if (dbKey) {
        this.apiKey = dbKey;
        return dbKey;
      }

      // Fall back to environment variable
      const envKey = process.env.GOOGLE_MAPS_API_KEY;
      if (envKey) {
        this.apiKey = envKey;
        return envKey;
      }

      throw new Error("Google Maps API key not configured. Please add it in Settings > API Setup.");
    } catch (err) {
      console.error("Error getting Google Maps API key:", err.message);
      throw err;
    }
  }

  async geocode(address) {
    try {
      // Try cache first
      const cacheKey = `geo:${address}`;
      if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

      // Use Google Maps API
      const apiKey = await this.getApiKey();
      const url = `${this.baseUrl}/geocode/json?address=${encodeURIComponent(
        address
      )}&language=en&key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === "OK" && data.results && data.results.length > 0) {
        const result = data.results[0];
        const ok = {
          success: true,
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          formatted_address: result.formatted_address,
          address_components: result.address_components,
          place_id: result.place_id,
          raw: result,
        };
        this.cache.set(cacheKey, ok);
        return ok;
      }
      
      return {
        success: false,
        error: data.error_message || "Location not found",
        status: data.status || "ZERO_RESULTS",
      };
    } catch (err) {
      console.error("Geocode error:", err);
      return {
        success: false,
        error: err.message || "Geocoding request failed",
      };
    }
  }

  async reverseGeocode(lat, lng) {
    try {
      // Try cache first
      const cacheKey = `rev:${lat},${lng}`;
      if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

      // Use Google Maps API
      const apiKey = await this.getApiKey();

      const strictResultType = encodeURIComponent("street_address|premise|subpremise|route");
      const strictLocationType = encodeURIComponent("ROOFTOP|RANGE_INTERPOLATED");
      const strictUrl = `${this.baseUrl}/geocode/json?latlng=${lat},${lng}&language=en&result_type=${strictResultType}&location_type=${strictLocationType}&key=${encodeURIComponent(apiKey)}`;
      const strictResponse = await fetch(strictUrl);
      const strictData = await strictResponse.json();

      let data = strictData;
      if (!(data.status === "OK" && data.results && data.results.length > 0)) {
        const url = `${this.baseUrl}/geocode/json?latlng=${lat},${lng}&language=en&key=${encodeURIComponent(apiKey)}`;
        const response = await fetch(url);
        data = await response.json();
      }
      
      if (data.status === "OK" && data.results && data.results.length > 0) {
        const best = [...data.results]
          .slice(0, 8)
          .map((r, idx) => ({ r, idx, s: this.scoreReverseResult(r) }))
          .sort((a, b) => (b.s - a.s) || (a.idx - b.idx))[0]?.r;
        const result = best || data.results[0];
        let city = "";
        let area = "";
        let country = "";
        
        for (const component of result.address_components || []) {
          if (component.types.includes("locality")) {
            city = component.long_name;
          } else if (
            component.types.includes("sublocality") ||
            component.types.includes("sublocality_level_1")
          ) {
            area = component.long_name;
          } else if (!area && component.types.includes("neighborhood")) {
            area = component.long_name;
          } else if (component.types.includes("country")) {
            country = component.long_name;
          }
        }
        
        const ok = {
          success: true,
          formatted_address: result.formatted_address,
          city,
          area,
          country,
          address_components: result.address_components,
          place_id: result.place_id,
          raw: result,
        };
        this.cache.set(cacheKey, ok);
        return ok;
      }
      
      return {
        success: false,
        error: data.error_message || "No address found for these coordinates",
        status: data.status || "ZERO_RESULTS",
      };
    } catch (err) {
      console.error("Reverse geocode error:", err);
      return {
        success: false,
        error: err.message || "Reverse geocoding request failed",
      };
    }
  }

  async resolveWhatsAppLocation(locationCode) {
    try {
      const parsed = this.extractLatLng(locationCode);
      if (parsed) {
        const reverseResult = await this.reverseGeocode(parsed.lat, parsed.lng);
        if (reverseResult.success) {
          return {
            success: true,
            lat: parsed.lat,
            lng: parsed.lng,
            formatted_address: reverseResult.formatted_address,
            city: reverseResult.city || "",
            area: reverseResult.area || "",
            country: reverseResult.country || "",
            address_components: reverseResult.address_components,
          };
        }
        return {
          success: true,
          lat: parsed.lat,
          lng: parsed.lng,
          formatted_address: `(${Number(parsed.lat).toFixed(6)}, ${Number(parsed.lng).toFixed(6)})`,
          city: "",
          area: "",
          country: "",
          address_components: null,
        };
      }

      const result = await this.geocode(locationCode);

      if (result.success) {
        // Get detailed address info via reverse geocoding
        // This ensures we get the actual street address, not the Plus Code
        const reverseResult = await this.reverseGeocode(result.lat, result.lng);

        if (reverseResult.success) {
          return {
            success: true,
            lat: result.lat,
            lng: result.lng,
            // Use reverse geocoded address (actual street address) instead of geocoded one (Plus Code)
            formatted_address: reverseResult.formatted_address,
            city: reverseResult.city || "",
            area: reverseResult.area || "",
            country: reverseResult.country || "",
            address_components: reverseResult.address_components,
          };
        } else {
          // Fallback to geocode result if reverse geocoding fails
          return {
            success: true,
            lat: result.lat,
            lng: result.lng,
            formatted_address: result.formatted_address,
            city: "",
            area: "",
            country: "",
            address_components: result.address_components,
          };
        }
      }

      return result;
    } catch (err) {
      console.error("WhatsApp location resolution error:", err);
      return {
        success: false,
        error: err.message || "Failed to resolve WhatsApp location",
      };
    }
  }

  async validateAddress(address, expectedCity = null) {
    try {
      const result = await this.geocode(address);

      if (!result.success) {
        return {
          valid: false,
          error: result.error,
        };
      }

      // Extract city from result (supports Google array or OSM object)
      let city = "";
      const ac = result.address_components;
      if (Array.isArray(ac)) {
        for (const component of ac) {
          if (component.types?.includes("locality")) {
            city = component.long_name;
            break;
          }
          if (!city && component.types?.includes("administrative_area_level_2"))
            city = component.long_name;
        }
      } else if (ac && typeof ac === "object") {
        city =
          ac.city ||
          ac.town ||
          ac.village ||
          ac.municipality ||
          ac.county ||
          "";
      }

      // Validate against expected city if provided
      if (expectedCity) {
        const normalizedCity = city.toLowerCase().trim();
        const normalizedExpected = expectedCity.toLowerCase().trim();

        if (normalizedCity !== normalizedExpected) {
          return {
            valid: false,
            error: `Address is in ${city}, but order is for ${expectedCity}`,
            resolvedCity: city,
            expectedCity: expectedCity,
          };
        }
      }

      return {
        valid: true,
        lat: result.lat,
        lng: result.lng,
        formatted_address: result.formatted_address,
        city,
        address_components: result.address_components,
      };
    } catch (err) {
      return {
        valid: false,
        error: err.message || "Address validation failed",
      };
    }
  }

  async getDistance(origin, destination) {
    try {
      const apiKey = await this.getApiKey();

      // Format origins and destinations
      const originStr =
        typeof origin === "string" ? origin : `${origin.lat},${origin.lng}`;
      const destStr =
        typeof destination === "string"
          ? destination
          : `${destination.lat},${destination.lng}`;

      const url = `${
        this.baseUrl
      }/distancematrix/json?origins=${encodeURIComponent(
        originStr
      )}&destinations=${encodeURIComponent(destStr)}&key=${encodeURIComponent(
        apiKey
      )}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK" && data.rows && data.rows[0]?.elements?.[0]) {
        const element = data.rows[0].elements[0];

        if (element.status === "OK") {
          return {
            success: true,
            distance: {
              text: element.distance.text,
              value: element.distance.value, // in meters
            },
            duration: {
              text: element.duration.text,
              value: element.duration.value, // in seconds
            },
          };
        }
      }

      return {
        success: false,
        error: "Could not calculate distance",
      };
    } catch (err) {
      console.error("Distance calculation error:", err);
      return {
        success: false,
        error: err.message || "Distance calculation failed",
      };
    }
  }

  async testConnection() {
    try {
      // Test Google Maps API
      const apiKey = await this.getApiKey();
      const testLat = 25.2048;
      const testLng = 55.2708;
      const url = `${this.baseUrl}/geocode/json?latlng=${testLat},${testLng}&key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === "OK") {
        return { ok: true, message: "Google Maps API OK" };
      }
      if (data.status === "REQUEST_DENIED") {
        return { ok: false, message: "Google Maps API key invalid or Geocoding API not enabled" };
      }
      return {
        ok: false,
        message: data.error_message || `Test failed: ${data.status}`,
      };
    } catch (err) {
      return { ok: false, message: err.message || "Connection test failed" };
    }
  }
}

// Export singleton instance
export default new GoogleMapsService();
