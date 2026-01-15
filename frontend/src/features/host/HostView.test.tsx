import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HostView from '@/features/host/HostView';
import { useStationStore } from '@/store/useStationStore';
import { StationStatus } from '@/types';

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

  const updatedStation = useStationStore
    .getState()
    .stations.find((station) => station.id === '1');

  expect(updatedStation?.status).toBe(StationStatus.OFFLINE);
});
