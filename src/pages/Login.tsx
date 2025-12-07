import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { firebaseService } from '../services/firebaseService';
import { WILAYAS } from '../constants';
import { Heart, BriefcaseMedical, AlertCircle, Info, Pill, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Logo Component
const FindoLogo = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M 50 88 C 20 60 5 40 5 25 C 5 10 20 5 35 5 C 45 5 50 15 50 15 C 50 15 55 5 65 5 C 80 5 95 10 95 25 C 95 40 80 60 50 88 Z" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export const Login = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
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

  // Redirect if already logged in
  React.useEffect(() => {
      if (user.role !== 'GUEST') {
          if (user.role === 'ADMIN') navigate('/admin');
          else if (user.role === 'PHARMACY') navigate('/dashboard');
          else navigate('/');
      }
  }, [user, navigate]);

  const getAuthErrorMessage = (code: string) => {
      switch (code) {
          case 'auth/invalid-credential':
          case 'auth/user-not-found':
          case 'auth/wrong-password': return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
          case 'auth/email-already-in-use': return 'البريد الإلكتروني مسجل مسبقاً.';
          case 'auth/weak-password': return 'كلمة المرور ضعيفة جداً.';
          default: return 'حدث خطأ غير متوقع.';
      }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
        const session = await firebaseService.login(email, password);
        // Role Check
        if (authTab === 'PATIENT' && session.role !== 'USER' && session.role !== 'ADMIN') { 
            setAuthError('هذا الحساب خاص بالمهنيين.'); return;
        }
        if (authTab === 'PRO' && session.role === 'USER') {
            setAuthError('هذا حساب عادي.'); return;
        }
        // Navigation handled by useEffect
    } catch (error: any) {
        setAuthError(getAuthErrorMessage(error.code) || error.message);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      setAuthError(null);
      try {
          await firebaseService.registerUser({
              name: regName, email, password, phone: regPhone, wilaya: regWilaya, role: 'USER'
          });
          // Navigation handled by useEffect
      } catch (err: any) {
          setAuthError(getAuthErrorMessage(err.code) || err.message);
      }
  };

  return (
      <div className="max-w-md mx-auto mt-12 animate-fade-in-up px-4">
        <div className="text-center mb-10 flex flex-col items-center">
            <div className="relative w-20 h-20 flex items-center justify-center mb-6">
                 <div className="absolute inset-0 border-2 border-emerald-400/30 rounded-full animate-[spin_8s_linear_infinite]"></div>
                 <div className="absolute inset-0 border-2 border-t-emerald-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-[spin_3s_linear_infinite]"></div>
                 <div className="bg-gradient-to-br from-emerald-500 to-teal-600 w-16 h-16 rounded-full flex items-center justify-center shadow-xl border border-white/20 relative z-10">
                     <FindoLogo className="text-white" size={36} />
                 </div>
            </div>
            <h1 className="text-5xl font-black text-emerald-800 dark:text-emerald-400 mb-2 font-cairo">فايندو</h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium">بوابتك الصحية الذكية</p>
        </div>

        <div className="flex bg-gray-200 dark:bg-gray-800 p-1 rounded-xl mb-6">
            <button onClick={() => { setAuthTab('PATIENT'); setAuthMode('LOGIN'); }} className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${authTab === 'PATIENT' ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <Heart size={18}/> حساب عادي
            </button>
            <button onClick={() => { setAuthTab('PRO'); setAuthMode('LOGIN'); }} className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${authTab === 'PRO' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <BriefcaseMedical size={18}/> حساب صيدلي
            </button>
        </div>

        <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
            {authError && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 p-3 rounded-lg text-sm font-bold mb-4 flex items-center gap-2">
                    <AlertCircle size={18} /> {authError}
                </div>
            )}

            {authTab === 'PATIENT' ? (
                <>
                    <h2 className="text-2xl font-bold text-center mb-2 text-emerald-800 dark:text-emerald-400">{authMode === 'LOGIN' ? 'مرحباً بعودتك' : 'إنشاء حساب جديد'}</h2>
                    {authMode === 'LOGIN' ? (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border p-3 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white" placeholder="البريد الإلكتروني" required />
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border p-3 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white" placeholder="كلمة المرور" required />
                            <button className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700">دخول</button>
                            <div className="text-center pt-2">
                                <button type="button" onClick={() => { setAuthMode('REGISTER'); setAuthError(null); }} className="text-sm text-emerald-600 font-bold hover:underline">ليس لديك حساب؟ سجل الآن</button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleRegister} className="space-y-4">
                            <input type="text" value={regName} onChange={e => setRegName(e.target.value)} className="w-full border p-3 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white" placeholder="الاسم الكامل" required />
                            <select value={regWilaya} onChange={e => setRegWilaya(e.target.value)} className="w-full border p-3 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white">{WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}</select>
                            <input type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)} className="w-full border p-3 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white" placeholder="رقم الهاتف" required />
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border p-3 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white" placeholder="البريد الإلكتروني" required />
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border p-3 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white" placeholder="كلمة المرور" required />
                            <button className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700">إنشاء حساب</button>
                            <div className="text-center pt-2">
                                <button type="button" onClick={() => { setAuthMode('LOGIN'); setAuthError(null); }} className="text-sm text-gray-500 font-bold">لديك حساب بالفعل؟ تسجيل الدخول</button>
                            </div>
                        </form>
                    )}
                </>
            ) : (
                <>
                     <h2 className="text-2xl font-bold text-center mb-6 text-blue-800 dark:text-blue-400">دخول الصيادلة</h2>
                     <form onSubmit={handleLogin} className="space-y-4">
                        <input type="text" value={email} onChange={e => setEmail(e.target.value)} className="w-full border p-3 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white" placeholder="البريد المهني" required />
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border p-3 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white" placeholder="كلمة المرور" required />
                        <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700">دخول</button>
                     </form>
                     <div className="mt-6 text-center text-sm text-blue-600 bg-blue-50 p-4 rounded-xl flex items-start gap-3">
                         <Info size={24} className="shrink-0" />
                         <p>تسجيل الصيادلة يتم عن طريق الإدارة فقط.</p>
                    </div>
                </>
            )}
        </div>
      </div>
  );
};