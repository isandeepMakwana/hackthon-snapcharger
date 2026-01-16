import { Filter, Search } from 'lucide-react';

interface DriverFiltersProps {
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  vehicleType: string;
  setVehicleType: (value: string) => void;
  activeTags: string[];
  toggleTag: (tag: string) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  filterTags: { id: string; label: string }[];
  statusOptions: { value: string; label: string }[];
  vehicleTypeOptions: { value: string; label: string }[];
  searchPlaceholder: string;
}

const DriverFilters = ({
  statusFilter,
  setStatusFilter,
  vehicleType,
  setVehicleType,
  activeTags,
  toggleTag,
  searchQuery,
  setSearchQuery,
  filterTags,
  statusOptions,
  vehicleTypeOptions,
  searchPlaceholder,
}: DriverFiltersProps) => {
  return (
    <div className="space-y-3">
      <div className="relative">
        <label htmlFor="station-search" className="sr-only">
          Search for stations
        </label>
        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
          <Search size={18} />
        </div>
        <input
          id="station-search"
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-2xl border border-border/80 bg-surface-strong px-10 py-3 pr-12 text-sm text-ink shadow-soft focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
        <div className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-surface text-muted shadow-sm" aria-hidden="true">
          <Filter size={18} />
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <label htmlFor="status-filter" className="sr-only">
          Filter by availability
        </label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-9 rounded-full border border-border/80 bg-surface-strong px-4 text-xs font-semibold text-ink shadow-sm focus:border-accent focus:outline-none"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <label htmlFor="vehicle-filter" className="sr-only">
          Filter by vehicle type
        </label>
        <select
          id="vehicle-filter"
          value={vehicleType}
          onChange={(event) => setVehicleType(event.target.value)}
          className="h-9 rounded-full border border-border/80 bg-surface-strong px-4 text-xs font-semibold text-ink shadow-sm focus:border-accent focus:outline-none"
        >
          {vehicleTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {filterTags.map((tag) => (
          <button
            type="button"
            key={tag.id}
            onClick={() => toggleTag(tag.id)}
            className={`h-9 whitespace-nowrap rounded-full border px-4 text-xs font-semibold transition ${
              activeTags.includes(tag.id)
                ? 'border-accent/40 bg-accent-soft text-ink shadow-sm'
                : 'border-border/80 bg-surface text-muted hover:border-accent/30 hover:text-ink'
            }`}
          >
            {tag.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default DriverFilters;
