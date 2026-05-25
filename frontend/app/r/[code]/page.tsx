import { redirect } from 'next/navigation';
import { REFERRAL_CODE_PATTERN, normalizeReferralCode, LOYALTY_PAGE_URL } from '@/lib/constants';

export default function ReferralRedirectPage({ params }: { params: { code: string } }) {
  const { code } = params;

  // Validate and normalize code format
  const normalizedCode = normalizeReferralCode(code);

  if (!code || !REFERRAL_CODE_PATTERN.test(normalizedCode)) {
    // Invalid code - redirect to base loyalty page
    redirect(LOYALTY_PAGE_URL());
  }

  // Redirect to SNAG loyalty page with ref param (normalized)
  const loyaltyUrl = LOYALTY_PAGE_URL();
  redirect(`${loyaltyUrl}/?ref=${encodeURIComponent(normalizedCode)}`);
}
