import { render, screen } from '@testing-library/react';
import DriverBookingsView from '@/features/driver/DriverBookingsView';
import { MOCK_DRIVER_BOOKINGS } from '@/data/mockStations';

jest.mock('@/services/driverService', () => ({
  __esModule: true,
  fetchDriverBookings: jest.fn(async () => MOCK_DRIVER_BOOKINGS),
}));

const noop = () => {};

test('renders driver bookings list', async () => {
  render(
    <DriverBookingsView
      isLoggedIn
      onLoginRequest={noop}
      driverProfileComplete
      onRequireDriverProfile={noop}
    />
  );

  expect(await screen.findByText(/TechPark Quick Charge/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /call host/i })).toHaveAttribute(
    'href',
    'tel:+919811112244'
  );
});
