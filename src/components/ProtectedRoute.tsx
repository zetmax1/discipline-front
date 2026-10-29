import { Navigate } from 'react-router-dom';
import { isAuthenticated, isDemoMode } from '@/lib/api';

interface Props {
  children: React.ReactNode;
}

/**
 * Wraps routes that require authentication.
 * Allows access if the user is logged in OR in demo mode.
 * Redirects to /login otherwise.
 */
export function ProtectedRoute({ children }: Props) {
  if (!isAuthenticated() && !isDemoMode()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
