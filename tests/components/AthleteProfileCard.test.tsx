// tests/components/AthleteProfileCard.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { AthleteProfileCard } from '../../src/components/AthleteProfileCard';
import { loadProfile } from '../../src/domain/athleteProfile';
import { DEFAULT_BASELINE_ASSESSMENT, STORAGE_KEY_ASSESSMENTS } from '../../src/domain/fitnessAssessment';

const NOW = new Date('2026-10-30T12:00:00');

describe('AthleteProfileCard', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(STORAGE_KEY_ASSESSMENTS, JSON.stringify([DEFAULT_BASELINE_ASSESSMENT]));
  });

  it('shows current bodyweight, age and height from the profile and assessments', () => {
    render(<AthleteProfileCard now={NOW} />);
    expect(screen.getByTestId('profile-current-bw')).toHaveTextContent('168 lb');
    expect(screen.getByTestId('profile-age-height')).toHaveTextContent('35 · 5′6″');
    expect(within(screen.getByTestId('weigh-in-list')).getByText('(test)')).toBeInTheDocument();
  });

  it('logs a weigh-in, shows the change and lets it be deleted', () => {
    render(<AthleteProfileCard now={NOW} />);
    fireEvent.change(screen.getByLabelText('Bodyweight in pounds'), { target: { value: '171.5' } });
    fireEvent.click(screen.getByRole('button', { name: /Log weigh-in/i }));
    expect(screen.getByTestId('profile-current-bw')).toHaveTextContent('171.5 lb');
    expect(screen.getByText(/\+3\.5 lb since 2026-10-21/)).toBeInTheDocument();
    expect(loadProfile().weighIns).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /Delete weigh-in 2026-10-30/ }));
    expect(screen.getByTestId('profile-current-bw')).toHaveTextContent('168 lb');
  });

  it('rejects an impossible weight', () => {
    render(<AthleteProfileCard now={NOW} />);
    fireEvent.change(screen.getByLabelText('Bodyweight in pounds'), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: /Log weigh-in/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/between 70 and 500/);
  });

  it('edits birthday and height', () => {
    render(<AthleteProfileCard now={NOW} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Birthday'), { target: { value: '1990-01-15' } });
    fireEvent.change(screen.getByLabelText('Height feet'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Height inches'), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByTestId('profile-age-height')).toHaveTextContent('36 · 5′8″');
    expect(loadProfile()).toMatchObject({ dob: '1990-01-15', heightInches: 68 });
  });
});
