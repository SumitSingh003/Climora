import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, Leaf, ShieldAlert, Bot, User, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Layout() {
  const { user, profile, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Activity },
    { name: 'Carbon Footprint', path: '/carbon', icon: Leaf },
    { name: 'AI Assistant', path: '/ai-assistant', icon: Bot },
    { name: 'Emergency', path: '/emergency', icon: ShieldAlert },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-800 font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden w-64 md:flex flex-col border-r border-slate-200 bg-white">
        <div className="flex h-16 items-center px-6 border-b border-slate-200">
           <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center mr-2">
             <Leaf className="h-5 w-5 text-white" />
           </div>
           <span className="text-xl font-bold tracking-tight text-emerald-900">Climora</span>
        </div>
        <div className="flex-1 overflow-y-auto py-4 px-3">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-xl transition-colors ${
                  location.pathname === item.path
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-emerald-600'
                }`}
              >
                <item.icon className="mr-3 h-5 w-5 shrink-0" />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
        <div className="border-t border-slate-200 p-4">
           <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 uppercase truncate">{profile?.displayName || user?.displayName || user?.phoneNumber || 'User'}</p>
              </div>
              <button onClick={logout} className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl">
                 <LogOut className="h-5 w-5" />
              </button>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between bg-white h-16 px-4 border-b border-slate-200">
           <div className="flex items-center">
             <Leaf className="h-6 w-6 text-emerald-600 mr-2" />
             <span className="text-xl font-bold tracking-tight text-emerald-900">Climora</span>
           </div>
           <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 -mr-2 text-slate-500">
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
           </button>
        </header>
        
        {/* Mobile Menu */}
        <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden border-b border-slate-200 bg-white overflow-hidden"
              >
                <nav className="px-2 py-4 space-y-1">
                    {navItems.map((item) => (
                      <Link
                        key={item.name}
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center px-3 py-2 text-base font-medium rounded-xl ${
                          location.pathname === item.path
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        <item.icon className="mr-4 h-5 w-5 shrink-0" />
                        {item.name}
                      </Link>
                    ))}
                    <button
                      onClick={logout}
                      className="w-full flex items-center px-3 py-2 text-base font-medium rounded-xl text-rose-600 hover:bg-rose-50"
                    >
                      <LogOut className="mr-4 h-5 w-5 shrink-0" />
                      Logout
                    </button>
                </nav>
              </motion.div>
            )}
        </AnimatePresence>

        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
