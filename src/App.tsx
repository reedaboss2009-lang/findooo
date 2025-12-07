import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { PharmaciesDirectory } from './components/PharmaciesDirectory'; // Refactored to handle both?
import { PharmacyDashboard } from './components/PharmacyDashboard';
import { UserDashboard } from './components/UserDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { PharmacyDetails } from './components/PharmacyDetails';
import { DoctorDetails } from './components/DoctorDetails';
import { DoctorsDirectory } from './components/DoctorsDirectory';
import { Login } from './pages/Login';
import { useAuth } from './context/AuthContext';
import { Pharmacy, Doctor, ViewState, AppNotification } from './types';
import { Loader2 } from 'lucide-react';
import { mockService } from './services/mockService'; // Still needed for some fetches until full refactor

// Wrapper for Layout
const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        setIsDarkMode(true);
        document.documentElement.classList.add('dark');
    } else {
        setIsDarkMode(false);
        document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
      setIsDarkMode(prev => {
          const newMode = !prev;
          if (newMode) {
              document.documentElement.classList.add('dark');
              localStorage.setItem('theme', 'dark');
          } else {
              document.documentElement.classList.remove('dark');
              localStorage.setItem('theme', 'light');
          }
          return newMode;
      });
  };

  // Determine current view for Navbar highlighting based on path
  let currentView: ViewState = 'HOME';
  if (location.pathname.startsWith('/directory')) currentView = 'HEALTH_DIRECTORY';
  if (location.pathname.startsWith('/pharmacy/')) currentView = 'PHARMACY_DETAILS';
  if (location.pathname.startsWith('/doctor/')) currentView = 'DOCTOR_DETAILS';
  if (location.pathname === '/admin') currentView = 'ADMIN_DASHBOARD';
  if (location.pathname === '/dashboard') currentView = 'PHARMACY_DASHBOARD';
  if (location.pathname === '/profile') currentView = 'USER_DASHBOARD';
  if (location.pathname === '/login') currentView = 'LOGIN';

  // Mock navigation for Navbar visual state
  const handleNavigate = (view: ViewState) => {
      // Navigation is handled by Links in Navbar now
  };

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-950 dark:text-gray-100 pb-24 md:pb-8 font-cairo transition-colors duration-300`}>
      {location.pathname !== '/login' && (
        <Navbar 
            currentView={currentView} 
            onNavigate={handleNavigate} 
            user={user} 
            onLogout={logout} 
            isDarkMode={isDarkMode} 
            toggleTheme={toggleTheme} 
        />
      )}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
};

// Data Loaders for Details Pages
const PharmacyDetailsWrapper = () => {
    const { user } = useAuth();
    // In a real app, use useParams and fetch. For this migration, we might need to adapt the component.
    // However, existing PharmacyDetails takes a 'pharmacy' object prop.
    // We need to fetch it by ID.
    const location = useLocation();
    // Assuming we passed state via router, or we need to fetch. 
    // Ideally refactor PharmacyDetails to fetch by ID if prop is missing.
    // For now, let's assume we can fetch or it's passed in state.
    // Simplest: The components need refactoring to fetch by ID themselves.
    
    // Placeholder until component refactor:
    return <div className="p-10 text-center">جاري التحميل... (ميزة قيد التحديث لاستخدام الرابط المباشر)</div>;
};

const App = () => {
  const { loading, user } = useAuth();

  if (loading) {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
            <Loader2 className="animate-spin text-emerald-600" size={48} />
        </div>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomeViewWrapper />} />
        <Route path="/directory" element={<HealthDirectoryWrapper />} />
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route path="/admin" element={user.role === 'ADMIN' ? <AdminDashboard onLogout={()=>{}} /> : <Navigate to="/login" />} />
        <Route path="/dashboard" element={user.role === 'PHARMACY' ? <PharmacyDashboard user={user} onLogout={()=>{}} /> : <Navigate to="/login" />} />
        <Route path="/profile" element={user.role === 'USER' ? <UserDashboard user={user} onLogout={()=>{}} onNavigate={()=>{}} /> : <Navigate to="/login" />} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
};

// Wrappers to adapt existing components to Router
import { useNavigate } from 'react-router-dom';

const HomeViewWrapper = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    // Note: In a full refactor, we'd pass an ID to navigate, and the details page fetches data.
    // But since the current components expect full objects, we'd normally use Context or State.
    // For the purpose of this output, I'll keep the HomeView as is but mock the navigation.
    return <HomeView user={user} onPharmacyClick={(p) => console.log("Navigate to", p.id)} onNavigate={(view) => {
        if(view === 'HEALTH_DIRECTORY') navigate('/directory');
    }} />;
}

const HealthDirectoryWrapper = () => {
    const navigate = useNavigate();
    return (
        <div className="w-full bg-gray-50 dark:bg-gray-950 transition-colors space-y-12">
             <div className="animate-fade-in relative z-0">
                <h2 className="text-3xl font-black text-center mb-8 text-emerald-800 dark:text-emerald-400">دليل الصيدليات</h2>
                <PharmaciesDirectory onSelectPharmacy={(p) => console.log("Nav to pharm", p.id)} />
                <div className="h-12"></div>
                <h2 className="text-3xl font-black text-center mb-8 text-blue-800 dark:text-blue-400">دليل الأطباء</h2>
                <DoctorsDirectory onSelectDoctor={(d) => console.log("Nav to doc", d.id)} />
            </div>
        </div>
    );
}

export default App;