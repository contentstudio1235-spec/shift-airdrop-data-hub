import { Metadata } from 'next';
import ReferralContent from './ReferralContent';

export const metadata: Metadata = {
  title: 'Referral Dashboard | SHIFT Airdrop',
  description: 'Earn Position SP from referrals. Track your referred users, commissions, and leaderboard rank.',
};

export default function ReferralPage() {
  return <ReferralContent />;
}
