/**
 * FormField Component Tests
 * STORY-013B: In-App Settings Frontend UI
 *
 * Unit tests for the FormField form component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FormField } from './FormField';

describe('FormField', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('text input rendering', () => {
    it('renders text input with label', () => {
      render(
        <FormField
          label="Name"
          name="name"
          type="text"
          value="Test"
          onChange={mockOnChange}
        />
      );

      expect(screen.getByLabelText('Name')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test')).toBeInTheDocument();
    });

    it('renders with description', () => {
      render(
        <FormField
          label="Name"
          description="Enter your full name"
          name="name"
          type="text"
          value=""
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Enter your full name')).toBeInTheDocument();
    });

    it('renders with placeholder', () => {
      render(
        <FormField
          label="Name"
          name="name"
          type="text"
          value=""
          onChange={mockOnChange}
          placeholder="John Doe"
        />
      );

      expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument();
    });

    it('renders required indicator', () => {
      render(
        <FormField
          label="Name"
          name="name"
          type="text"
          value=""
          onChange={mockOnChange}
          required
        />
      );

      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('renders in disabled state', () => {
      render(
        <FormField
          label="Name"
          name="name"
          type="text"
          value="Test"
          onChange={mockOnChange}
          disabled
        />
      );

      expect(screen.getByLabelText('Name')).toBeDisabled();
    });
  });

  describe('number input', () => {
    it('renders number input', () => {
      render(
        <FormField
          label="Age"
          name="age"
          type="number"
          value={25}
          onChange={mockOnChange}
        />
      );

      const input = screen.getByLabelText('Age');
      expect(input).toHaveAttribute('type', 'number');
      expect(input).toHaveValue(25);
    });

    it('respects min and max values', () => {
      render(
        <FormField
          label="Age"
          name="age"
          type="number"
          value={25}
          onChange={mockOnChange}
          min={18}
          max={100}
        />
      );

      const input = screen.getByLabelText('Age');
      expect(input).toHaveAttribute('min', '18');
      expect(input).toHaveAttribute('max', '100');
    });

    it('calls onChange with number value', () => {
      render(
        <FormField
          label="Age"
          name="age"
          type="number"
          value={25}
          onChange={mockOnChange}
        />
      );

      fireEvent.change(screen.getByLabelText('Age'), { target: { value: '30' } });
      expect(mockOnChange).toHaveBeenCalledWith(30);
    });
  });

  describe('email input', () => {
    it('renders email input', () => {
      render(
        <FormField
          label="Email"
          name="email"
          type="email"
          value="test@example.com"
          onChange={mockOnChange}
        />
      );

      const input = screen.getByLabelText('Email');
      expect(input).toHaveAttribute('type', 'email');
      expect(input).toHaveValue('test@example.com');
    });
  });

  describe('toggle input', () => {
    it('renders toggle switch', () => {
      render(
        <FormField
          label="Enable Feature"
          name="enabled"
          type="toggle"
          value={false}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('shows toggle as on when value is true', () => {
      render(
        <FormField
          label="Enable Feature"
          name="enabled"
          type="toggle"
          value={true}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    });

    it('shows toggle as off when value is false', () => {
      render(
        <FormField
          label="Enable Feature"
          name="enabled"
          type="toggle"
          value={false}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    });

    it('calls onChange with toggled value', () => {
      render(
        <FormField
          label="Enable Feature"
          name="enabled"
          type="toggle"
          value={false}
          onChange={mockOnChange}
        />
      );

      fireEvent.click(screen.getByRole('switch'));
      expect(mockOnChange).toHaveBeenCalledWith(true);
    });

    it('renders toggle with description on the left', () => {
      render(
        <FormField
          label="Enable Feature"
          description="Turn this feature on or off"
          name="enabled"
          type="toggle"
          value={false}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Turn this feature on or off')).toBeInTheDocument();
    });
  });

  describe('select input', () => {
    const options = [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
      { value: 'option3', label: 'Option 3' },
    ];

    it('renders select with options', () => {
      render(
        <FormField
          label="Choice"
          name="choice"
          type="select"
          value="option1"
          onChange={mockOnChange}
          options={options}
        />
      );

      expect(screen.getByLabelText('Choice')).toBeInTheDocument();
      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();
      expect(screen.getByText('Option 3')).toBeInTheDocument();
    });

    it('calls onChange when option is selected', () => {
      render(
        <FormField
          label="Choice"
          name="choice"
          type="select"
          value="option1"
          onChange={mockOnChange}
          options={options}
        />
      );

      fireEvent.change(screen.getByLabelText('Choice'), { target: { value: 'option2' } });
      expect(mockOnChange).toHaveBeenCalledWith('option2');
    });
  });

  describe('textarea input', () => {
    it('renders textarea', () => {
      render(
        <FormField
          label="Description"
          name="description"
          type="textarea"
          value="Some text"
          onChange={mockOnChange}
        />
      );

      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Some text')).toBeInTheDocument();
    });

    it('respects rows prop', () => {
      render(
        <FormField
          label="Description"
          name="description"
          type="textarea"
          value=""
          onChange={mockOnChange}
          rows={5}
        />
      );

      expect(screen.getByLabelText('Description')).toHaveAttribute('rows', '5');
    });
  });

  describe('error handling', () => {
    it('displays error message', () => {
      render(
        <FormField
          label="Name"
          name="name"
          type="text"
          value=""
          onChange={mockOnChange}
          error="This field is required"
        />
      );

      expect(screen.getByText('This field is required')).toBeInTheDocument();
      expect(screen.getByTestId('validation-error')).toBeInTheDocument();
    });

    it('applies error styling to input', () => {
      render(
        <FormField
          label="Name"
          name="name"
          type="text"
          value=""
          onChange={mockOnChange}
          error="This field is required"
        />
      );

      expect(screen.getByLabelText('Name')).toHaveClass('border-red-300');
    });

    it('sets aria-invalid when error is present', () => {
      render(
        <FormField
          label="Name"
          name="name"
          type="text"
          value=""
          onChange={mockOnChange}
          error="This field is required"
        />
      );

      expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
    });

    it('error has role alert', () => {
      render(
        <FormField
          label="Name"
          name="name"
          type="text"
          value=""
          onChange={mockOnChange}
          error="This field is required"
        />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('associates label with input', () => {
      render(
        <FormField
          label="Name"
          name="name"
          type="text"
          value=""
          onChange={mockOnChange}
        />
      );

      const input = screen.getByLabelText('Name');
      expect(input).toBeInTheDocument();
    });

    it('associates description with input via aria-describedby', () => {
      render(
        <FormField
          label="Name"
          description="Enter your name"
          name="name"
          type="text"
          value=""
          onChange={mockOnChange}
        />
      );

      const input = screen.getByLabelText('Name');
      expect(input).toHaveAttribute('aria-describedby');
    });

    it('includes error in aria-describedby', () => {
      render(
        <FormField
          label="Name"
          name="name"
          type="text"
          value=""
          onChange={mockOnChange}
          error="Error message"
        />
      );

      const input = screen.getByLabelText('Name');
      expect(input).toHaveAttribute('aria-describedby');
    });
  });

  describe('custom data-testid', () => {
    it('uses custom data-testid when provided', () => {
      render(
        <FormField
          label="Name"
          name="name"
          type="text"
          value=""
          onChange={mockOnChange}
          data-testid="custom-input"
        />
      );

      expect(screen.getByTestId('custom-input')).toBeInTheDocument();
    });

    it('uses default data-testid format when not provided', () => {
      render(
        <FormField
          label="Name"
          name="test_field"
          type="text"
          value=""
          onChange={mockOnChange}
        />
      );

      expect(screen.getByTestId('setting-input-test_field')).toBeInTheDocument();
    });
  });
});
