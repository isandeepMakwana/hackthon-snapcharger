import React, { useState } from 'react';
import { Plus, IndianRupee, Calendar, Activity, Zap, Edit2 } from 'lucide-react';
import { Station, StationStatus, HostStats } from '../types';
import AddStationModal from './AddStationModal';

interface HostViewProps {
  stations: Station[];
  stats: HostStats;
  onSaveStation: (data: Partial<Station>) => void;
  onToggleStatus: (id: string) => void;
}

const HostView: React.FC<HostViewProps> = ({ stations, stats, onSaveStation, onToggleStatus }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | undefined>(undefined);

  const handleEditClick = (station: Station) => {
    setEditingStation(station);
    setIsModalOpen(true);
  };

  const handleAddClick = () => {
    setEditingStation(undefined);
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-y-auto bg-slate-50">
      
      {/* HEADER STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 md:p-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
            <IndianRupee size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium">Total Earnings</p>
            <p className="text-2xl font-bold text-slate-800">₹{stats.totalEarnings.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium">Active Bookings</p>
            <p className="text-2xl font-bold text-slate-800">{stats.activeBookings}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium">Station Health</p>
            <p className="text-2xl font-bold text-slate-800">{stats.stationHealth}%</p>
          </div>
        </div>
      </div>

      {/* MY STATIONS SECTION */}
      <div className="flex-1 px-4 md:px-6 pb-20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">My Stations</h2>
          {/* Floating Action Button (Visible on all sizes for easy access) */}
          <button 
            onClick={handleAddClick}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-full font-medium shadow-lg hover:bg-slate-800 transition-all transform active:scale-95"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Add Station</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stations.map(station => (
            <div key={station.id} className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="relative h-40 bg-slate-200">
                <img src={station.image} alt={station.title} className={`w-full h-full object-cover transition-all ${station.status === StationStatus.OFFLINE ? 'grayscale opacity-80' : ''}`} />
                <div className="absolute top-3 right-3">
                  <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide ${
                    station.status === StationStatus.OFFLINE 
                    ? 'bg-slate-800 text-white' 
                    : 'bg-emerald-500 text-white'
                  }`}>
                    {station.status === StationStatus.OFFLINE ? 'Offline' : 'Online'}
                  </span>
                </div>
              </div>
              
              <div className="p-5">
                <h3 className="font-bold text-lg text-slate-900 mb-1">{station.title}</h3>
                <p className="text-sm text-slate-500 mb-4 truncate">{station.description}</p>
                
                <div className="flex items-center justify-between text-sm text-slate-600 border-t border-slate-100 pt-4">
                   <div className="flex items-center gap-1.5">
                      <Zap size={16} className="text-emerald-500" />
                      <span className="font-medium">{station.powerOutput}</span>
                   </div>
                   <div className="font-bold text-slate-900">
                      ₹{station.pricePerHour}<span className="text-slate-400 font-normal">/hr</span>
                   </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <label className="flex items-center cursor-pointer select-none">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        className="sr-only" 
                        checked={station.status !== StationStatus.OFFLINE} 
                        onChange={() => onToggleStatus(station.id)}
                      />
                      <div className={`block w-10 h-6 rounded-full transition-colors ${station.status !== StationStatus.OFFLINE ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                      <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${station.status !== StationStatus.OFFLINE ? 'transform translate-x-4' : ''}`}></div>
                    </div>
                    <div className="ml-3 text-sm font-medium text-slate-600">
                      {station.status !== StationStatus.OFFLINE ? 'Active' : 'Disabled'}
                    </div>
                  </label>
                  
                  <button 
                    onClick={() => handleEditClick(station)}
                    className="flex items-center gap-1.5 text-slate-400 hover:text-emerald-600 transition-colors text-sm font-medium"
                  >
                    <Edit2 size={16} />
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AddStationModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onAddStation={onSaveStation}
        initialData={editingStation}
      />
    </div>
  );
};

export default HostView;