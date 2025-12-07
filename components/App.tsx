import React, { useState, useEffect } from 'react';
import { Navbar } from './Navbar';
import { HomeView } from './HomeView';
import { PharmacyDashboard } from './PharmacyDashboard';
import { UserDashboard } from './UserDashboard';
import { PharmacyDetails } from './PharmacyDetails';
import { HealthDirectory } from './HealthDirectory';
import { DoctorDetails } from './DoctorDetails';
import { AdminDashboard } from './AdminDashboard'; 
import { ViewState, UserSession, Pharmacy, Doctor, DrugStat, AppNotification } from '../types';
import { mockService } from '../services/mockService';
import { firebaseService } from '../services/firebaseService';
import { WILAYAS } from '../constants';
import { Heart, BriefcaseMedical, User, ArrowLeft, Info, Loader2, AlertCircle, Search, Pill, Plus } from 'lucide-react';

const App = () => {
  // Start with LOGIN view to enforce authentication
  const [currentView, setCurrentView] = useState<ViewState>('LOGIN');
  const [user, setUser] = useState<UserSession>({ role: 'GUEST' });
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Dashboard State Control
  const [pharmacyDashboardTab, setPharmacyDashboardTab] = useState<'OVERVIEW' | 'STOCK' | 'ALERTS' | 'REVIEWS'>('OVERVIEW');
  const [dashboardNavTimestamp, setDashboardNavTimestamp] = useState(0);

  // Login/Register State
  const [authTab, setAuthTab] = useState<'PATIENT' | 'PRO'>('PATIENT');
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [authError, setAuthError] = useState<string | null>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Register fields
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regWilaya, setRegWilaya] = useState(WILAYAS[1]);

  useEffect(() => {
    // Check system preference or saved preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        setIsDarkMode(true);
        document.documentElement.classList.add('dark');
    } else {
        setIsDarkMode(false);
        document.documentElement.classList.remove('dark');
    }

    // Firebase Auth Listener
    const unsubscribe = firebaseService.observeAuthState((session) => {
        if (session) {
            setUser(session);
            // If user is logged in and currently on LOGIN page, redirect them
            if (currentView === 'LOGIN') {
                 if (session.role === 'ADMIN') setCurrentView('ADMIN_DASHBOARD');
                 else if (session.role === 'PHARMACY') setCurrentView('PHARMACY_DASHBOARD');
                 else setCurrentView('HOME');
            }
        } else {
            setUser({ role: 'GUEST' });
            // If not logged in, force LOGIN view
            setCurrentView('LOGIN');
        }
        setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [currentView]);

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

  const getAuthErrorMessage = (code: string) => {
      switch (code) {
          case 'auth/invalid-credential':
          case 'auth/user-not-found':
          case 'auth/wrong-password':
              return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
          case 'auth/email-already-in-use':
              return 'البريد الإلكتروني مسجل مسبقاً.';
          case 'auth/weak-password':
              return 'كلمة المرور ضعيفة جداً (يجب أن تكون 6 أحرف على الأقل).';
          case 'auth/network-request-failed':
              return 'يرجى التحقق من الاتصال بالإنترنت.';
          case 'auth/too-many-requests':
              return 'محاولات كثيرة خاطئة، يرجى المحاولة لاحقاً.';
          case 'permission-denied':
              return 'ليس لديك الصلاحيات الكافية.';
          case 'auth/invalid-input':
              return 'يرجى إدخال البيانات المطلوبة بشكل صحيح.';
          default:
              return 'حدث خطأ غير متوقع في عملية المصادقة.';
      }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
        const session = await firebaseService.login(email, password);
        
        // Role Check logic
        if (authTab === 'PATIENT' && session.role !== 'USER' && session.role !== 'ADMIN') { 
            setAuthError('هذا الحساب خاص بالمهنيين (صيدلي). يرجى التبديل إلى تبويب "حساب صيدلي".');
            return;
        }
        if (authTab === 'PRO' && session.role === 'USER') {
            setAuthError('هذا حساب عادي. يرجى التبديل إلى تبويب "حساب عادي".');
            return;
        }

        setUser(session);
        navigateToDashboard(session.role);
    } catch (error: any) {
        setAuthError(getAuthErrorMessage(error.code) || error.message);
    }
  };

  const navigateToDashboard = (role: string) => {
      if (role === 'ADMIN') setCurrentView('ADMIN_DASHBOARD');
      else if (role === 'PHARMACY') setCurrentView('PHARMACY_DASHBOARD');
      else setCurrentView('HOME'); // Default to HOME for regular users
  };

  const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      setAuthError(null);
      try {
          const session = await firebaseService.registerUser({
              name: regName,
              email,
              password,
              phone: regPhone,
              wilaya: regWilaya,
              role: 'USER' // Only users can register themselves via UI, unless email is admin specific (handled in service)
          });
          setUser(session);
          setCurrentView('HOME');
      } catch (err: any) {
          setAuthError(getAuthErrorMessage(err.code) || err.message);
      }
  };

  const handleLogout = async () => {
    await firebaseService.logout();
    setUser({ role: 'GUEST' });
    setCurrentView('LOGIN');
    setEmail('');
    setPassword('');
    setRegName('');
    setRegPhone('');
    setAuthError(null);
  };

  const handleUserUpdate = (updatedData: Partial<UserSession>) => {
      setUser(prev => ({ ...prev, ...updatedData }));
  };

  const handleNotificationClick = (notification: AppNotification) => {
      if (notification.type === 'REQUEST') {
          setCurrentView('PHARMACY_DASHBOARD');
          setPharmacyDashboardTab('ALERTS');
          setDashboardNavTimestamp(Date.now());
      } else if (notification.type === 'REVIEW') {
          setCurrentView('PHARMACY_DASHBOARD');
          setPharmacyDashboardTab('REVIEWS');
          setDashboardNavTimestamp(Date.now());
      } else if (notification.type === 'RESPONSE') {
          // If user receives a response, take them to HOME where search results usually live
          // Or if we had a specific "My Requests" view, we'd go there.
          setCurrentView('HOME');
      }
  };

  // --- SVG Logo Component (Heart Symbol) ---
  const FindoLogo = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className={className}
    >
        <path 
            d="M 50 88 C 20 60 5 40 5 25 C 5 10 20 5 35 5 C 45 5 50 15 50 15 C 50 15 55 5 65 5 C 80 5 95 10 95 25 C 95 40 80 60 50 88 Z"
            stroke="currentColor" 
            strokeWidth="8" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
        />
    </svg>
  );

  const renderView = () => {
    switch (currentView) {
      case 'HOME':
        return <HomeView user={user} onNavigate={setCurrentView} onPharmacyClick={(p) => { setSelectedPharmacy(p); setCurrentView('PHARMACY_DETAILS'); }} />;
      
      case 'HEALTH_DIRECTORY':
        return <HealthDirectory 
          onSelectPharmacy={(p) => { setSelectedPharmacy(p); setCurrentView('PHARMACY_DETAILS'); }}
          onSelectDoctor={(d) => { setSelectedDoctor(d); setCurrentView('DOCTOR_DETAILS'); }}
        />;

      case 'PHARMACY_DASHBOARD':
        return <PharmacyDashboard 
            user={user} 
            onLogout={handleLogout} 
            targetTab={pharmacyDashboardTab} 
            navTimestamp={dashboardNavTimestamp}
        />;
    
      case 'USER_DASHBOARD':
        return <UserDashboard user={user} onLogout={handleLogout} onUpdateUser={handleUserUpdate} onNavigate={setCurrentView} />;

      case 'COMMON_MEDICINES':
        return <CommonMedicinesView />;
        
      case 'LOGIN':
        return (
          <div className="max-w-md mx-auto mt-12 animate-fade-in-up">
            
            <div className="text-center mb-10 flex flex-col items-center">
                <div className="relative w-20 h-20 flex items-center justify-center mb-6">
                    {/* Animated Rings */}
                     <div className="absolute inset-0 border-2 border-emerald-400/30 rounded-full animate-[spin_8s_linear_infinite]"></div>
                     <div className="absolute inset-0 border-2 border-t-emerald-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-[spin_3s_linear_infinite]"></div>
                     
                     <div className="bg-gradient-to-br from-emerald-500 to-teal-600 w-16 h-16 rounded-full flex items-center justify-center shadow-xl border border-white/20 relative z-10">
                         <FindoLogo className="text-white" size={44} />
                     </div>
                </div>
                <h1 className="text-5xl font-black text-emerald-800 dark:text-emerald-400 mb-2 font-cairo tracking-tight">فايندو</h1>
                <p className="text-gray-500 dark:text-gray-400 font-medium">بوابتك الصحية الذكية</p>
            </div>

            {/* Role Tabs */}
            <div className="flex bg-gray-200 dark:bg-gray-800 p-1 rounded-xl mb-6">
                <button 
                    onClick={() => { setAuthTab('PATIENT'); setAuthMode('LOGIN'); setAuthError(null); }} 
                    className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${authTab === 'PATIENT' ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                >
                    <Heart size={18} className={authTab === 'PATIENT' ? 'fill-emerald-100' : ''}/> حساب عادي
                </button>
                <button 
                    onClick={() => { setAuthTab('PRO'); setAuthMode('LOGIN'); setAuthError(null); }} 
                    className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${authTab === 'PRO' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                >
                    <BriefcaseMedical size={18} className={authTab === 'PRO' ? 'fill-blue-100' : ''}/> حساب صيدلي
                </button>
            </div>

            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
                {authError && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm font-bold mb-4 flex items-center gap-2 border border-red-100 dark:border-red-800">
                        <AlertCircle size={18} className="shrink-0" /> {authError}
                    </div>
                )}

                {authTab === 'PATIENT' ? (
                    <>
                        <h2 className="text-2xl font-bold text-center mb-2 text-emerald-800 dark:text-emerald-400">
                            {authMode === 'LOGIN' ? 'مرحباً بعودتك' : 'إنشاء حساب جديد'}
                        </h2>
                        <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-6">
                            {authMode === 'LOGIN' ? 'سجل الدخول لمتابعة وصفاتك وعمليات البحث' : 'انضم إلينا لتسهيل الوصول إلى أدويتك'}
                        </p>
                        
                        {authMode === 'LOGIN' ? (
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">البريد الإلكتروني</label>
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border dark:border-gray-700 p-3 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-gray-50 dark:bg-gray-800 dark:text-white focus:bg-white dark:focus:bg-gray-700" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">كلمة المرور</label>
                                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border dark:border-gray-700 p-3 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-gray-50 dark:bg-gray-800 dark:text-white focus:bg-white dark:focus:bg-gray-700" required />
                                </div>
                                <button className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 dark:shadow-none">دخول</button>
                                
                                <div className="text-center pt-2">
                                    <button type="button" onClick={() => { setAuthMode('REGISTER'); setAuthError(null); }} className="text-sm text-emerald-600 dark:text-emerald-400 font-bold hover:underline">ليس لديك حساب؟ سجل الآن</button>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handleRegister} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">الاسم الكامل</label>
                                    <input type="text" value={regName} onChange={e => setRegName(e.target.value)} className="w-full border dark:border-gray-700 p-3 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-gray-50 dark:bg-gray-800 dark:text-white focus:bg-white dark:focus:bg-gray-700" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">الولاية</label>
                                    <select value={regWilaya} onChange={e => setRegWilaya(e.target.value)} className="w-full border dark:border-gray-700 p-3 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-gray-50 dark:bg-gray-800 dark:text-white focus:bg-white dark:focus:bg-gray-700">
                                        {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">رقم الهاتف</label>
                                    <input type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)} className="w-full border dark:border-gray-700 p-3 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-gray-50 dark:bg-gray-800 dark:text-white focus:bg-white dark:focus:bg-gray-700" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">البريد الإلكتروني</label>
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border dark:border-gray-700 p-3 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-gray-50 dark:bg-gray-800 dark:text-white focus:bg-white dark:focus:bg-gray-700" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">كلمة المرور</label>
                                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border dark:border-gray-700 p-3 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-gray-50 dark:bg-gray-800 dark:text-white focus:bg-white dark:focus:bg-gray-700" required />
                                </div>
                                <button className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 dark:shadow-none">إنشاء حساب</button>
                                <div className="text-center pt-2">
                                    <button type="button" onClick={() => { setAuthMode('LOGIN'); setAuthError(null); }} className="text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 font-bold">لديك حساب بالفعل؟ تسجيل الدخول</button>
                                </div>
                            </form>
                        )}
                    </>
                ) : (
                    <>
                         <h2 className="text-2xl font-bold text-center mb-6 text-blue-800 dark:text-blue-400">دخول الصيادلة</h2>
                         <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">اسم المستخدم / البريد المهني</label>
                                <input type="text" value={email} onChange={e => setEmail(e.target.value)} className="w-full border dark:border-gray-700 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-blue-50/30 dark:bg-gray-800 dark:text-white focus:bg-white dark:focus:bg-gray-700" required />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">كلمة المرور</label>
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border dark:border-gray-700 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-blue-50/30 dark:bg-gray-800 dark:text-white focus:bg-white dark:focus:bg-gray-700" required />
                            </div>
                            <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 dark:shadow-none">دخول</button>
                            
                            <div className="mt-2 flex justify-center">
                                <button 
                                    type="button"
                                    onClick={() => { setEmail('admin@findo.dz'); setPassword('admin'); }}
                                    className="text-xs font-bold text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                >
                                    (تجريبي) ملء بيانات المدير
                                </button>
                            </div>
                         </form>
                         
                         <div className="mt-6 text-center text-sm text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex items-start gap-3 text-right">
                             <Info size={24} className="shrink-0 mt-0.5" />
                             <div>
                                <p className="font-bold mb-1">ليس لديك حساب؟</p>
                                <p className="text-gray-600 dark:text-gray-400 text-xs">تسجيل الصيادلة يتم عن طريق الإدارة فقط. يرجى التواصل مع إدارة التطبيق للحصول على حساب.</p>
                             </div>
                        </div>
                    </>
                )}
            </div>
          </div>
        );

      case 'PHARMACY_DETAILS':
        if (!selectedPharmacy) return <div>Error</div>;
        return <PharmacyDetails pharmacy={selectedPharmacy} user={user} onBack={() => setCurrentView('HEALTH_DIRECTORY')} />;

      case 'DOCTOR_DETAILS':
        if (!selectedDoctor) return <div>Error</div>;
        return <DoctorDetails doctor={selectedDoctor} onBack={() => setCurrentView('HEALTH_DIRECTORY')} />;

      case 'ADMIN_DASHBOARD':
          return <AdminDashboard onLogout={handleLogout} />;

      default:
        return <div>View not found</div>;
    }
  };

  if (authLoading) {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
            <Loader2 className="animate-spin text-emerald-600" size={48} />
        </div>
    );
  }

  // Hide Navbar when on Login screen for cleaner look if enforced
  const showNavbar = currentView !== 'LOGIN';

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-950 dark:text-gray-100 pb-24 md:pb-8 font-cairo transition-colors duration-300`}>
      {showNavbar && <Navbar currentView={currentView} onNavigate={setCurrentView} user={user} onLogout={handleLogout} isDarkMode={isDarkMode} toggleTheme={toggleTheme} onNotificationClick={handleNotificationClick} />}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderView()}
      </main>
    </div>
  );
};

const CommonMedicinesView = () => {
    const [stats, setStats] = useState<DrugStat[]>([]);

    React.useEffect(() => {
        mockService.getCommonMedicines().then(setStats);
    }, []);

    return (
        <div className="max-w-4xl mx-auto animate-fade-in">
             <div className="text-center mb-10">
                 <h2 className="text-3xl font-bold text-gray-800 dark:text-white">الأدوية الأكثر طلباً في الجزائر</h2>
                 <p className="text-gray-500 dark:text-gray-400 mt-2">إحصائيات حية تعتمد على نشاط البحث والتوفر في الصيدليات</p>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {stats.map((stat, idx) => (
                     <div key={idx} className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4 hover:shadow-md transition-shadow">
                         <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg">
                             {idx + 1}
                         </div>
                         <div className="flex-1">
                             <div className="flex justify-between mb-1">
                                 <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">{stat.name}</h3>
                                 <span className="text-emerald-600 dark:text-emerald-400 font-bold">{stat.percentage}%</span>
                             </div>
                             <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5">
                                 <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${stat.percentage}%` }}></div>
                             </div>
                             <p className="text-xs text-gray-400 mt-2">متوفر في {stat.count} صيدلية حالياً</p>
                         </div>
                     </div>
                 ))}
             </div>
        </div>
    )
}

export default App;