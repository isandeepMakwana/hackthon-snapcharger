import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import Navbar from '@/components/Navbar';

const meta: Meta<typeof Navbar> = {
  title: 'Components/Navbar',
  component: Navbar,
  args: {
    setViewMode: action('setViewMode'),
    onLoginClick: action('onLoginClick'),
    onLogout: action('onLogout'),
    isAuthenticated: false,
    authRole: null,
  },
};

export default meta;

type Story = StoryObj<typeof Navbar>;

export const Driver: Story = {
  args: {
    viewMode: 'driver',
    isAuthenticated: false,
  },
};

export const Host: Story = {
  args: {
    viewMode: 'host',
    isAuthenticated: true,
    authRole: 'host',
  },
};
