import type { Meta, StoryObj } from '@storybook/react';
import { Activity } from 'lucide-react';
import HostStatsCard from '@/features/host/components/HostStatsCard';

const meta: Meta<typeof HostStatsCard> = {
  title: 'Host/HostStatsCard',
  component: HostStatsCard,
  args: {
    title: 'Station Health',
    value: '98%',
    description: 'Operational uptime',
    icon: <Activity size={22} />,
    tone: 'amber',
  },
};

export default meta;

type Story = StoryObj<typeof HostStatsCard>;

export const Default: Story = {};
