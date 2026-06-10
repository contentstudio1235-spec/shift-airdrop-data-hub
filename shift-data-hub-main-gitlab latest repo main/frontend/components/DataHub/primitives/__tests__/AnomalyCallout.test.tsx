import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { AnomalyCallout } from '../AnomalyCallout';

describe('AnomalyCallout', () => {
  it('renders the message text', () => {
    const { getByText } = render(
      <AnomalyCallout severity="info" message="Activation dropped 12% vs 7d avg" />,
    );
    expect(getByText('Activation dropped 12% vs 7d avg')).toBeTruthy();
  });

  it('renders the info icon with aria-label="info" for info severity', () => {
    const { container } = render(
      <AnomalyCallout severity="info" message="hello" />,
    );
    expect(container.querySelector('[aria-label="info"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="warn"]')).toBeNull();
    expect(container.querySelector('[aria-label="critical"]')).toBeNull();
  });

  it('renders the warning icon with aria-label="warn" for warn severity', () => {
    const { container } = render(
      <AnomalyCallout severity="warn" message="hello" />,
    );
    expect(container.querySelector('[aria-label="warn"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="info"]')).toBeNull();
    expect(container.querySelector('[aria-label="critical"]')).toBeNull();
  });

  it('renders the warning-octagon icon with aria-label="critical" for critical severity', () => {
    const { container } = render(
      <AnomalyCallout severity="critical" message="hello" />,
    );
    expect(container.querySelector('[aria-label="critical"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="info"]')).toBeNull();
    expect(container.querySelector('[aria-label="warn"]')).toBeNull();
  });

  it('renders the CTA as a link when actionLabel + actionHref are provided', () => {
    const { getByText, container } = render(
      <AnomalyCallout
        severity="warn"
        message="Funnel leak"
        actionLabel="Investigate"
        actionHref="/admin/data-hub?view=funnels"
      />,
    );
    expect(getByText('Investigate')).toBeTruthy();
    const link = container.querySelector('a[href="/admin/data-hub?view=funnels"]');
    expect(link).toBeTruthy();
  });

  it('does NOT render a CTA when actionLabel is absent', () => {
    const { queryByText, container } = render(
      <AnomalyCallout
        severity="warn"
        message="No CTA here"
        actionHref="/somewhere"
      />,
    );
    expect(queryByText('Investigate')).toBeNull();
    // No anchor at all
    expect(container.querySelector('a')).toBeNull();
    expect(container.querySelector('button')).toBeNull();
  });

  it('does NOT render a CTA when neither actionHref nor onAction is set', () => {
    const { container } = render(
      <AnomalyCallout severity="info" message="just a message" actionLabel="Go" />,
    );
    // No anchor and no button (dismissible is false)
    expect(container.querySelector('a')).toBeNull();
    expect(container.querySelector('button')).toBeNull();
  });

  it('calls onAction when the CTA button is clicked', () => {
    const onAction = vi.fn();
    const { getByText } = render(
      <AnomalyCallout
        severity="warn"
        message="leak detected"
        actionLabel="Investigate"
        onAction={onAction}
      />,
    );
    fireEvent.click(getByText('Investigate'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('renders a dismiss button when dismissible=true and hides the component on click', () => {
    const { container, getByLabelText, queryByText } = render(
      <AnomalyCallout
        severity="critical"
        message="will be dismissed"
        dismissible
      />,
    );
    expect(queryByText('will be dismissed')).toBeTruthy();
    const dismiss = getByLabelText('Dismiss');
    expect(dismiss).toBeTruthy();

    fireEvent.click(dismiss);

    expect(queryByText('will be dismissed')).toBeNull();
    // Whole wrapper is gone
    expect(container.firstChild).toBeNull();
  });

  it('does NOT render a dismiss button when dismissible is omitted', () => {
    const { queryByLabelText } = render(
      <AnomalyCallout severity="info" message="no dismiss" />,
    );
    expect(queryByLabelText('Dismiss')).toBeNull();
  });

  it('when both actionHref and onAction are provided, actionHref wins and warns in dev', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onAction = vi.fn();
    const { container } = render(
      <AnomalyCallout
        severity="warn"
        message="ambiguous"
        actionLabel="Go"
        actionHref="/x"
        onAction={onAction}
      />,
    );
    // Link branch wins — anchor with href is rendered, not a button.
    const link = container.querySelector('a[href="/x"]');
    expect(link).toBeTruthy();
    expect(link?.textContent).toContain('Go');
    expect(onAction).not.toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('actionHref takes precedence'),
    );
    spy.mockRestore();
  });

  it('wrapper has aria-live="polite" for screen reader announcement', () => {
    const { container } = render(
      <AnomalyCallout severity="info" message="announce me" />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.getAttribute('aria-live')).toBe('polite');
  });
});
