import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ReconciliationBadge } from '../ReconciliationBadge';
import { HUB_METRIC_IDS } from '@/lib/hubMetricIds';

describe('ReconciliationBadge', () => {
  it('renders the check icon when metricId is in the reconciliation catalog', () => {
    render(<ReconciliationBadge metricId={HUB_METRIC_IDS.PULSE_REGISTERED_USERS} />);
    expect(screen.getByLabelText(/reconciled against second source/i)).toBeInTheDocument();
  });

  it('renders nothing when metricId is not in catalog', () => {
    const { container } = render(<ReconciliationBadge metricId="random.metric" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when metricId is undefined', () => {
    const { container } = render(<ReconciliationBadge metricId={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});
