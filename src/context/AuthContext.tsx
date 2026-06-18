import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  displayName?: string;
  email?: string;
  phoneNumber?: string;
  location?: string;
  age?: number | string;
  height?: number | string;
  weight?: number | string;
  bloodGroup?: string;
  medicalConditions?: string[];
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  token: string | null;
  loading: boolean;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  needsProfileSetup: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);

  const fetchProfile = async (uid: string) => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
        setNeedsProfileSetup(false);
      } else {
        setProfile(null);
        setNeedsProfileSetup(true);
      }
    } catch (e) {
      console.error("Error fetching profile", e);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const idTkn = await firebaseUser.getIdToken();
        setToken(idTkn);
        await fetchProfile(firebaseUser.uid);
      } else {
        setToken(null);
        setProfile(null);
        setNeedsProfileSetup(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.uid);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      token,
      loading, 
      logout, 
      isAuthenticated: !!user,
      needsProfileSetup,
      refreshProfile
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};


