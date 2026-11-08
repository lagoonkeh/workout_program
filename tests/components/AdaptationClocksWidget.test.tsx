import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdaptationClocksWidget } from '../../src/components/AdaptationClocksWidget';

describe('AdaptationClocksWidget Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders widget header with science studies subtitle', () => {
    render(<AdaptationClocksWidget />);
    expect(screen.getByText(/Exercise Science & Creator Studies/i)).toBeInTheDocument();
    expect(screen.getByText(/Research-checked/i)).toBeInTheDocument();
  });

  it('renders all 4 study navigation tabs', () => {
    render(<AdaptationClocksWidget />);
    expect(screen.getByTestId('tab-clocks')).toBeInTheDocument();
    expect(screen.getByTestId('tab-ladders')).toBeInTheDocument();
    expect(screen.getByTestId('tab-llp')).toBeInTheDocument();
    expect(screen.getByTestId('tab-feats')).toBeInTheDocument();
  });

  it('renders the 5 adaptation clocks on initial view with Yellow Dude principle', () => {
    render(<AdaptationClocksWidget />);
    expect(screen.getByTestId('clocks-content')).toBeInTheDocument();
    expect(screen.getAllByText(/adapt at one speed/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/1\. Nervous System Adaptation/i)).toBeInTheDocument();
    expect(screen.getByText(/5\. Tendons & Connective Tissue Remodeling/i)).toBeInTheDocument();
  });

  it('switches to 5-rung gate ladders and displays go-in-order note', () => {
    render(<AdaptationClocksWidget />);
    fireEvent.click(screen.getByTestId('tab-ladders'));

    expect(screen.getByTestId('ladders-content')).toBeInTheDocument();
    expect(screen.getByText(/Go in order/i)).toBeInTheDocument();
    expect(screen.getByText(/Standard Push-Up/i)).toBeInTheDocument();
  });

  it('switches to lengthened partials (LLP) tab with Jeff Nippard study summary', () => {
    render(<AdaptationClocksWidget />);
    fireEvent.click(screen.getByTestId('tab-llp'));

    expect(screen.getByTestId('llp-content')).toBeInTheDocument();
    expect(screen.getByText(/Lengthened Partials \(LLPs\), as popularized by Jeff Nippard/i)).toBeInTheDocument();
    expect(screen.getByText(/Not settled/i)).toBeInTheDocument();
  });

  it('switches to Range of Strength feats tab with Lucas Hardie principles', () => {
    render(<AdaptationClocksWidget />);
    fireEvent.click(screen.getByTestId('tab-feats'));

    expect(screen.getByTestId('feats-content')).toBeInTheDocument();
    expect(screen.getByText(/Active Loaded End-Range Strength/i)).toBeInTheDocument();
    expect(screen.getByText(/Flexibility is an active feat of strength/i)).toBeInTheDocument();
  });

  it('supports collapsing and expanding widget with persistent state', () => {
    render(<AdaptationClocksWidget defaultExpanded={true} />);
    const collapseBtn = screen.getByTestId('toggle-studies-collapse-btn');

    expect(screen.getByTestId('tab-clocks')).toBeInTheDocument();

    fireEvent.click(collapseBtn);
    expect(screen.queryByTestId('tab-clocks')).not.toBeInTheDocument();

    fireEvent.click(collapseBtn);
    expect(screen.getByTestId('tab-clocks')).toBeInTheDocument();
  });
});
