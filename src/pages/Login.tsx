import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, Mail, Lock } from 'lucide-react';
import { auth } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to login with email');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to login with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8 bg-white p-10 rounded-3xl shadow-sm border border-slate-100"
      >
        <div>
          <div className="flex justify-center">
             <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center">
                <Leaf className="h-6 w-6 text-white" />
             </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-800 tracking-tight">
            Sign in to Climora
          </h2>
          <p className="mt-2 text-center text-sm font-medium text-slate-500 tracking-wide">
            Secure access to environmental data
          </p>
        </div>

        <div className="space-y-6 mt-8">
          {error && <div className="text-rose-600 text-sm font-bold bg-rose-50 p-3 rounded-xl">{error}</div>}

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="mt-1 appearance-none relative w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm text-slate-800 font-medium"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="mt-1 appearance-none relative w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm text-slate-800 font-medium"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 shadow-md shadow-emerald-200/50 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500 font-medium">Or</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center py-3 px-4 border border-slate-200 rounded-xl shadow-sm bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 focus:outline-none transition-colors"
          >
            <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Sign in with Google
          </button>
        </div>
        
        <div className="text-center text-sm mt-6 pb-2">
           <Link to="/register" className="text-emerald-600 hover:text-emerald-700 font-bold tracking-wide">
             Don't have an account? Sign up
           </Link>
        </div>

      </motion.div>
    </div>
  );
}
