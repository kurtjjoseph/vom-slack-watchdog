import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // In production, this would call your backend auth endpoint
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      login(data.token, data.workspaceId, data.userId);
      navigate('/');
    } catch (err) {
      setError('Invalid email or password');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSlackLogin = () => {
    const clientId = import.meta.env.VITE_SLACK_CLIENT_ID;
    const redirectUri = import.meta.env.VITE_SLACK_REDIRECT_URI || window.location.origin + '/slack/callback';
    const scope = 'chat:write,channels:read,users:read';

    const authUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scope}&redirect_uri=${redirectUri}`;
    window.location.href = authUrl;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-vom-navy to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Watchdog</h1>
          <p className="text-blue-200">VOM Slack Anomaly Detection</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Slack Login */}
          <button
            onClick={handleSlackLogin}
            className="w-full mb-6 px-4 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.528 2.528 0 0 1 2.524 2.52v6.31A2.529 2.529 0 0 1 8.834 24a2.529 2.529 0 0 1-2.521-2.525v-6.31zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.524H2.524A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.524-2.521h6.31zM18.958 8.834a2.528 2.528 0 0 1 2.521-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.521 2.524h-2.521V8.834zM17.687 8.834a2.528 2.528 0 0 1-2.521-2.521 2.528 2.528 0 0 1 2.521-2.521h6.31A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.524 2.524h-6.31zM15.165 18.958a2.528 2.528 0 0 1 2.521 2.521A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.521v-2.521h2.52zM15.165 17.687a2.527 2.527 0 0 1-2.52-2.521 2.528 2.528 0 0 1 2.52-2.524h6.31a2.529 2.529 0 0 1 2.525 2.524 2.529 2.529 0 0 1-2.525 2.521h-6.31z" />
            </svg>
            Sign in with Slack
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with email</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-vom-orange focus:border-transparent outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-vom-orange focus:border-transparent outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 bg-vom-orange text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Demo Mode Notice */}
          <div className="mt-6 p-4 rounded-lg bg-blue-50">
            <p className="text-sm text-blue-800">
              <strong>Demo Mode:</strong> For development, use any email and password "demo"
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-blue-200 text-sm">
          <p>VOM Slack Watchdog © 2024</p>
        </div>
      </div>
    </div>
  );
}
