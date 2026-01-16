export enum StationStatus {
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY',
  OFFLINE = 'OFFLINE'
}

export interface Coordinates {
  x: number; // For fallback/simulation
  y: number; // For fallback/simulation
}

export interface Station {
  id: string;
  hostName: string;
  title: string;
  location: string;
  rating: number;
  reviewCount: number;
  pricePerHour: number;
  status: StationStatus;
  image: string;
  connectorType: string; // e.g., "Type 2", "CCS2"
  powerOutput: string; // e.g., "7.2kW"
  description: string;
  coords: Coordinates;
  lat: number; // Real Map Latitude
  lng: number; // Real Map Longitude
  distance: string;
  phoneNumber?: string; // New field for Call feature
  supportedVehicleTypes?: string[];
  bookedTimeSlots?: string[];
}

export interface HostStats {
  totalEarnings: number;
  activeBookings: number;
  stationHealth: number; // percentage
}

export interface GeminiAnalysisResult {
  connectorType: string;
  powerOutput: string;
  suggestedTitle: string;
  suggestedDescription: string;
  confidence: number;
}
