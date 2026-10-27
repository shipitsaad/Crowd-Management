// Server Component — exports instant = false so Next.js skips instant-navigation
// validation for the entire (protected) subtree. The actual layout logic lives in
// client-layout.tsx, which uses client-side auth state that can't be prerendered.
export const instant = false;

import ProtectedClientLayout from './client-layout';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedClientLayout>{children}</ProtectedClientLayout>;
}
