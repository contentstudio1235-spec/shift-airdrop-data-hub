import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import React from 'react';

// Stable session id for fire-and-forget POST assertions.
vi.mock('@/hooks/useHubSession', () => ({
  useHubSession: () => ({
    sessionId: 'test-session-uuid',
    recordEvent: vi.fn(),
  }),
}));

import { FlagButton, FLAG_AFFORDANCE_HOST_CLASS } from '../FlagButton';

const ORIGINAL_FETCH = global.fetch;

describe('FlagButton', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, status: 201, json: () => Promise.resolve({}) }),
    ) as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.useRealTimers();
    global.fetch = ORIGINAL_FETCH;
    vi.restoreAllMocks();
  });

  it('renders the flag icon with opacity 0 by default (hidden in negative space)', () => {
    const { container } = render(
      <div className={FLAG_AFFORDANCE_HOST_CLASS} style={{ position: 'relative' }}>
        <span>1,234</span>
        <FlagButton tab="pulse" metricId="pulse.registeredUsers" displayedValue={1234} />
      </div>,
    );
    const button = container.querySelector('button.flag-button') as HTMLButtonElement;
    expect(button).toBeTruthy();
    // Inline-style fallback opacity is 0 when dialog is closed.
    expect(button.style.opacity).toBe('0');
    // Aria-label includes metric id
    expect(button.getAttribute('aria-label')).toBe('Flag pulse.registeredUsers for review');
    // Dialog NOT rendered
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens the inline dialog with prefilled context on click', () => {
    const { container, queryByText } = render(
      <div className={FLAG_AFFORDANCE_HOST_CLASS} style={{ position: 'relative' }}>
        <span>outer-value-cell</span>
        <FlagButton
          tab="pulse"
          metricId="pulse.aumUSD"
          displayedValue="$13.7K"
          asOf="2026-06-06T12:00:00Z"
        />
      </div>,
    );
    const button = container.querySelector('button.flag-button') as HTMLButtonElement;
    expect(queryByText('pulse.aumUSD')).toBeNull();
    fireEvent.click(button);

    // Dialog appears
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-label')).toBe('Flag metric for review');

    // Context is read-only and pre-filled — assert against dialog text content
    // so we don't collide with the value rendered in the parent cell.
    expect(dialog.textContent).toContain('pulse');
    expect(dialog.textContent).toContain('pulse.aumUSD');
    expect(dialog.textContent).toContain('$13.7K');
    expect(dialog.textContent).toContain('2026-06-06T12:00:00Z');
    // Textarea
    expect(dialog.querySelector('textarea')).toBeTruthy();
  });

  it('"Flag for review" POSTs to /api/hub-trust/flags with the right payload', () => {
    const { container, getByText } = render(
      <div className={FLAG_AFFORDANCE_HOST_CLASS} style={{ position: 'relative' }}>
        <span>430</span>
        <FlagButton
          tab="pulse"
          metricId="pulse.activeHolders"
          displayedValue={430}
          asOf="2026-06-06T11:00:00Z"
        />
      </div>,
    );
    const button = container.querySelector('button.flag-button') as HTMLButtonElement;
    fireEvent.click(button);

    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'jumped 80% in 1h, looks wrong' } });

    const submit = getByText('Flag for review') as HTMLButtonElement;
    fireEvent.click(submit);

    // Fetch was called once with the right URL + payload
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toContain('/api/hub-trust/flags');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string);
    expect(body.tab).toBe('pulse');
    expect(body.metricId).toBe('pulse.activeHolders');
    expect(body.displayedValue).toBe('430');
    expect(body.asOf).toBe('2026-06-06T11:00:00Z');
    expect(body.comment).toBe('jumped 80% in 1h, looks wrong');
    expect(body.sessionId).toBe('test-session-uuid');
  });

  it('closes the dialog and shows a toast for 3s after submission', () => {
    const { container, getByText, queryByText } = render(
      <div className={FLAG_AFFORDANCE_HOST_CLASS} style={{ position: 'relative' }}>
        <span>15,455</span>
        <FlagButton tab="pulse" metricId="pulse.registeredUsers" displayedValue={15455} />
      </div>,
    );
    const button = container.querySelector('button.flag-button') as HTMLButtonElement;
    fireEvent.click(button);
    expect(container.querySelector('[role="dialog"]')).toBeTruthy();

    fireEvent.click(getByText('Flag for review'));

    // Dialog gone
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    // Toast visible
    expect(getByText('Flagged — triage owner notified')).toBeTruthy();

    // After 3s the toast disappears
    act(() => {
      vi.advanceTimersByTime(3001);
    });
    expect(queryByText('Flagged — triage owner notified')).toBeNull();
  });

  it('"Cancel" closes the dialog without firing a POST', () => {
    const { container, getByText } = render(
      <div className={FLAG_AFFORDANCE_HOST_CLASS} style={{ position: 'relative' }}>
        <span>22.0%</span>
        <FlagButton tab="pulse" metricId="pulse.identityLinksPct" displayedValue="22.0%" />
      </div>,
    );
    const button = container.querySelector('button.flag-button') as HTMLButtonElement;
    fireEvent.click(button);
    fireEvent.click(getByText('Cancel'));
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
