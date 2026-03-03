import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '@/lib/api';

interface Props {
  children: React.ReactNode;
}

/**
 * Wraps routes that require authentication.
 * Redirects to /login if the user is not logged in.
 */
export function ProtectedRoute({ children }: Props) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
