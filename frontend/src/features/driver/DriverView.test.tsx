import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DriverView from '@/features/driver/DriverView';
import { useStationStore } from '@/store/useStationStore';
import { StationStatus } from '@/types';

jest.mock('@/features/driver/components/MapCanvas', () => ({
  __esModule: true,
  default: () => <div data-testid="map" />,
}));

beforeEach(() => {
  useStationStore.getState().reset();
});

test('filters stations by search query', async () => {
  const user = userEvent.setup();
  render(
    <DriverView
      isLoggedIn={false}
      onLoginRequest={jest.fn()}
      pendingBookingStationId={null}
      onPendingBookingHandled={jest.fn()}
    />
  );

  expect(screen.getByText(/Verma Villa Green Spot/i)).toBeInTheDocument();

  const searchInput = screen.getByLabelText(/search for stations/i);
  await user.type(searchInput, 'Hinjewadi');

  expect(screen.getByText(/TechPark Quick Charge/i)).toBeInTheDocument();
  expect(screen.queryByText(/Verma Villa Green Spot/i)).not.toBeInTheDocument();
});

test('booking flow updates station status', async () => {
  const user = userEvent.setup();
  render(
    <DriverView
      isLoggedIn
      onLoginRequest={jest.fn()}
      pendingBookingStationId={null}
      onPendingBookingHandled={jest.fn()}
    />
  );

  const stationCard = screen.getByRole('button', { name: /Verma Villa Green Spot/i });
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
