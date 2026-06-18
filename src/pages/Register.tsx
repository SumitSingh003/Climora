import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, User, Mail, Lock } from 'lucide-react';
import { auth } from '../lib/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Immediately set their display name in auth
      await updateProfile(userCredential.user, { displayName: name });
      
      // Initialize their Firestore user profile doc
      const docRef = doc(db, 'users', userCredential.user.uid);
      await setDoc(docRef, {
        uid: userCredential.user.uid,
        displayName: name,
        email: email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // The auth listener in App/AuthContext will catch the transition and login
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full space-y-8 bg-white p-10 rounded-3xl shadow-sm border border-slate-100"
      >
        <div>
           <div className="flex justify-center">
             <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center">
               <Leaf className="h-6 w-6 text-white" />
             </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-800 tracking-tight">
            Create an account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleRegister}>
          {error && <div className="text-rose-600 text-sm font-bold bg-rose-50 p-3 rounded-xl">{error}</div>}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                   <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  className="mt-1 appearance-none relative w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm text-slate-800 font-medium"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
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
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 shadow-md shadow-emerald-200/50 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </div>
        </form>
        <div className="text-center text-sm">
           <Link to="/login" className="text-emerald-600 hover:text-emerald-700 font-bold tracking-wide">
             Already have an account? Sign in
           </Link>
        </div>
      </motion.div>
    </div>
  );
}
