import { redirect } from 'next/navigation';

export default function ReferralRedirectPage({ params }: { params: { code: string } }) {
  const { code } = params;

  // Validate code format (alphanumeric with underscores/hyphens, max 50 chars)
  if (!code || !/^[a-zA-Z0-9_-]{1,50}$/.test(code)) {
    redirect('https://loyalty.shiftrwa.xyz');
  }

  // Redirect to SNAG loyalty page with ref param
  redirect(`https://loyalty.shiftrwa.xyz/?ref=${encodeURIComponent(code)}`);
}
