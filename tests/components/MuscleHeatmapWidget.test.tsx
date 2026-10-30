// tests/components/MuscleHeatmapWidget.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MuscleHeatmapWidget } from '../../src/components/MuscleHeatmapWidget';
import { CompletedWorkoutSession } from '../../src/storage/storageManager';

describe('MuscleHeatmapWidget', () => {
  it('renders widget title, legend, and view controls', () => {
    render(<MuscleHeatmapWidget />);

    expect(screen.getByText('Anatomical Muscle Fatigue & Recovery Heatmap')).toBeInTheDocument();
    expect(screen.getByText(/Fresh \(48h\+\)/)).toBeInTheDocument();
    expect(screen.getByText(/Recovering \(24–48h\)/)).toBeInTheDocument();
    expect(screen.getByText(/Fatigued \(<24h\)/)).toBeInTheDocument();

    expect(screen.getByTestId('heatmap-view-both')).toBeInTheDocument();
    expect(screen.getByTestId('heatmap-view-front')).toBeInTheDocument();
    expect(screen.getByTestId('heatmap-view-back')).toBeInTheDocument();
  });

  it('allows switching views between Both, Front, and Back', () => {
    render(<MuscleHeatmapWidget />);

    // By default, Both shows Anterior and Posterior
    expect(screen.getByText('Anterior (Front)')).toBeInTheDocument();
    expect(screen.getByText('Posterior (Back)')).toBeInTheDocument();

    // Switch to Front Only
    fireEvent.click(screen.getByTestId('heatmap-view-front'));
    expect(screen.getByText('Anterior (Front)')).toBeInTheDocument();
    expect(screen.queryByText('Posterior (Back)')).not.toBeInTheDocument();

    // Switch to Back Only
    fireEvent.click(screen.getByTestId('heatmap-view-back'));
    expect(screen.queryByText('Anterior (Front)')).not.toBeInTheDocument();
    expect(screen.getByText('Posterior (Back)')).toBeInTheDocument();

    // Switch back to Both
    fireEvent.click(screen.getByTestId('heatmap-view-both'));
    expect(screen.getByText('Anterior (Front)')).toBeInTheDocument();
    expect(screen.getByText('Posterior (Back)')).toBeInTheDocument();
  });

  it('selects muscle and displays deep-dive inspector when clicked', () => {
    render(<MuscleHeatmapWidget />);

    // Default selected muscle is chest
    expect(screen.getByText('Chest (Pectorals)')).toBeInTheDocument();
    expect(screen.getByText('upper Body')).toBeInTheDocument();

    // Click on Quads path
    const quadsPath = screen.getByTestId('muscle-path-quads');
    fireEvent.click(quadsPath);

    expect(screen.getByText('Quadriceps (VMO)')).toBeInTheDocument();
    expect(screen.getByText('lower Body')).toBeInTheDocument();

    // Click on Hamstrings path
    const hamstringsPath = screen.getByTestId('muscle-path-hamstrings');
    fireEvent.click(hamstringsPath);

    expect(screen.getByText('Hamstrings & Posterior Chain')).toBeInTheDocument();
  });

  it('updates muscle shading and recovery gauge based on workout history', () => {
    const recentSession: CompletedWorkoutSession = {
      sessionId: 'lower_a',
      date: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4h ago
      logs: {
        t1_squat: { completed: true, weight: 225, reps: 3, notes: '' },
      },
    };

    render(<MuscleHeatmapWidget history={[recentSession]} />);

    // Click on quads to inspect
    fireEvent.click(screen.getByTestId('muscle-path-quads'));

    // Quads inspector status should be Fatigued
    const statusBadge = screen.getByTestId('muscle-inspector-status');
    expect(statusBadge).toHaveTextContent('Fatigued');
    expect(screen.getAllByText(/4h ago/).length).toBeGreaterThan(0);
  });
});
