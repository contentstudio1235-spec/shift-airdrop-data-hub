import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { AnalyticsRedirectCard } from '@/components/DataHub/engineering/AnalyticsRedirectCard';

const GA4_URL =
  'https://analytics.google.com/analytics/web/#/p536531221/reports/dashboard';

describe('AnalyticsRedirectCard', () => {
  it('renders the heading explaining GA4 native is authoritative', () => {
    const { getByText } = render(<AnalyticsRedirectCard />);
    expect(getByText('GA4 data lives in GA4 native')).toBeTruthy();
  });

  it('renders the body copy explaining the trust collision rationale', () => {
    const { getByText } = render(<AnalyticsRedirectCard />);
    expect(
      getByText(/Session metrics, page views, channel attribution/),
    ).toBeTruthy();
  });

  it('renders the primary CTA to open GA4 with the correct href and new-tab attrs', () => {
    const { getByText } = render(<AnalyticsRedirectCard />);
    const cta = getByText('Open GA4 dashboard').closest('a');
    expect(cta).toBeTruthy();
    expect(cta?.getAttribute('href')).toBe(GA4_URL);
    expect(cta?.getAttribute('target')).toBe('_blank');
    expect(cta?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('renders the "What the Hub uniquely produces" sub-section header', () => {
    const { getByText } = render(<AnalyticsRedirectCard />);
    expect(getByText('What the Hub uniquely produces')).toBeTruthy();
  });

  it('renders the 3 bullet links pointing to the correct hub views', () => {
    const { getByText } = render(<AnalyticsRedirectCard />);

    const attributionLink = getByText('Channel × on-chain holding').closest('a');
    expect(attributionLink).toBeTruthy();
    expect(attributionLink?.getAttribute('href')).toBe(
      '/admin/data-hub?view=attribution',
    );

    const usersLink = getByText(
      'Identity stitch (wallet ↔ Twitter ↔ Snag)',
    ).closest('a');
    expect(usersLink).toBeTruthy();
    expect(usersLink?.getAttribute('href')).toBe('/admin/data-hub?view=users');

    const cohortsLink = getByText('Cohort retention by signup week').closest('a');
    expect(cohortsLink).toBeTruthy();
    expect(cohortsLink?.getAttribute('href')).toBe(
      '/admin/data-hub?view=cohorts',
    );
  });

  it('renders exactly 4 anchor elements (1 CTA + 3 bullet links)', () => {
    const { container } = render(<AnalyticsRedirectCard />);
    const anchors = container.querySelectorAll('a');
    expect(anchors.length).toBe(4);
  });
});
