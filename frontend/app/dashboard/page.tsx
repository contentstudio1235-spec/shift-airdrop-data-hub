import { redirect } from 'next/navigation';

// Legacy route — redirect to new airdrop page
export default function Dashboard() {
  redirect('/airdrop');
}
