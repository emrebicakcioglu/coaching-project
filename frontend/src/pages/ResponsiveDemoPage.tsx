/**
 * ResponsiveDemoPage
 * STORY-017B: Component Responsiveness
 *
 * Demo page showcasing all responsive components at different breakpoints.
 */

import React, { useState } from 'react';
import {
  ResponsiveSidebar,
  ResponsiveTable,
  ResponsiveForm,
  ResponsiveFormRow,
  ResponsiveFormField,
  FormInput,
  FormSelect,
  FormButton,
  ResponsiveModal,
  ResponsiveNavigation,
  TableColumn,
  NavItem,
} from '../components/responsive';
import { useResponsive } from '../hooks';
import { Container } from '../components/layout';

/**
 * Sample user data for table demo
 */
interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
}

const sampleUsers: User[] = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Editor', status: 'Active' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Viewer', status: 'Inactive' },
  { id: 4, name: 'Alice Brown', email: 'alice@example.com', role: 'Editor', status: 'Active' },
];

const tableColumns: TableColumn<User>[] = [
  { key: 'name', header: 'Name' },
  { key: 'email', header: 'Email' },
  { key: 'role', header: 'Role' },
  {
    key: 'status',
    header: 'Status',
    render: (item) => (
      <span
        className={`
          px-2 py-1 text-xs font-medium rounded-full
          ${
            item.status === 'Active'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }
        `}
      >
        {item.status}
      </span>
    ),
  },
];

/**
 * Navigation items for demo
 */
const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/responsive-demo',
    isActive: true,
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    label: 'Users',
    href: '/users',
    badge: 4,
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
];

/**
 * Demo Logo Component
 */
const Logo: React.FC = () => (
  <div className="flex items-center">
    <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
      <span className="text-white font-bold text-sm">RC</span>
    </div>
    <span className="ml-2 text-lg font-semibold text-neutral-900">
      Responsive
    </span>
  </div>
);

/**
 * Breakpoint Indicator Component
 */
const BreakpointIndicator: React.FC = () => {
  const { breakpoint, width, isMobile, isTablet, isDesktop } = useResponsive();

  return (
    <div
      className="
        fixed bottom-4 right-4
        bg-neutral-900 text-white
        px-3 py-2
        rounded-lg
        text-sm
        z-[9999]
        shadow-lg
      "
      data-testid="breakpoint-indicator-demo"
    >
      <div className="font-mono">
        <span className="text-primary-400">{breakpoint}</span>
        <span className="text-neutral-400 ml-2">({width}px)</span>
      </div>
      <div className="text-xs text-neutral-400 mt-1">
        {isMobile && 'Mobile'}
        {isTablet && 'Tablet'}
        {isDesktop && 'Desktop'}
      </div>
    </div>
  );
};

/**
 * Section Header Component
 */
const SectionHeader: React.FC<{ title: string; description: string }> = ({
  title,
  description,
}) => (
  <div className="mb-6">
    <h2 className="text-xl font-semibold text-neutral-900">{title}</h2>
    <p className="mt-1 text-sm text-neutral-600">{description}</p>
  </div>
);

/**
 * ResponsiveDemoPage Component
 */
