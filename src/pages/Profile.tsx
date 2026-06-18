import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { User, HeartPulse } from 'lucide-react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user, profile: authProfile, refreshProfile, needsProfileSetup } = useAuth();
  const [profile, setProfile] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (authProfile) {
        setProfile(authProfile);
      } else {
        setProfile({
          displayName: user.displayName || '',
          email: user.email || '',
          phoneNumber: user.phoneNumber || ''
        });
      }
      setLoading(false);
    }
  }, [user, authProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage('');
    try {
      const docRef = doc(db, 'users', user.uid);
      const isNew = needsProfileSetup || !authProfile;

      const payload: any = {
        displayName: profile.displayName || '',
        email: profile.email || '',
        phoneNumber: profile.phoneNumber || '',
        age: profile.age || '',
        height: profile.height || '',
        weight: profile.weight || '',
        bloodGroup: profile.bloodGroup || '',
        medicalConditions: profile.medicalConditions || [],
        updatedAt: serverTimestamp()
      };
      
      if (isNew) {
        payload.uid = user.uid;
        payload.createdAt = serverTimestamp();
      }

      await setDoc(docRef, payload, { merge: true });
      await refreshProfile();
      setMessage('Profile updated successfully');
      
      if (needsProfileSetup) {
        navigate('/');
      }
    } catch (err) {
      console.error(err);
      setMessage('Failed to update profile. Check permissions.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400 font-medium">Loading profile...</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-6">
      
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">
          {needsProfileSetup ? 'Setup Profile' : 'User Profile'}
        </h1>
        <p className="text-slate-400">
          {needsProfileSetup ? 'Please complete your profile to continue' : 'Manage your personal and medical information'}
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* [... HTML content intact but updated for profile properties ...] */}
        <div className="bg-white shadow-sm rounded-3xl border border-slate-100 overflow-hidden">
           <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center">
              <User className="h-5 w-5 text-slate-400 mr-2" />
              <h2 className="text-lg font-semibold text-slate-800">Personal Information</h2>
           </div>
           <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-500 uppercase tracking-wide">Full Name</label>
                <input required type="text" value={profile.displayName || ''} onChange={e => setProfile({...profile, displayName: e.target.value})} className="mt-2 block w-full rounded-xl border-slate-200 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-4 py-3 border text-slate-800" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 uppercase tracking-wide">Email Address</label>
                <input type="email" disabled={!!user?.email} value={profile.email || user?.email || ''} onChange={e => setProfile({...profile, email: e.target.value})} className={`mt-2 block w-full rounded-xl border-slate-200 shadow-sm px-4 py-3 border ${user?.email ? 'bg-slate-50 text-slate-400' : 'bg-white text-slate-800 focus:border-emerald-500 focus:ring-emerald-500'}`} />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 uppercase tracking-wide">Age</label>
                <input type="number" value={profile.age || ''} onChange={e => setProfile({...profile, age: e.target.value})} className="mt-2 block w-full rounded-xl border-slate-200 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-4 py-3 border text-slate-800" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 uppercase tracking-wide">Mobile Number</label>
                <input type="tel" disabled={!!user?.phoneNumber} value={profile.phoneNumber || user?.phoneNumber || ''} onChange={e => setProfile({...profile, phoneNumber: e.target.value})} className={`mt-2 block w-full rounded-xl border-slate-200 shadow-sm px-4 py-3 border ${user?.phoneNumber ? 'bg-slate-50 text-slate-400' : 'bg-white text-slate-800 focus:border-emerald-500 focus:ring-emerald-500'}`} />
              </div>
           </div>
        </div>

        <div className="bg-white shadow-sm rounded-3xl border border-slate-100 overflow-hidden">
           <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center">
              <HeartPulse className="h-5 w-5 text-slate-400 mr-2" />
              <h2 className="text-lg font-semibold text-slate-800">Health Metrics & Medical Info</h2>
           </div>
           <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-500 uppercase tracking-wide">Height (cm)</label>
                <input type="number" value={profile.height || ''} onChange={e => setProfile({...profile, height: e.target.value})} className="mt-2 block w-full rounded-xl border-slate-200 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-4 py-3 border text-slate-800" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 uppercase tracking-wide">Weight (kg)</label>
                <input type="number" value={profile.weight || ''} onChange={e => setProfile({...profile, weight: e.target.value})} className="mt-2 block w-full rounded-xl border-slate-200 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-4 py-3 border text-slate-800" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 uppercase tracking-wide">Blood Group</label>
                <select value={profile.bloodGroup || ''} onChange={e => setProfile({...profile, bloodGroup: e.target.value})} className="mt-2 block w-full rounded-xl border-slate-200 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-4 py-3 border bg-white text-slate-800">
                   <option value="">Select</option>
                   <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
                   <option>O+</option><option>O-</option><option>AB+</option><option>AB-</option>
                </select>
              </div>
              
              <div className="md:col-span-3 pt-4 border-t border-slate-100">
                  <label className="block text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">Existing Medical Conditions</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                     {['Asthma', 'COPD', 'Heart Disease', 'Allergies', 'Diabetes', 'Hypertension'].map(condition => {
                        const conditions = profile.medicalConditions || [];
                        const isChecked = conditions.includes(condition);
                        return (
                           <label key={condition} className="flex items-center space-x-2 text-sm text-slate-600 font-medium">
                             <input type="checkbox" checked={isChecked} onChange={(e) => {
                                 if(e.target.checked) setProfile({...profile, medicalConditions: [...conditions, condition]});
                                 else setProfile({...profile, medicalConditions: conditions.filter((c: string) => c !== condition)});
                             }} className="rounded text-emerald-600 focus:ring-emerald-500" />
                             <span>{condition}</span>
                           </label>
                        )
                     })}
                  </div>
              </div>
           </div>
        </div>

        <div className="flex items-center justify-end space-x-4">
           {message && <span className={`text-sm font-bold px-3 py-1 rounded-xl ${message.includes('succes') ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>{message}</span>}
           <button type="submit" disabled={saving} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors shadow-md shadow-emerald-200/50">
              {saving ? 'Saving...' : (needsProfileSetup ? 'Complete Setup' : 'Save Profile')}
           </button>
        </div>
      </form>
    </motion.div>
  );
}
