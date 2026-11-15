// tests/components/MobilityTrackerWidget.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MobilityTrackerWidget } from '../../src/components/MobilityTrackerWidget';
import { storageManager } from '../../src/storage/storageManager';

describe('MobilityTrackerWidget Component', () => {
  beforeEach(() => {
    storageManager.clear();
  });

  it('renders all 7 protocol tab selector buttons including Lucas Hardie protocols', () => {
    render(<MobilityTrackerWidget />);
    expect(screen.getByRole('tab', { name: /Elephant Walks/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Knee-to-Wall/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Split Squat Elevation/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Biering-Sørensen/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Dead Hang/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Pancake Split/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Loaded Jefferson Curl/i })).toBeInTheDocument();
  });

  it('switches active protocol details when clicking a tab', () => {
    render(<MobilityTrackerWidget />);
    fireEvent.click(screen.getByRole('tab', { name: /Knee-to-Wall/i }));
    expect(screen.getAllByText(/Knee-to-Wall Ankle Dorsiflexion Test/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Talocrural Joint & Soleus Muscle/i).length).toBeGreaterThanOrEqual(1);
  });

  it('displays real-time live benchmark classification badge as user types', async () => {
    render(<MobilityTrackerWidget />);
    // Select Elephant Walk (Level 1 to 5)
    fireEvent.click(screen.getByRole('tab', { name: /Elephant Walks/i }));

    const input = screen.getByPlaceholderText(/Level \(1–5\)/i) as HTMLInputElement;

    fireEvent.change(input, { target: { value: '5' } });
    expect(await screen.findByText(/Exceptional: Palms Flat on Floor/i)).toBeInTheDocument();

    fireEvent.change(input, { target: { value: '1' } });
    expect(await screen.findByText(/Restricted: Mid-Shin/i)).toBeInTheDocument();
  });

  it('rejects invalid inputs with a descriptive error message', () => {
    render(<MobilityTrackerWidget />);
    fireEvent.click(screen.getByRole('tab', { name: /Elephant Walks/i }));

    const input = screen.getByPlaceholderText(/Level \(1–5\)/i);
    fireEvent.change(input, { target: { value: '9' } }); // invalid level

    const submitBtn = screen.getByRole('button', { name: /Save Measurement/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/between 1 and 5/i)).toBeInTheDocument();
  });

  it('successfully logs a new measurement and updates recent logs table', async () => {
    render(<MobilityTrackerWidget />);
    fireEvent.click(screen.getByRole('tab', { name: /Elephant Walks/i }));

    const input = screen.getByPlaceholderText(/Level \(1–5\)/i);
    fireEvent.change(input, { target: { value: '4' } });

    const notesInput = screen.getByPlaceholderText(/e\.g\. Pain-free/i);
    fireEvent.change(notesInput, { target: { value: 'Knuckles touching cleanly' } });

    const submitBtn = screen.getByRole('button', { name: /Save Measurement/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Knuckles touching cleanly/i)).toBeInTheDocument();
      expect(screen.getByText(/Measurement Logged!/i)).toBeInTheDocument();
    });

    // Check persistence
    const saved = storageManager.load();
    expect(saved.mobilityHistory).toHaveLength(1);
    expect(saved.mobilityHistory[0].value).toBe(4);
  });

  it('allows deleting an entry from recent assessment logs', async () => {
    storageManager.addMobilityEntry({
      testId: 'elephant-walk',
      value: 3,
      date: '2026-10-13T08:00:00Z',
      notes: 'Initial test',
    });

    // Mock confirm
    vi.spyOn(window, 'confirm').mockImplementation(() => true);

    render(<MobilityTrackerWidget />);
    expect(screen.getByText(/Initial test/i)).toBeInTheDocument();

    const deleteBtn = screen.getByTitle(/Delete entry/i);
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Initial test/i)).not.toBeInTheDocument();
    });
    expect(storageManager.load().mobilityHistory).toHaveLength(0);
  });

  it('allows editing an existing entry in recent assessment logs', async () => {
    storageManager.addMobilityEntry({
      testId: 'elephant-walk',
      value: 3,
      date: '2026-10-13T08:00:00Z',
      notes: 'Initial test notes',
    });

    render(<MobilityTrackerWidget />);
    expect(screen.getByText(/Initial test notes/i)).toBeInTheDocument();

    // Click edit button
    const editBtn = screen.getByTitle(/Edit entry/i);
    fireEvent.click(editBtn);

    // Edit form appears with prefilled data
    expect(screen.getByText(/Edit Assessment Log/i)).toBeInTheDocument();
    const valInput = screen.getByLabelText(/Edit Measurement Value/i);
    expect(valInput).toHaveValue(3);

    // Change value and notes
    fireEvent.change(valInput, { target: { value: '5' } });
    const notesInput = screen.getByLabelText(/Edit Clinical Notes/i);
    fireEvent.change(notesInput, { target: { value: 'Updated to full palms flat!' } });

    // Save changes
    const saveBtn = screen.getByRole('button', { name: /Save edited measurement/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText(/Updated to full palms flat!/i)).toBeInTheDocument();
      expect(screen.queryByText(/Initial test notes/i)).not.toBeInTheDocument();
    });

    const saved = storageManager.load();
    expect(saved.mobilityHistory[0].value).toBe(5);
    expect(saved.mobilityHistory[0].notes).toBe('Updated to full palms flat!');
  });

  it('allows canceling edit mode without saving changes', async () => {
    storageManager.addMobilityEntry({
      testId: 'elephant-walk',
      value: 3,
      date: '2026-10-13T08:00:00Z',
      notes: 'Keep me unchanged',
    });

    render(<MobilityTrackerWidget />);
    const editBtn = screen.getByTitle(/Edit entry/i);
    fireEvent.click(editBtn);

    const valInput = screen.getByLabelText(/Edit Measurement Value/i);
    fireEvent.change(valInput, { target: { value: '5' } });

    const cancelBtn = screen.getByRole('button', { name: /Cancel editing/i });
    fireEvent.click(cancelBtn);

    expect(screen.queryByText(/Edit Assessment Log/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Keep me unchanged/i)).toBeInTheDocument();

    const saved = storageManager.load();
    expect(saved.mobilityHistory[0].value).toBe(3);
  });

  it('supports collapsing and expanding main card, protocol overview, form, and history logs', () => {
    render(<MobilityTrackerWidget />);

    // Initially all expanded
    expect(screen.getByText(/^Latest Score$/i)).toBeInTheDocument();
    expect(screen.getByText(/Log New Measurement/i)).toBeInTheDocument();
    expect(screen.getByText(/Recent Assessment Logs/i)).toBeInTheDocument();

    // 1. Collapse Protocol Overview card
    const collapseOverviewBtn = screen.getByRole('button', { name: /Collapse protocol overview/i });
    fireEvent.click(collapseOverviewBtn);
    expect(screen.queryByText(/^Latest Score$/i)).not.toBeInTheDocument();

    // Expand Protocol Overview card
    const expandOverviewBtn = screen.getByRole('button', { name: /Expand protocol overview/i });
    fireEvent.click(expandOverviewBtn);
    expect(screen.getByText(/^Latest Score$/i)).toBeInTheDocument();

    // 2. Collapse Form card
    const collapseFormBtn = screen.getByRole('button', { name: /Collapse measurement form/i });
    fireEvent.click(collapseFormBtn);
    expect(screen.queryByRole('button', { name: /Save Measurement/i })).not.toBeInTheDocument();

    // Expand Form card
    const expandFormBtn = screen.getByRole('button', { name: /Expand measurement form/i });
    fireEvent.click(expandFormBtn);
    expect(screen.getByRole('button', { name: /Save Measurement/i })).toBeInTheDocument();

    // 3. Collapse Recent Logs card
    const collapseHistoryBtn = screen.getByRole('button', { name: /Collapse recent assessment logs/i });
    fireEvent.click(collapseHistoryBtn);
    expect(screen.queryByText(/No entries logged yet for this assessment/i)).not.toBeInTheDocument();

    // Expand Recent Logs card
    const expandHistoryBtn = screen.getByRole('button', { name: /Expand recent assessment logs/i });
    fireEvent.click(expandHistoryBtn);
    expect(screen.getByText(/No entries logged yet for this assessment/i)).toBeInTheDocument();

    // 4. Collapse Entire Mobility Tracker Main Card
    const collapseMainBtn = screen.getByRole('button', { name: /Collapse mobility tracker/i });
    fireEvent.click(collapseMainBtn);
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();

    // Expand Entire Mobility Tracker Main Card
    const expandMainBtn = screen.getByRole('button', { name: /Expand mobility tracker/i });
    fireEvent.click(expandMainBtn);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('correctly classifies Pancake Split and Jefferson Curl live benchmark preview badges', async () => {
    render(<MobilityTrackerWidget />);

    // Test Pancake Split (0 inches = Exceptional)
    fireEvent.click(screen.getByRole('tab', { name: /Pancake Split/i }));
    const pancakeInput = screen.getByPlaceholderText(/Enter inches/i);
    fireEvent.change(pancakeInput, { target: { value: '0' } });
    expect(await screen.findByText(/Exceptional: 0 in \(Chest Flat on Floor/i)).toBeInTheDocument();

    // Test Jefferson Curl (4 inches = Exceptional)
    fireEvent.click(screen.getByRole('tab', { name: /Loaded Jefferson Curl/i }));
    const jcInput = screen.getByPlaceholderText(/Enter inches/i);
    fireEvent.change(jcInput, { target: { value: '4' } });
    expect(await screen.findByText(/Exceptional: ≥ 4.0 in \(Wrists Below Toes/i)).toBeInTheDocument();
  });
});