const ResponsiveDemoPage: React.FC = () => {
  const { isMobile } = useResponsive();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Form submitted!');
  };

  return (
    <ResponsiveNavigation
      logo={<Logo />}
      items={navItems}
      footer={
        <div className="text-xs text-neutral-500">
          STORY-017B Demo
        </div>
      }
      data-testid="responsive-demo-navigation"
    >
      <div className="min-h-screen bg-neutral-50">
        <Container className="py-8">
          {/* Page Header */}
          <header className="mb-8">
            <h1 className="text-2xl font-bold text-neutral-900">
              Responsive Components Demo
            </h1>
            <p className="mt-2 text-neutral-600">
              STORY-017B: Component Responsiveness - Testing all responsive patterns
            </p>
          </header>

          {/* Main Content */}
          <main className="space-y-12">
            {/* Section 1: Responsive Table */}
            <section data-testid="table-section">
              <SectionHeader
                title="Responsive Table"
                description="Full table on desktop, stacked cards on mobile"
              />
              <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
                <ResponsiveTable<User>
                  columns={tableColumns}
                  data={sampleUsers}
                  keyExtractor={(item: User) => item.id}
                  caption="User list"
                  data-testid="demo-table"
                />
              </div>
            </section>

            {/* Section 2: Responsive Form */}
            <section data-testid="form-section">
              <SectionHeader
                title="Responsive Form"
                description="Multi-column on desktop, single-column on mobile"
              />
              <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
                <ResponsiveForm
                  onSubmit={handleFormSubmit}
                  data-testid="demo-form"
                >
                  <ResponsiveFormRow>
                    <ResponsiveFormField span="half" data-testid="field-firstname">
                      <FormInput
                        name="firstName"
                        label="First Name"
                        placeholder="Enter first name"
                        required
                      />
                    </ResponsiveFormField>
                    <ResponsiveFormField span="half" data-testid="field-lastname">
                      <FormInput
                        name="lastName"
                        label="Last Name"
                        placeholder="Enter last name"
                        required
                      />
                    </ResponsiveFormField>
                  </ResponsiveFormRow>

                  <ResponsiveFormRow>
                    <ResponsiveFormField span="full" data-testid="field-email">
                      <FormInput
                        name="email"
                        label="Email"
                        type="email"
                        placeholder="Enter email address"
                        required
                      />
                    </ResponsiveFormField>
                  </ResponsiveFormRow>

                  <ResponsiveFormRow>
                    <ResponsiveFormField span="half" data-testid="field-role">
                      <FormSelect
                        name="role"
                        label="Role"
                        placeholder="Select a role"
                        options={[
                          { value: 'admin', label: 'Admin' },
                          { value: 'editor', label: 'Editor' },
                          { value: 'viewer', label: 'Viewer' },
                        ]}
                        required
                      />
                    </ResponsiveFormField>
                    <ResponsiveFormField span="half" data-testid="field-status">
                      <FormSelect
                        name="status"
                        label="Status"
                        placeholder="Select status"
                        options={[
                          { value: 'active', label: 'Active' },
                          { value: 'inactive', label: 'Inactive' },
                        ]}
                      />
                    </ResponsiveFormField>
                  </ResponsiveFormRow>

                  <ResponsiveFormRow>
                    <ResponsiveFormField span="third" data-testid="field-phone">
                      <FormInput
                        name="phone"
                        label="Phone"
                        type="tel"
                        placeholder="Phone number"
                      />
                    </ResponsiveFormField>
                    <ResponsiveFormField span="third" data-testid="field-dept">
                      <FormInput
                        name="department"
                        label="Department"
                        placeholder="Department"
                      />
                    </ResponsiveFormField>
                    <ResponsiveFormField span="third" data-testid="field-location">
                      <FormInput
                        name="location"
                        label="Location"
                        placeholder="Location"
                      />
                    </ResponsiveFormField>
                  </ResponsiveFormRow>

                  <div className="flex justify-end gap-3 pt-4">
                    <FormButton variant="outline" data-testid="btn-cancel">
                      Cancel
                    </FormButton>
                    <FormButton
                      type="submit"
                      variant="primary"
                      data-testid="btn-submit"
                    >
                      Submit
                    </FormButton>
                  </div>
                </ResponsiveForm>
              </div>
            </section>

            {/* Section 3: Responsive Modal */}
            <section data-testid="modal-section">
              <SectionHeader
                title="Responsive Modal"
                description="Standard modal on desktop, fullscreen on mobile"
              />
              <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
                <FormButton
                  onClick={() => setModalOpen(true)}
                  data-testid="open-modal-btn"
                >
                  Open Modal
                </FormButton>

                <ResponsiveModal
                  isOpen={modalOpen}
                  onClose={() => setModalOpen(false)}
                  title="Edit User Profile"
                  description="A modal dialog to edit user profile information"
                  data-testid="demo-modal"
                  footer={
                    <div className="flex justify-end gap-3">
                      <FormButton
                        variant="outline"
                        onClick={() => setModalOpen(false)}
                        data-testid="modal-cancel"
                      >
                        Cancel
                      </FormButton>
                      <FormButton
                        variant="primary"
                        onClick={() => setModalOpen(false)}
                        data-testid="modal-save"
                      >
                        Save Changes
                      </FormButton>
                    </div>
                  }
                >
                  <div className="space-y-4">
                    <p className="text-neutral-600">
                      This modal displays as a standard centered dialog on desktop
                      and as a fullscreen view on mobile devices.
                    </p>
                    <FormInput
                      name="modalName"
                      label="Name"
                      placeholder="Enter name"
                    />
                    <FormInput
                      name="modalEmail"
                      label="Email"
                      type="email"
                      placeholder="Enter email"
                    />
                  </div>
                </ResponsiveModal>
              </div>
            </section>

            {/* Section 4: Standalone Sidebar Demo */}
            <section data-testid="sidebar-section">
              <SectionHeader
                title="Responsive Sidebar"
                description="Fixed sidebar on desktop, overlay drawer on mobile"
              />
              <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
                <p className="text-neutral-600 mb-4">
                  On mobile, click the button below to open the sidebar overlay.
                  On desktop, the sidebar is always visible in the navigation.
                </p>
                {isMobile && (
                  <FormButton
                    onClick={() => setSidebarOpen(true)}
                    data-testid="open-sidebar-btn"
                  >
                    Open Sidebar
                  </FormButton>
                )}
                <ResponsiveSidebar
                  isOpen={sidebarOpen}
                  onClose={() => setSidebarOpen(false)}
                  header={<Logo />}
                  data-testid="demo-sidebar"
                >
                  <nav className="space-y-2">
                    {navItems.map((item, index) => (
                      <a
                        key={item.href}
                        href={item.href}
                        className="
                          flex items-center
                          min-h-[44px]
                          px-3 py-2
                          rounded-md
                          text-sm font-medium
                          text-neutral-600
                          hover:text-neutral-900
                          hover:bg-neutral-100
                        "
                        data-testid={`sidebar-item-${index}`}
                      >
                        {item.icon && (
                          <span className="w-5 h-5 mr-3">{item.icon}</span>
                        )}
                        {item.label}
                      </a>
                    ))}
                  </nav>
                </ResponsiveSidebar>
              </div>
            </section>

            {/* Section 5: Touch Targets */}
            <section data-testid="touch-targets-section">
              <SectionHeader
                title="Touch-Friendly Targets"
                description="All interactive elements have minimum 44x44px touch targets"
              />
              <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
                <div className="flex flex-wrap gap-4">
                  <FormButton
                    variant="primary"
                    size="sm"
                    data-testid="touch-btn-sm"
                  >
                    Small (36px min)
                  </FormButton>
                  <FormButton
                    variant="primary"
                    size="md"
                    data-testid="touch-btn-md"
                  >
                    Medium (44px min)
                  </FormButton>
                  <FormButton
                    variant="primary"
                    size="lg"
                    data-testid="touch-btn-lg"
                  >
                    Large (52px min)
                  </FormButton>
                </div>
                <p className="mt-4 text-sm text-neutral-500">
                  Medium and Large buttons meet the 44x44px WCAG minimum touch target size.
                </p>
              </div>
            </section>
          </main>
        </Container>

        {/* Breakpoint Indicator */}
        <BreakpointIndicator />
      </div>
    </ResponsiveNavigation>
  );
};

export default ResponsiveDemoPage;
