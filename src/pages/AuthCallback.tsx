import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { setToken } from '../lib/auth';

/**
 * Lands here after a successful OIDC round-trip. The backend redirects to
 * `${FRONTEND_URL}/auth/callback?token=...&expires_at=...&token_type=Bearer`
 * (see controllers/auth.controller.ts -> callback). We just need to persist
 * that token and let the app re-fetch the session.
 */
export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const token = searchParams.get('token');
    if (!token) {
      navigate('/auth/error?msg=No%20authentication%20token%20was%20received', { replace: true });
      return;
    }

    setToken(token);
    queryClient.invalidateQueries({ queryKey: ['session'] });
    navigate('/', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Processing authentication...</p>
      </div>
    </div>
  );
}
