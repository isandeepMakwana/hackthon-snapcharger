import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HostView from '@/features/host/HostView';
import { MOCK_HOST_BOOKINGS, MOCK_HOST_STATS, MOCK_STATIONS } from '@/data/mockStations';
import { useStationStore } from '@/store/useStationStore';
import { StationStatus } from '@/types';

jest.mock('@/services/hostService', () => ({
  __esModule: true,
  fetchHostStations: jest.fn(async () => MOCK_STATIONS),
  fetchHostStats: jest.fn(async () => MOCK_HOST_STATS),
  fetchHostBookings: jest.fn(async () => MOCK_HOST_BOOKINGS),
  createHostStation: jest.fn(async () => MOCK_STATIONS[0]),
  updateHostStation: jest.fn(async () => ({ ...MOCK_STATIONS[0], status: StationStatus.OFFLINE })),
}));

beforeEach(() => {
  useStationStore.getState().reset();
});

test('opens add station modal', async () => {
  const user = userEvent.setup();
  render(<HostView />);

  const addButton = screen.getByRole('button', { name: /add station/i });
  await user.click(addButton);

  expect(await screen.findByText(/Add New Station/i)).toBeInTheDocument();
});

test('toggles station availability', async () => {
  const user = userEvent.setup();
  render(<HostView />);

  const toggle = screen.getAllByRole('checkbox', { name: /toggle station availability/i })[0];
  if (!toggle) throw new Error('Missing toggle control');
  await user.click(toggle);

  await waitFor(() => {
    const updatedStation = useStationStore
      .getState()
      .stations.find((station) => station.id === '1');
    expect(updatedStation?.status).toBe(StationStatus.OFFLINE);
  });
});

test('renders host bookings list', async () => {
  render(<HostView />);

  expect(await screen.findByText(/Recent Bookings/i)).toBeInTheDocument();
  expect(await screen.findByText(/Aman Sharma/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /call driver/i })).toHaveAttribute('href', 'tel:+919811112299');
});
