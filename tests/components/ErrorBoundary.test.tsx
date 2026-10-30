import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';

const ProblemChild: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test Explosion in Component');
  }
  return <div>Safe Child Content</div>;
};

describe('ErrorBoundary Component', () => {
  const originalLocation = window.location;
  const originalConsoleError = console.error;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    console.error = vi.fn(); // Suppress expected React error boundaries logs

    // Mock window.location.reload
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        reload: vi.fn(),
      },
    });
  });

  afterEach(() => {
    console.error = originalConsoleError;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('renders children normally when no error occurs', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Safe Child Content')).toBeInTheDocument();
    expect(screen.queryByText(/Workout App Recovery/i)).not.toBeInTheDocument();
  });

  it('catches runtime exception and displays recovery UI with error message', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Workout App Recovery/i)).toBeInTheDocument();
    expect(screen.getByText(/Test Explosion in Component/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reload App/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reset & Reload/i })).toBeInTheDocument();
  });

  it('calls window.location.reload when clicking Reload App', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    const reloadBtn = screen.getByRole('button', { name: /Reload App/i });
    fireEvent.click(reloadBtn);

    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });

  it('clears storage and caches before reloading when clicking Reset & Reload', async () => {
    localStorage.setItem('test_key', 'test_val');
    sessionStorage.setItem('test_session', 'session_val');

    const mockDelete = vi.fn().mockResolvedValue(true);
    (window as any).caches = {
      keys: vi.fn().mockResolvedValue(['cache-v1', 'cache-v2']),
      delete: mockDelete,
    };

    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    const resetBtn = screen.getByRole('button', { name: /Reset & Reload/i });
    fireEvent.click(resetBtn);

    expect(localStorage.getItem('test_key')).toBeNull();
    expect(sessionStorage.getItem('test_session')).toBeNull();
    expect(window.location.reload).toHaveBeenCalled();
  });
});
