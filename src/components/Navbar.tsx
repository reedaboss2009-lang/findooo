import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserSession, AppNotification, ViewState } from '../types';
import { Home, Activity, TrendingUp, Bell, Moon, Sun, LayoutDashboard, User, LogOut, Menu, Clock, AlertCircle, Check, Star } from 'lucide-react';
import { firebaseService } from '../services/firebaseService';

// Reusing sound and logic, just changing navigation
const NOTIFICATION_SOUND = "data:audio/mp3;base64,SUQzBAAAAAABAFRYWFgAAAASAAADbWFqb3JfYnJhbmQAZGFzaABUWFhYAAAAEQAAA21pbm9yX3ZlcnNpb24AMABUWFhYAAAAHAAAA2NvbXBhdGlibGVfYnJhbmRzAGlzbzZtcDQxAFRTU0UAAAAPAAADTGF2ZjU5LjI3LjEwMAAAAAAAAAAAAAAA//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq";

interface NavbarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void; // Legacy prop, we use router now
  user: UserSession;
  onLogout: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const FindoLogo = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M 50 88 C 20 60 5 40 5 25 C 5 10 20 5 35 5 C 45 5 50 15 50 15 C 50 15 55 5 65 5 C 80 5 95 10 95 25 C 95 40 80 60 50 88 Z" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout, isDarkMode, toggleTheme }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isFirstLoad = useRef(true);

  // Helper to determine current active view for styling
  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND);
    if (user.id) {
        return firebaseService.listenToRealtimeNotifications(user.id, (notifs) => {
            if (!isFirstLoad.current && notifs.length > notifications.length) {
                audioRef.current?.play().catch(()=>{});
            }
            setNotifications(notifs);
            isFirstLoad.current = false;
        });
    }
  }, [user.id]);

  const handleNav = (path: string) => {
      navigate(path);
      setShowNotifications(false);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const desktopNavItemClass = (path: string) => 
    `px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
      isActive(path)
        ? 'bg-white text-emerald-800 shadow-lg scale-105' 
        : 'text-emerald-50 hover:bg-emerald-800/50 hover:text-white hover:-translate-y-0.5'
    }`;

  const mobileNavItemClass = (path: string) => 
    `flex flex-col items-center justify-center w-full h-full transition-colors relative ${
      isActive(path)
        ? 'text-emerald-600 dark:text-emerald-400' 
        : 'text-gray-400 dark:text-gray-500 hover:text-emerald-500 dark:hover:text-emerald-300'
    }`;

  return (
    <>
      {/* Desktop Nav */}
      <nav className="hidden md:block bg-gradient-to-r from-emerald-900 to-teal-800 dark:from-emerald-950 dark:to-teal-900 text-white shadow-xl sticky top-0 z-50 backdrop-blur-xl bg-opacity-95 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => handleNav('/')}>
              <div className="relative w-10 h-10 flex items-center justify-center">
                 <div className="bg-gradient-to-br from-emerald-500 to-teal-600 w-8 h-8 rounded-full flex items-center justify-center shadow-lg relative z-10">
                    <FindoLogo className="text-white" size={20} />
                 </div>
              </div>
              <span className="font-black text-3xl font-cairo tracking-wide text-white drop-shadow-md">فايندو</span>
            </div>

            <div className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/10">
               <button onClick={() => handleNav('/')} className={desktopNavItemClass('/')}><Home size={16} /> الرئيسية</button>
               <button onClick={() => handleNav('/directory')} className={desktopNavItemClass('/directory')}><Activity size={16} /> الدليل الصحي</button>
               
               {user.role === 'ADMIN' && <button onClick={() => handleNav('/admin')} className={desktopNavItemClass('/admin')}><LayoutDashboard size={16} /> الإدارة</button>}
               {user.role === 'PHARMACY' && <button onClick={() => handleNav('/dashboard')} className={desktopNavItemClass('/dashboard')}><LayoutDashboard size={16} /> لوحتي</button>}
               {user.role === 'USER' && <button onClick={() => handleNav('/profile')} className={desktopNavItemClass('/profile')}><User size={16} /> حسابي</button>}
            </div>

            <div className="flex items-center gap-3">
                <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-white/10 text-emerald-100">{isDarkMode ? <Sun size={20} /> : <Moon size={20} />}</button>
                {user.id && (
                    <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 rounded-full hover:bg-white/10 text-emerald-100 relative">
                        <Bell size={20} />
                        {unreadCount > 0 && <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[10px] rounded-full px-1.5">{unreadCount}</span>}
                    </button>
                )}
                {user.role !== 'GUEST' ? (
                    <div className="flex items-center gap-3 pl-2 border-l border-white/10 ml-2">
                         <div className="text-right hidden xl:block"><p className="text-sm font-bold">{user.name}</p></div>
                         <button onClick={onLogout} className="p-2 bg-red-500/10 hover:bg-red-500 text-red-100 rounded-lg"><LogOut size={18} /></button>
                    </div>
                ) : (
                    <button onClick={() => handleNav('/login')} className="text-sm bg-white/10 px-3 py-1.5 rounded-lg hover:bg-white/20">دخول</button>
                )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 h-20 pb-safe z-[100] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
         <div className="grid grid-cols-5 h-full px-2">
             <button onClick={() => handleNav('/')} className={mobileNavItemClass('/')}><Home size={22} /><span className="text-[10px] font-bold">الرئيسية</span></button>
             <button onClick={() => handleNav('/directory')} className={mobileNavItemClass('/directory')}><Activity size={22} /><span className="text-[10px] font-bold">الدليل</span></button>
             
             <div className="relative -top-6 flex justify-center">
                 <button onClick={() => handleNav('/')} className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full shadow-lg flex items-center justify-center text-white border-4 border-white dark:border-gray-900">
                     <FindoLogo className="text-white" size={28} />
                 </button>
             </div>

             {user.role === 'ADMIN' && <button onClick={() => handleNav('/admin')} className={mobileNavItemClass('/admin')}><LayoutDashboard size={22} /><span className="text-[10px]">الإدارة</span></button>}
             {user.role === 'PHARMACY' && <button onClick={() => handleNav('/dashboard')} className={mobileNavItemClass('/dashboard')}><LayoutDashboard size={22} /><span className="text-[10px]">لوحتي</span></button>}
             {user.role === 'USER' && <button onClick={() => handleNav('/profile')} className={mobileNavItemClass('/profile')}><User size={22} /><span className="text-[10px]">حسابي</span></button>}
             {user.role === 'GUEST' && <button onClick={() => handleNav('/login')} className={mobileNavItemClass('/login')}><User size={22} /><span className="text-[10px]">دخول</span></button>}
             
             {user.role !== 'GUEST' && (
                 <button onClick={onLogout} className="flex flex-col items-center justify-center w-full h-full text-gray-400 hover:text-red-500">
                     <LogOut size={22} /><span className="text-[10px] font-bold">خروج</span>
                 </button>
             )}
         </div>
      </nav>
    </>
  );
};