import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import Navbar from '@/components/Navbar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const meta: Meta<typeof Navbar> = {
  title: 'Components/Navbar',
  component: Navbar,
  args: {
    onLoginClick: action('onLoginClick'),
    onLogout: action('onLogout'),
    onEditProfile: action('onEditProfile'),
    isAuthenticated: false,
    authRole: null,
    viewSwitcher: (
      <TabsList aria-label="Switch dashboard role">
        <TabsTrigger value="driver">Driver</TabsTrigger>
        <TabsTrigger value="host">Host</TabsTrigger>
      </TabsList>
    ),
  },
};

export default meta;

type Story = StoryObj<typeof Navbar>;

export const Driver: Story = {
  args: {
    isAuthenticated: false,
  },
  render: (args) => (
    <Tabs defaultValue="driver">
      <Navbar {...args} />
    </Tabs>
  ),
};

export const Host: Story = {
  args: {
    isAuthenticated: true,
    authRole: 'host',
  },
  render: (args) => (
    <Tabs defaultValue="host">
      <Navbar {...args} />
    </Tabs>
  ),
};
