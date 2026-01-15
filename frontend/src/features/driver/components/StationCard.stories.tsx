import type { Meta, StoryObj } from '@storybook/react';
import StationCard from '@/features/driver/components/StationCard';
import { StationStatus } from '@/types';

const meta: Meta<typeof StationCard> = {
  title: 'Driver/StationCard',
  component: StationCard,
  args: {
    station: {
      id: '1',
      hostName: 'Rahul Verma',
      title: 'Verma Villa Green Spot',
      location: 'Koregaon Park, Pune',
      rating: 4.8,
      reviewCount: 34,
      pricePerHour: 150,
      status: StationStatus.AVAILABLE,
      image: 'https://picsum.photos/400/300?random=1',
      connectorType: 'Type 2',
      powerOutput: '7.2kW',
      description: 'Secure driveway charger. Covered parking available while charging.',
      coords: { x: 40, y: 30 },
      lat: 18.5362,
      lng: 73.894,
      distance: '0.8 km',
      phoneNumber: '+919876543210',
    },
    isSelected: false,
    onSelect: () => {},
  },
};

export default meta;

type Story = StoryObj<typeof StationCard>;

export const Default: Story = {};

export const Selected: Story = {
  args: {
    isSelected: true,
  },
};
