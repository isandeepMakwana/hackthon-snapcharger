import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import HostStationCard from '@/features/host/components/HostStationCard';
import { StationStatus } from '@/types';

const meta: Meta<typeof HostStationCard> = {
  title: 'Host/HostStationCard',
  component: HostStationCard,
  args: {
    station: {
      id: '3',
      hostName: 'Amit Singh',
      title: 'Baner High Street Point',
      location: 'Baner, Pune',
      rating: 4.9,
      reviewCount: 12,
      pricePerHour: 120,
      status: StationStatus.AVAILABLE,
      image: 'https://picsum.photos/400/300?random=3',
      connectorType: 'Type 2',
      powerOutput: '3.3kW',
      description: 'Slow charging perfect for evening visits to High Street restaurants.',
      coords: { x: 25, y: 70 },
      lat: 18.559,
      lng: 73.7868,
      distance: '5.1 km',
    },
    onToggleStatus: action('toggleStatus'),
    onEdit: action('editStation'),
  },
};

export default meta;

type Story = StoryObj<typeof HostStationCard>;

export const Default: Story = {};

export const Offline: Story = {
  args: {
    station: {
      id: '4',
      hostName: 'Sneha Gupta',
      title: 'FC Road Rapid Point',
      location: 'FC Road, Pune',
      rating: 4.2,
      reviewCount: 8,
      pricePerHour: 250,
      status: StationStatus.OFFLINE,
      image: 'https://picsum.photos/400/300?random=4',
      connectorType: 'Type 2',
      powerOutput: '11kW',
      description: 'Centrally located near Fergusson College. Currently maintenance in progress.',
      coords: { x: 75, y: 20 },
      lat: 18.5196,
      lng: 73.8433,
      distance: '3.2 km',
    },
  },
};
