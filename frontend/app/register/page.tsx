import { Suspense } from 'react';
import RegisterContent from './RegisterContent';

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="page fade-in" style={{ textAlign: 'center', padding: '60px 24px' }}>Loading...</div>}>
      <RegisterContent />
    </Suspense>
  );
}
