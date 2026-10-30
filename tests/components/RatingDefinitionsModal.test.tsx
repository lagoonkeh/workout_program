// tests/components/RatingDefinitionsModal.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  RatingDefinitionsModal,
  RATING_SECTIONS,
} from '../../src/components/RatingDefinitionsModal';

describe('RatingDefinitionsModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <RatingDefinitionsModal isOpen={false} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal dialog with header, tabs, search bar, and terms when isOpen is true', () => {
    render(<RatingDefinitionsModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Rating Terms & Clinical Scale Definitions/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search terms, pain scores, RPE, or clinical guidance/i)).toBeInTheDocument();

    // Verifies all 6 category tabs
    expect(screen.getByRole('tab', { name: /All Terms/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Knee Discomfort/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Hamstring Tightness/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Energy & CNS/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Sleep Quality/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Readiness Tiers/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /RPE & RIR/i })).toBeInTheDocument();
  });

  it('switches tabs and filters sections appropriately', () => {
    render(<RatingDefinitionsModal isOpen={true} onClose={vi.fn()} initialTab="knee" />);

    // Initially on Knee tab
    expect(screen.getByRole('tab', { name: /Knee Discomfort/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(/Knee Tendon Discomfort \(0–10 Scale\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Iron Knees \(Pain-Free \/ Fully Prepared\)/i)).toBeInTheDocument();
    expect(screen.queryByText(/Sleep Quality & Recovery \(1–10 Scale\)/i)).not.toBeInTheDocument();

    // Click Sleep tab
    const sleepTab = screen.getByRole('tab', { name: /Sleep Quality/i });
    fireEvent.click(sleepTab);
    expect(sleepTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(/Sleep Quality & Recovery \(1–10 Scale\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Peak Cellular Repair \(8\.5\+ Hours\)/i)).toBeInTheDocument();
    expect(screen.queryByText(/Knee Tendon Discomfort \(0–10 Scale\)/i)).not.toBeInTheDocument();

    // Click RPE tab
    const rpeTab = screen.getByRole('tab', { name: /RPE & RIR/i });
    fireEvent.click(rpeTab);
    expect(rpeTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(/RPE & Reps in Reserve \(RIR Scale\)/i)).toBeInTheDocument();
    expect(screen.getByText(/2 Reps in Reserve \(RIR 2 \/ Standard Hypertrophy\)/i)).toBeInTheDocument();
    expect(screen.getByTestId('rpe-calibration-anchor-callout')).toBeInTheDocument();
    expect(screen.getByText(/High-Rep RIR Distortion Anchor \(Zourdos et al\. & Halperin et al\.\)/i)).toBeInTheDocument();
    expect(screen.getByText(/High-Rep RIR Anchoring Rule \(Zourdos & Halperin 2023\/2024\)/i)).toBeInTheDocument();
  });

  it('filters terms in real time using the search input', () => {
    render(<RatingDefinitionsModal isOpen={true} onClose={vi.fn()} />);

    const searchInput = screen.getByPlaceholderText(/Search terms, pain scores, RPE, or clinical guidance/i);
    fireEvent.change(searchInput, { target: { value: 'patellar' } });

    // Should match Knee section terms
    expect(screen.getByText(/Knee Tendon Discomfort \(0–10 Scale\)/i)).toBeInTheDocument();
    expect(screen.queryByText(/Sleep Quality & Recovery \(1–10 Scale\)/i)).not.toBeInTheDocument();

    // Search query with no matches
    fireEvent.change(searchInput, { target: { value: 'nonexistenttermxyz' } });
    expect(screen.getByText(/No rating definitions found/i)).toBeInTheDocument();
  });

  it('calls onClose when clicking the top close button or bottom close button', () => {
    const onCloseMock = vi.fn();
    render(<RatingDefinitionsModal isOpen={true} onClose={onCloseMock} />);

    const closeBtn = screen.getByRole('button', { name: /Close rating definitions modal/i });
    fireEvent.click(closeBtn);
    expect(onCloseMock).toHaveBeenCalledTimes(1);

    const bottomCloseBtn = screen.getByRole('button', { name: /Close Guide/i });
    fireEvent.click(bottomCloseBtn);
    expect(onCloseMock).toHaveBeenCalledTimes(2);
  });

  it('calls onClose when pressing the Escape key', () => {
    const onCloseMock = vi.fn();
    render(<RatingDefinitionsModal isOpen={true} onClose={onCloseMock} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('provides complete data integrity across all RATING_SECTIONS', () => {
    expect(RATING_SECTIONS.length).toBe(6);

    RATING_SECTIONS.forEach((section) => {
      expect(section.title).toBeTruthy();
      expect(section.scaleDescription).toBeTruthy();
      expect(section.scientificFoundation).toBeTruthy();
      expect(section.terms.length).toBeGreaterThanOrEqual(4);

      section.terms.forEach((term) => {
        expect(term.rating).toBeTruthy();
        expect(term.title).toBeTruthy();
        expect(term.clinicalMeaning).toBeTruthy();
        expect(term.trainingAction).toBeTruthy();
        expect(term.badgeColor).toBeTruthy();
      });
    });
  });
});
