import { Component, ReactNode, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'sonner';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import CarbonFootprint from './pages/CarbonFootprint';
import AIAssistant from './pages/AIAssistant';
import EmergencyServices from './pages/EmergencyServices';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red', background: '#fee' }}>
          <h2>Something went wrong.</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error?.toString()}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '10px' }}>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, needsProfileSetup } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (needsProfileSetup && location.pathname !== '/profile') {
    return <Navigate to="/profile" replace />;
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <Toaster position="top-right" richColors />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<ProtectedRoute><Layout/></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="profile" element={<Profile />} />
              <Route path="carbon" element={<CarbonFootprint />} />
              <Route path="ai-assistant" element={<AIAssistant />} />
              <Route path="emergency" element={<EmergencyServices />} />
            </Route>
          </Routes>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}
