import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import DriverView from '@/features/driver/DriverView';
import { MOCK_STATIONS } from '@/data/mockStations';
import { useStationStore } from '@/store/useStationStore';
import { StationStatus } from '@/types';

const MOCK_DRIVER_CONFIG = {
  location: { name: 'Pune', lat: 18.5204, lng: 73.8567 },
  locationLabel: 'Pune - 6 km radius',
  searchRadiusKm: 10,
  displayRadiusKm: 6,
  personalizedLabel: 'Personalized for Pune',
  searchPlaceholder: 'Search by area or host',
  filterTags: [
    { id: 'fast_charge', label: 'Fast Charge' },
    { id: 'type_2', label: 'Type 2' },
  ],
  statusOptions: [
    { value: 'ALL', label: 'All Status' },
    { value: 'AVAILABLE', label: 'Available' },
  ],
  vehicleTypeOptions: [
    { value: 'ALL', label: 'All Vehicles' },
    { value: '2W', label: '2 Wheeler' },
  ],
  legend: [
    { status: 'AVAILABLE', label: 'Available' }
  ],
  booking: {
    serviceFee: 10,
    timeSlots: ['10:00 AM', '11:00 AM']
  }
};

jest.mock('@/features/driver/components/MapCanvas', () => ({
  __esModule: true,
  default: () => <div data-testid="map" />,
}));

jest.mock('@/services/driverService', () => ({
  __esModule: true,
  fetchDriverStations: jest.fn(async () => MOCK_STATIONS),
  fetchDriverConfig: jest.fn(async () => MOCK_DRIVER_CONFIG),
  createDriverBooking: jest.fn(async () => ({
    ...MOCK_STATIONS[0],
    status: StationStatus.BUSY
  }))
}));

beforeEach(() => {
  useStationStore.getState().reset();
});

test('filters stations by search query', async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <DriverView
        isLoggedIn={false}
        onLoginRequest={jest.fn()}
        pendingBookingStationId={null}
        onPendingBookingHandled={jest.fn()}
        driverProfileComplete={true}
        onRequireDriverProfile={jest.fn()}
      />
    </MemoryRouter>
  );

  expect(await screen.findByText(/Verma Villa Green Spot/i)).toBeInTheDocument();

  const searchInput = screen.getByLabelText(/search for stations/i);
  await user.type(searchInput, 'Hinjewadi');

  expect(screen.getByText(/TechPark Quick Charge/i)).toBeInTheDocument();
  expect(screen.queryByText(/Verma Villa Green Spot/i)).not.toBeInTheDocument();
});

test('booking flow updates station status', async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <DriverView
        isLoggedIn
        onLoginRequest={jest.fn()}
        pendingBookingStationId={null}
        onPendingBookingHandled={jest.fn()}
        driverProfileComplete={true}
        onRequireDriverProfile={jest.fn()}
      />
    </MemoryRouter>
  );

  const stationCard = await screen.findByRole('button', { name: /Verma Villa Green Spot/i });
  await user.click(stationCard);

  const bookButton = await screen.findByRole('button', { name: /Book for/i });
  await user.click(bookButton);

  const confirmButton = screen.getByRole('button', { name: /Confirm/i });
  await user.click(confirmButton);

  const updatedStation = useStationStore
    .getState()
    .stations.find((station) => station.id === '1');

  expect(updatedStation?.status).toBe(StationStatus.BUSY);
});
