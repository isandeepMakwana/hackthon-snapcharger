import React, { useState, useEffect, useRef } from 'react';
import { Star, Navigation, Zap, Filter, Share2, Phone, Clock, MapPin, X, AlertCircle, CheckCircle, ShieldCheck, ThumbsUp, Copy, CalendarClock, ChevronDown, Crosshair } from 'lucide-react';
import { Station, StationStatus } from '../types';

interface DriverViewProps {
  stations: Station[];
  onBookStation: (id: string) => void;
}

// Add types for Leaflet
declare global {
  interface Window {
    L: any;
  }
}

const DriverView: React.FC<DriverViewProps> = ({ stations, onBookStation }) => {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [showBookingConfirm, setShowBookingConfirm] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  
  // UI State
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'about'>('overview');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');

  // Filters State
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  // Map State
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // User Location (Pune Center)
  const USER_LAT = 18.5204;
  const USER_LNG = 73.8567;

  // --- Helpers ---
  const generateTimeSlots = () => {
    const slots = [];
    const now = new Date();
    // Start from next hour
    now.setHours(now.getHours() + 1, 0, 0, 0);

    for (let i = 0; i < 6; i++) {
      const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      slots.push(timeString);
      now.setHours(now.getHours() + 1);
    }
    return slots;
  };

  const availableSlots = generateTimeSlots();

  // Reset time slot when station changes
  useEffect(() => {
    if (selectedStation) {
      setSelectedTimeSlot(availableSlots[0]);
    }
  }, [selectedStation]);

  // --- Filtering Logic ---
  const toggleFilter = (filter: string) => {
    setActiveFilters(prev => 
      prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
    );
  };

  const filteredStations = stations.filter(station => {
    // Status Filter
    if (statusFilter !== 'All') {
      if (statusFilter === 'Available' && station.status !== StationStatus.AVAILABLE) return false;
      if (statusFilter === 'Busy' && station.status !== StationStatus.BUSY) return false;
      if (statusFilter === 'Offline' && station.status !== StationStatus.OFFLINE) return false;
    }

    // Tags Filters
    if (activeFilters.includes('Fast Charge') && !station.powerOutput.includes('22kW') && !station.powerOutput.includes('11kW')) return false;
    if (activeFilters.includes('Type 2') && station.connectorType !== 'Type 2') return false;
    if (activeFilters.includes('< ₹200/hr') && station.pricePerHour >= 200) return false;

    return true;
  });

  // --- Action Handlers ---

  const handleDirections = () => {
    if (!selectedStation) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedStation.lat},${selectedStation.lng}`;
    window.open(url, '_blank');
  };

  const handleCall = () => {
    if (!selectedStation) return;
    const number = selectedStation.phoneNumber || '+919999999999';
    window.location.href = `tel:${number}`;
  };

  const handleShare = async () => {
    if (!selectedStation) return;
    
    const shareData = {
      title: `Charge at ${selectedStation.title}`,
      text: `Check out this EV charger: ${selectedStation.title} in ${selectedStation.location}. Rated ${selectedStation.rating} stars!`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
      alert('Link copied to clipboard!');
    }
  };

  const recenterMap = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([USER_LAT, USER_LNG], 13);
      setSelectedStation(null);
    }
  };

  // --- Leaflet Map Implementation ---
  
  useEffect(() => {
    // Wait for Leaflet to load
    if (!window.L || !mapRef.current || mapInstanceRef.current) return;

    // 1. Initialize Map
    const map = window.L.map(mapRef.current, {
      center: [USER_LAT, USER_LNG], // Pune
      zoom: 12, 
      zoomControl: false,
      attributionControl: false 
    });

    // 2. Add Tiles (CartoDB Voyager)
    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 20
    }).addTo(map);

    // Add Zoom Control to bottom right
    window.L.control.zoom({
      position: 'bottomright'
    }).addTo(map);

    // Add User Location Marker
    const userIcon = window.L.divIcon({
      className: 'user-location-marker',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-30 w-[40px] h-[40px] -ml-[10px] -mt-[10px]"></div>
          <div class="relative w-5 h-5 rounded-full bg-blue-600 border-[3px] border-white shadow-lg"></div>
        </div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
    
    window.L.marker([USER_LAT, USER_LNG], { icon: userIcon, zIndexOffset: 1000 })
      .addTo(map)
      .bindPopup("You are here");

    // Click handler to deselect
    map.on('click', () => {
      setSelectedStation(null);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 3. Sync Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;

    // Clear old markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    filteredStations.forEach(station => {
      const isSelected = selectedStation?.id === station.id;
      
      // Create Custom HTML Icon
      const iconHtml = `
        <div class="relative flex items-center justify-center transition-all duration-300 ${isSelected ? 'scale-125 z-50' : 'scale-100'}">
          ${station.status === StationStatus.AVAILABLE ? '<div class="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-75 w-full h-full"></div>' : ''}
          <div class="relative w-4 h-4 rounded-full border-2 border-white shadow-md ${
            station.status === StationStatus.AVAILABLE ? 'bg-emerald-500' :
            station.status === StationStatus.BUSY ? 'bg-red-500' : 'bg-slate-400'
          }"></div>
        </div>
      `;

      const icon = window.L.divIcon({
        className: 'leaflet-custom-marker',
        html: iconHtml,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const marker = window.L.marker([station.lat, station.lng], { icon })
        .addTo(mapInstanceRef.current)
        .on('click', () => {
          // Prevent click from propagating to map
          setSelectedStation(station);
        });

      markersRef.current.push(marker);
    });

  }, [filteredStations, selectedStation]);

  // Pan map and Scroll List when station selected
  useEffect(() => {
    if (selectedStation && mapInstanceRef.current) {
      // 1. Fly to location
      mapInstanceRef.current.flyTo([selectedStation.lat, selectedStation.lng], 15, {
        animate: true,
        duration: 1
      });
      
      // 2. Smooth Scroll to Card in List
      // We use a small timeout to ensure DOM is ready/layout is settled
      setTimeout(() => {
        const element = document.getElementById(`station-card-${selectedStation.id}`);
        if (element) {
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
        }
      }, 100);
    }
  }, [selectedStation]);

  const initiateBooking = () => {
    setShowBookingConfirm(true);
  };

  const confirmBooking = () => {
    if (selectedStation) {
      onBookStation(selectedStation.id);
      setShowBookingConfirm(false);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-64px)] overflow-hidden relative">
      
      {/* SUCCESS TOAST */}
      {showSuccessToast && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] animate-in slide-in-from-top-5 fade-in duration-300 w-11/12 max-w-sm">
          <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3">
            <CheckCircle size={24} className="shrink-0" />
            <div>
              <p className="font-bold">Booking Confirmed!</p>
              <p className="text-sm opacity-90">Slot reserved for {selectedTimeSlot}</p>
            </div>
          </div>
        </div>
      )}

      {/* BOOKING CONFIRMATION MODAL */}
      {showBookingConfirm && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Confirm Booking</h3>
              <p className="text-slate-500 text-sm mb-4">
                Book <span className="font-semibold text-slate-700">{selectedStation?.title}</span>?
              </p>
              
              <div className="bg-slate-50 rounded-lg p-3 text-sm flex items-center justify-center gap-2 mb-4 border border-slate-100">
                 <CalendarClock size={16} className="text-emerald-600"/>
                 <span className="text-slate-600">Today at </span>
                 <span className="font-bold text-slate-900">{selectedTimeSlot}</span>
              </div>
              <div className="flex justify-between items-center text-sm mb-2 px-2">
                 <span className="text-slate-500">Hourly Rate</span>
                 <span className="font-semibold">₹{selectedStation?.pricePerHour}</span>
              </div>
              <div className="flex justify-between items-center text-sm mb-1 px-2">
                 <span className="text-slate-500">Service Fee</span>
                 <span className="font-semibold">₹10</span>
              </div>
            </div>
            <div className="flex border-t border-slate-100">
              <button 
                onClick={() => setShowBookingConfirm(false)}
                className="flex-1 py-4 text-slate-500 font-medium text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <div className="w-px bg-slate-100"></div>
              <button 
                onClick={confirmBooking}
                className="flex-1 py-4 text-emerald-600 font-bold text-sm hover:bg-emerald-50 transition-colors"
              >
                Confirm Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEFT PANEL: LIST (Bottom on Mobile) */}
      <div className="w-full md:w-5/12 lg:w-4/12 flex flex-col bg-white border-r border-slate-200 order-2 md:order-1 h-[60%] md:h-full z-10 shadow-[0_-5px_15px_rgba(0,0,0,0.1)] md:shadow-none rounded-t-3xl md:rounded-none relative -mt-4 md:mt-0">
        
        {/* Mobile Pull Indicator */}
        <div className="md:hidden w-full flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
        </div>

        {/* Search Header */}
        <div className="p-4 border-b border-slate-100 shrink-0">
          <div className="relative mb-3">
            <input 
              type="text" 
              placeholder="Search Pune..." 
              className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
            />
            <div className="absolute right-3 top-3 text-slate-400">
              <Filter size={18} />
            </div>
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-100 text-slate-700 text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
            >
              <option value="All">All Status</option>
              <option value="Available">Available</option>
              <option value="Busy">Busy</option>
              <option value="Offline">Offline</option>
            </select>
            {['Fast Charge', 'Type 2', '< ₹200/hr'].map(tag => (
              <button 
                key={tag} 
                onClick={() => toggleFilter(tag)}
                className={`whitespace-nowrap px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  activeFilters.includes(tag) 
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Station List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 scroll-smooth">
          {filteredStations.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                <Filter size={32} className="mb-2 opacity-50"/>
                <p>No stations found matching filters</p>
             </div>
          ) : (
            filteredStations.map(station => (
              <div 
                key={station.id}
                id={`station-card-${station.id}`}
                onClick={() => setSelectedStation(station)}
                className={`bg-white rounded-xl p-3 border cursor-pointer transition-all active:scale-[0.98] flex gap-3 ${
                  selectedStation?.id === station.id 
                    ? 'ring-2 ring-emerald-500 border-emerald-500 shadow-md bg-emerald-50/10' 
                    : 'border-slate-200 shadow-sm hover:border-emerald-200'
                }`}
              >
                <div className="relative h-24 w-24 shrink-0 rounded-lg overflow-hidden bg-slate-200">
                  <img src={station.image} alt={station.title} className="h-full w-full object-cover" />
                  <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                    {station.distance}
                  </div>
                </div>
                
                <div className="flex flex-col flex-1 justify-between py-0.5">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-slate-800 text-sm leading-tight line-clamp-1">{station.title}</h3>
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${
                        station.status === StationStatus.AVAILABLE ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
                        station.status === StationStatus.BUSY ? 'bg-red-500' : 'bg-slate-400'
                      }`} />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{station.location}</p>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-600 mt-2">
                    <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded">
                      <Star size={10} fill="currentColor" />
                      <span className="font-semibold">{station.rating}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap size={12} className="text-slate-400" />
                      {station.powerOutput}
                    </div>
                  </div>

                  <div className="flex items-end justify-between mt-2">
                    <span className="text-emerald-700 font-bold text-sm">₹{station.pricePerHour}<span className="text-slate-400 text-xs font-normal">/hr</span></span>
                  </div>
                </div>
              </div>
            ))
          )}
          <div className="h-24 md:h-0"></div> {/* Spacer for mobile nav/safe area */}
        </div>
      </div>

      {/* RIGHT PANEL: LEAFLET MAP (Top on Mobile) */}
      <div className="w-full md:w-7/12 lg:w-8/12 bg-slate-200 relative h-[45%] md:h-full z-0 order-1 md:order-2">
        <div ref={mapRef} className="w-full h-full" />
        
        {/* Recenter Button */}
        <button 
          onClick={recenterMap}
          className="absolute bottom-6 right-4 md:right-6 md:bottom-6 z-[400] bg-white text-slate-700 p-3 rounded-full shadow-lg border border-slate-100 hover:bg-slate-50 active:scale-95 transition-all"
          title="Recenter on me"
        >
          <Crosshair size={24} />
        </button>

        {/* Legend */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur p-2 rounded-lg shadow-sm border border-slate-200 z-[400] flex gap-3 text-xs font-medium text-slate-600 hidden md:flex">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.2)]"></span>
            Available
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            Busy
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
            Offline
          </div>
        </div>

        {/* DETAILED STATION PANEL (Bottom Sheet on Mobile) */}
        {selectedStation && (
          <>
             {/* Mobile Backdrop for focus */}
             <div className="absolute inset-0 bg-black/20 z-[450] md:hidden" onClick={() => setSelectedStation(null)}></div>

             <div className="absolute bottom-0 md:top-0 right-0 h-[85vh] md:h-full w-full md:w-[400px] z-[500] animate-in slide-in-from-bottom-10 md:slide-in-from-right-10 fade-in duration-300 flex flex-col justify-end md:justify-start">
            
              <div className="bg-white h-full shadow-[0_-10px_40px_rgba(0,0,0,0.2)] md:shadow-2xl overflow-y-auto rounded-t-3xl md:rounded-none flex flex-col relative">
                
                {/* Mobile Drag Handle */}
                <div className="md:hidden w-full flex justify-center pt-3 pb-2 absolute top-0 z-20" onClick={() => setSelectedStation(null)}>
                   <div className="w-12 h-1.5 bg-white/80 rounded-full shadow-sm"></div>
                </div>

                {/* Image Header */}
                <div className="relative h-56 shrink-0">
                  <img src={selectedStation.image} alt={selectedStation.title} className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setSelectedStation(null)}
                    className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-colors z-20"
                  >
                    <X size={20} />
                  </button>
                  <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 text-white">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide shadow-sm mb-2 inline-block ${
                      selectedStation.status === StationStatus.AVAILABLE ? 'bg-emerald-500' :
                      selectedStation.status === StationStatus.BUSY ? 'bg-red-500' : 'bg-slate-600'
                    }`}>
                      {selectedStation.status}
                    </span>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  {/* Title & Rating */}
                  <div className="mb-4">
                    <h2 className="text-xl font-bold text-slate-900 leading-tight mb-1.5">{selectedStation.title}</h2>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-1 font-bold text-slate-800 bg-yellow-50 px-2 py-0.5 rounded border border-yellow-100">
                        <span>{selectedStation.rating}</span>
                        <Star size={12} fill="orange" className="text-yellow-500"/>
                      </div>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500">{selectedStation.reviewCount} reviews</span>
                    </div>
                  </div>

                  {/* Booking Time Slots Selection */}
                  {selectedStation.status === StationStatus.AVAILABLE && (
                    <div className="mb-5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                        <Clock size={12}/> Select Start Time
                      </p>
                      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {availableSlots.map((slot) => (
                          <button
                            key={slot}
                            onClick={() => setSelectedTimeSlot(slot)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium border whitespace-nowrap transition-all ${
                              selectedTimeSlot === slot 
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md transform scale-105' 
                                : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-500'
                            }`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Primary Action Button */}
                  <button 
                    onClick={initiateBooking}
                    disabled={selectedStation.status !== StationStatus.AVAILABLE}
                    className={`w-full py-3.5 rounded-xl font-bold shadow-lg shadow-emerald-100 mb-6 flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                      selectedStation.status === StationStatus.AVAILABLE 
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {selectedStation.status === StationStatus.AVAILABLE ? (
                      <>
                        <Zap size={20} /> Book for {selectedTimeSlot}
                      </>
                    ) : (
                      <>
                        <AlertCircle size={20} /> Station {selectedStation.status === StationStatus.BUSY ? 'Occupied' : 'Unavailable'}
                      </>
                    )}
                  </button>

                  {/* Quick Actions Row */}
                  <div className="grid grid-cols-3 gap-4 mb-6 px-2">
                    <button 
                      onClick={handleDirections}
                      className="flex flex-col items-center gap-2 cursor-pointer group p-2 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full border border-emerald-600 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors shadow-sm">
                        <Navigation size={20} />
                      </div>
                      <span className="text-xs font-semibold text-slate-600">Directions</span>
                    </button>
                    <button 
                      onClick={handleCall}
                      className="flex flex-col items-center gap-2 cursor-pointer group p-2 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full border border-slate-200 text-slate-600 flex items-center justify-center group-hover:bg-slate-800 group-hover:text-white transition-colors shadow-sm">
                        <Phone size={20} />
                      </div>
                      <span className="text-xs font-semibold text-slate-600">Call</span>
                    </button>
                    <button 
                      onClick={handleShare}
                      className="flex flex-col items-center gap-2 cursor-pointer group p-2 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full border border-slate-200 text-slate-600 flex items-center justify-center group-hover:bg-slate-800 group-hover:text-white transition-colors shadow-sm">
                        <Share2 size={20} />
                      </div>
                      <span className="text-xs font-semibold text-slate-600">Share</span>
                    </button>
                  </div>

                  {/* Tabs Header */}
                  <div className="border-b border-slate-200 flex mb-4 sticky top-0 bg-white z-10">
                    <button 
                      onClick={() => setActiveTab('overview')}
                      className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'overview' ? 'text-emerald-600 border-emerald-600' : 'text-slate-500 border-transparent hover:text-slate-800'}`}
                    >
                      Overview
                    </button>
                    <button 
                      onClick={() => setActiveTab('reviews')}
                      className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'reviews' ? 'text-emerald-600 border-emerald-600' : 'text-slate-500 border-transparent hover:text-slate-800'}`}
                    >
                      Reviews
                    </button>
                    <button 
                      onClick={() => setActiveTab('about')}
                      className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'about' ? 'text-emerald-600 border-emerald-600' : 'text-slate-500 border-transparent hover:text-slate-800'}`}
                    >
                      About
                    </button>
                  </div>

                  {/* TAB CONTENT: OVERVIEW */}
                  {activeTab === 'overview' && (
                    <div className="space-y-4 text-sm text-slate-600 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
                      <p className="leading-relaxed text-slate-700">{selectedStation.description}</p>
                      
                      <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                        <div className="flex items-start gap-3">
                          <MapPin size={18} className="text-slate-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-slate-800">Location</p>
                            <p className="text-xs">{selectedStation.location}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Clock size={18} className="text-slate-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-slate-800">Hours</p>
                            <p className="text-emerald-600 font-medium text-xs">Open 24 hours</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Zap size={18} className="text-slate-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-slate-800">Charging Specs</p>
                            <p className="text-xs">{selectedStation.connectorType} • {selectedStation.powerOutput}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB CONTENT: REVIEWS */}
                  {activeTab === 'reviews' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
                      {/* Mock Review 1 */}
                      <div className="border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">AS</div>
                          <div>
                             <p className="text-sm font-bold text-slate-800">Arjun Singh</p>
                             <div className="flex text-yellow-400"><Star size={10} fill="currentColor"/><Star size={10} fill="currentColor"/><Star size={10} fill="currentColor"/><Star size={10} fill="currentColor"/><Star size={10} fill="currentColor"/></div>
                          </div>
                          <span className="text-xs text-slate-400 ml-auto">2 days ago</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">Great experience! The host was very helpful and the charging speed was exactly as advertised. Safe location.</p>
                      </div>
                       {/* Mock Review 2 */}
                      <div className="border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-600">NK</div>
                          <div>
                             <p className="text-sm font-bold text-slate-800">Neha Kumar</p>
                             <div className="flex text-yellow-400"><Star size={10} fill="currentColor"/><Star size={10} fill="currentColor"/><Star size={10} fill="currentColor"/><Star size={10} fill="currentColor"/><Star size={10}/></div>
                          </div>
                          <span className="text-xs text-slate-400 ml-auto">1 week ago</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">Good charger but the approach road is a bit narrow for SUVs. Otherwise perfect.</p>
                      </div>
                       {/* Mock Review 3 */}
                      <div className="pb-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">RD</div>
                          <div>
                             <p className="text-sm font-bold text-slate-800">Rahul Dravid</p>
                             <div className="flex text-yellow-400"><Star size={10} fill="currentColor"/><Star size={10} fill="currentColor"/><Star size={10} fill="currentColor"/><Star size={10} fill="currentColor"/><Star size={10} fill="currentColor"/></div>
                          </div>
                          <span className="text-xs text-slate-400 ml-auto">2 weeks ago</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">Reliable and fast. Will definitely use again when I'm in Indiranagar.</p>
                      </div>
                    </div>
                  )}

                  {/* TAB CONTENT: ABOUT */}
                  {activeTab === 'about' && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
                      {/* Host Profile */}
                      <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                         <div className="w-12 h-12 rounded-full bg-slate-300 overflow-hidden">
                            <img src={`https://ui-avatars.com/api/?name=${selectedStation.hostName}&background=random`} alt="Host" />
                         </div>
                         <div>
                            <p className="text-sm font-bold text-slate-800">Hosted by {selectedStation.hostName}</p>
                            <p className="text-xs text-slate-500">Superhost • Joined 2023</p>
                         </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-semibold text-slate-800 text-sm">Amenities</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                           <div className="flex items-center gap-2"><ShieldCheck size={14} className="text-emerald-600"/> 24/7 CCTV</div>
                           <div className="flex items-center gap-2"><Zap size={14} className="text-emerald-600"/> Fast Charging</div>
                           <div className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-600"/> Covered Parking</div>
                           <div className="flex items-center gap-2"><ThumbsUp size={14} className="text-emerald-600"/> Easy Access</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                         <h4 className="font-semibold text-slate-800 text-sm">Safety Guidelines</h4>
                         <p className="text-xs text-slate-500 leading-relaxed">
                           Please ensure the connector is firmly locked before starting the session. Do not unplug forcibly. Contact the host for any emergency.
                         </p>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default DriverView;