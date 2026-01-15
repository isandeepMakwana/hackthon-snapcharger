import React, { useState } from 'react';
import Navbar from './components/Navbar';
import DriverView from './components/DriverView';
import HostView from './components/HostView';
import { MOCK_STATIONS, MOCK_HOST_STATS } from './constants';
import { Station, StationStatus } from './types';

function App() {
  const [viewMode, setViewMode] = useState<'driver' | 'host'>('driver');
  const [stations, setStations] = useState<Station[]>(MOCK_STATIONS);
  
  // Filter stations based on view mode (Mock logic: Host only sees their own)
  const myStations = stations.filter(s => parseInt(s.id) % 2 !== 0); // Mock filter: Host owns odd IDs

  const handleSaveStation = (stationData: Partial<Station>) => {
    if (stationData.id) {
      // Edit existing station
      setStations(prev => prev.map(s => s.id === stationData.id ? { ...s, ...stationData } as Station : s));
    } else {
      // Create new station
      const newStation: Station = {
        id: String(Date.now()),
        hostName: 'Current User',
        title: stationData.title || 'New Station',
        location: 'Pune', // Default
        rating: 0,
        reviewCount: 0,
        pricePerHour: stationData.pricePerHour || 0,
        status: StationStatus.AVAILABLE,
        image: stationData.image || 'https://picsum.photos/400/300',
        connectorType: stationData.connectorType || 'Type 2',
        powerOutput: stationData.powerOutput || '7.2kW',
        description: stationData.description || '',
        coords: { x: 50, y: 50 },
        lat: 18.5204, // Default Pune Center
        lng: 73.8567, // Default Pune Center
        distance: '0.1 km'
      };
      setStations(prev => [newStation, ...prev]);
    }
  };

  const handleBookStation = (id: string) => {
    setStations(prev => prev.map(s => 
      s.id === id ? { ...s, status: StationStatus.BUSY } : s
    ));
    // Alert removed to use Toast in DriverView
  };

  const handleToggleStatus = (id: string) => {
    setStations(prev => prev.map(s => {
      if (s.id !== id) return s;
      const newStatus = s.status === StationStatus.OFFLINE ? StationStatus.AVAILABLE : StationStatus.OFFLINE;
      return { ...s, status: newStatus };
    }));
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <Navbar viewMode={viewMode} setViewMode={setViewMode} />
      
      <main className="flex-1 overflow-hidden">
        {viewMode === 'driver' ? (
          <DriverView 
            stations={stations} 
            onBookStation={handleBookStation}
          />
        ) : (
          <HostView 
            stations={myStations} 
            stats={MOCK_HOST_STATS} 
            onSaveStation={handleSaveStation}
            onToggleStatus={handleToggleStatus}
          />
        )}
      </main>
    </div>
  );
}

export default App;