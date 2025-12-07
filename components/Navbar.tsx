
import React, { useState, useEffect, useRef } from 'react';
import { ViewState, UserSession, AppNotification } from '../types';
import { User, LogOut, LayoutDashboard, Home, Activity, TrendingUp, Bell, Moon, Sun, Menu, Clock, Check, Star, AlertCircle } from 'lucide-react';
import { firebaseService } from '../services/firebaseService';

// Base64 Sound for Notifications
const NOTIFICATION_SOUND = "data:audio/mp3;base64,SUQzBAAAAAABAFRYWFgAAAASAAADbWFqb3JfYnJhbmQAZGFzaABUWFhYAAAAEQAAA21pbm9yX3ZlcnNpb24AMABUWFhYAAAAHAAAA2NvbXBhdGlibGVfYnJhbmRzAGlzbzZtcDQxAFRTU0UAAAAPAAADTGF2ZjU5LjI3LjEwMAAAAAAAAAAAAAAA//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq";

interface NavbarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  user: UserSession;
  onLogout: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  onNotificationClick?: (notification: AppNotification) => void;
}

// Custom Logo Component (Heart Symbol)
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

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, user, onLogout, isDarkMode, toggleTheme, onNotificationClick }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevNotifCount = useRef<number>(0);
  const isFirstLoad = useRef<boolean>(true);

  useEffect(() => {
    // Initialize Audio
    audioRef.current = new Audio(NOTIFICATION_SOUND);
    audioRef.current.volume = 0.5;

    let unsubscribe: (() => void) | undefined;

    if (user.id) {
        unsubscribe = firebaseService.listenToRealtimeNotifications(user.id, (notifs) => {
            // Sound Logic: If notifs count increased and it's not the first load
            if (!isFirstLoad.current && notifs.length > prevNotifCount.current) {
                audioRef.current?.play().catch(e => console.warn("Audio play failed (autoplay policy):", e));
            }

            setNotifications(notifs);
            prevNotifCount.current = notifs.length;
            isFirstLoad.current = false;
        });
    } else {
        setNotifications([]);
    }

    return () => {
        if (unsubscribe) unsubscribe();
    };
  }, [user.id]);

  const handleNav = (view: ViewState) => {
    onNavigate(view);
    setShowNotifications(false);
  };

  const handleNotificationSelect = async (n: AppNotification) => {
      // 1. Trigger navigation first for immediate responsiveness
      if (onNotificationClick) {
          onNotificationClick(n);
      }
      setShowNotifications(false);
      
      // 2. Then mark as read in background
      await firebaseService.markNotificationAsRead(user.id!, n.id);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Desktop Nav Item Style
  const desktopNavItemClass = (view: ViewState) => 
    `px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
      currentView === view 
        ? 'bg-white text-emerald-800 shadow-lg scale-105' 
        : 'text-emerald-50 hover:bg-emerald-800/50 hover:text-white hover:-translate-y-0.5'
    }`;

  // Mobile Nav Item Style
  const mobileNavItemClass = (view: ViewState) => 
    `flex flex-col items-center justify-center w-full h-full transition-colors relative ${
      currentView === view 
        ? 'text-emerald-600 dark:text-emerald-400' 
        : 'text-gray-400 dark:text-gray-500 hover:text-emerald-500 dark:hover:text-emerald-300'
    }`;

  // Helper to render notification item (shared design logic)
  const renderNotificationItem = (n: AppNotification) => (
      <div 
        key={n.id} 
        onClick={() => handleNotificationSelect(n)}
        className={`p-4 border-b dark:border-gray-700 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors flex gap-3 items-start ${!n.read ? 'bg-emerald-50/50 dark:bg-emerald-900/20' : ''}`}
      >
          <div className={`mt-1 p-2 rounded-full shrink-0 ${
              n.type === 'REQUEST' 
              ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' 
              : n.type === 'RESPONSE'
              ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
              : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
          }`}>
              {n.type === 'REQUEST' ? <AlertCircle size={16} /> : n.type === 'RESPONSE' ? <Check size={16} /> : <Star size={16} />}
          </div>
          <div className="flex-1">
              <div className="flex justify-between items-start mb-1">
                <h4 className={`text-sm ${!n.read ? 'font-black text-gray-900 dark:text-white' : 'font-bold text-gray-600 dark:text-gray-300'}`}>{n.title}</h4>
                {!n.read && <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-2 line-clamp-2">{n.message}</p>
              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Clock size={10}/> {new Date(n.timestamp).toLocaleTimeString('ar-DZ', {hour: '2-digit', minute:'2-digit'})}
              </span>
          </div>
      </div>
  );

  return (
    <>
      {/* --- DESKTOP NAVIGATION --- */}
      <nav className="hidden md:block bg-gradient-to-r from-emerald-900 to-teal-800 dark:from-emerald-950 dark:to-teal-900 text-white shadow-xl sticky top-0 z-50 backdrop-blur-xl bg-opacity-95 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => handleNav('HOME')}>
              <div className="relative w-10 h-10 flex items-center justify-center">
                 {/* Animated Circle */}
                 <div className="absolute inset-0 border-2 border-emerald-400/30 rounded-full animate-[spin_8s_linear_infinite]"></div>
                 <div className="absolute inset-0 border-2 border-t-emerald-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-[spin_3s_linear_infinite]"></div>
                 
                 {/* Modern Icon */}
                 <div className="bg-gradient-to-br from-emerald-500 to-teal-600 w-8 h-8 rounded-full flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-300">
                    <FindoLogo className="text-white" size={20} />
                 </div>
              </div>
              <span className="font-black text-3xl font-cairo tracking-wide text-white drop-shadow-md">فايندو</span>
            </div>

            {/* Middle Links */}
            <div className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/10 backdrop-blur-sm">
               <button onClick={() => handleNav('HOME')} className={desktopNavItemClass('HOME')}>
                   <Home size={16} /> الرئيسية
               </button>
               
               <button onClick={() => handleNav('HEALTH_DIRECTORY')} className={desktopNavItemClass('HEALTH_DIRECTORY')}>
                  <Activity size={16} /> دليل الصيدليات
               </button>

               <button onClick={() => handleNav('COMMON_MEDICINES')} className={desktopNavItemClass('COMMON_MEDICINES')}>
                  <TrendingUp size={16} /> الأدوية الشائعة
               </button>

               {/* Role Based Links */}
               {user.role === 'ADMIN' && (
                   <button onClick={() => handleNav('ADMIN_DASHBOARD')} className={desktopNavItemClass('ADMIN_DASHBOARD')}>
                       <LayoutDashboard size={16} /> الإدارة
                   </button>
               )}
               {user.role === 'PHARMACY' && (
                   <button onClick={() => handleNav('PHARMACY_DASHBOARD')} className={desktopNavItemClass('PHARMACY_DASHBOARD')}>
                       <LayoutDashboard size={16} /> لوحتي
                   </button>
               )}
               {user.role === 'USER' && (
                   <button onClick={() => handleNav('USER_DASHBOARD')} className={desktopNavItemClass('USER_DASHBOARD')}>
                       <User size={16} /> حسابي
                   </button>
               )}
            </div>

            {/* Left Actions */}
            <div className="flex items-center gap-3">
                {/* Theme Toggle */}
                <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-white/10 text-emerald-100 transition-colors">
                    {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                {/* Real-time Notifications */}
                {user.id && (
                    <div className="relative">
                        <button 
                            onClick={() => setShowNotifications(!showNotifications)} 
                            className={`p-2 rounded-full hover:bg-white/10 text-emerald-100 transition-all relative ${showNotifications ? 'bg-white/20 text-white' : ''}`}
                        >
                            <Bell size={20} className={unreadCount > 0 ? 'animate-pulse' : ''} />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[11px] font-bold h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full border-2 border-emerald-900 shadow-sm z-10 leading-none">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>
                        
                        {showNotifications && (
                            <div className="absolute top-14 left-0 w-80 md:w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden z-[60] animate-fade-in text-right">
                                 <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                                     <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                        <Bell size={16} className="text-emerald-500" /> الإشعارات
                                     </h3>
                                     {unreadCount > 0 && <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-bold">{unreadCount} جديد</span>}
                                 </div>
                                 <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                                     {notifications.length === 0 ? (
                                         <div className="py-12 text-center text-gray-400">
                                             <Bell size={32} className="mx-auto mb-2 opacity-20"/>
                                             <p className="text-sm">لا توجد إشعارات حالياً</p>
                                         </div>
                                     ) : (
                                         notifications.map(n => renderNotificationItem(n))
                                     )}
                                 </div>
                                 <div className="p-2 bg-gray-50 dark:bg-gray-900/50 text-center border-t dark:border-gray-700">
                                     <button onClick={() => setShowNotifications(false)} className="text-xs font-bold text-gray-500 dark:text-gray-400 hover:underline">إغلاق</button>
                                 </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Profile/Logout */}
                {user.role !== 'GUEST' ? (
                    <div className="flex items-center gap-3 pl-2 border-l border-white/10 ml-2">
                         <div className="text-right hidden xl:block">
                             <p className="text-sm font-bold leading-none">{user.name}</p>
                             <p className="text-[10px] text-emerald-200 opacity-80">{user.role}</p>
                         </div>
                         <button onClick={onLogout} className="p-2 bg-red-500/10 hover:bg-red-500 text-red-100 hover:text-white rounded-lg transition-all" title="تسجيل الخروج">
                             <LogOut size={18} />
                         </button>
                    </div>
                ) : (
                    <div className="h-8 w-8 rounded-full bg-white/10"></div>
                )}
            </div>
          </div>
        </div>
      </nav>

      {/* --- MOBILE TOP BAR (Logo) --- */}
      <nav className="md:hidden relative top-0 left-0 right-0 h-16 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md z-40 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-4 shadow-sm">
         <div className="flex items-center gap-2" onClick={() => handleNav('HOME')}>
            <div className="relative w-8 h-8 flex items-center justify-center">
                 <div className="absolute inset-0 border border-emerald-500/30 rounded-full animate-[spin_8s_linear_infinite]"></div>
                 <div className="bg-gradient-to-br from-emerald-500 to-teal-600 w-6 h-6 rounded-full flex items-center justify-center shadow-sm relative z-10">
                    <FindoLogo className="text-white" size={16} />
                 </div>
            </div>
            <span className="font-black text-2xl font-cairo text-emerald-800 dark:text-emerald-400">فايندو</span>
         </div>
         
         <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400">
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            
            {/* Mobile Bell */}
            {user.id && (
                <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 relative">
                    <Bell size={18} />
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-bold h-4 min-w-[16px] px-1 flex items-center justify-center rounded-full border border-white dark:border-gray-900 shadow-sm z-10 leading-none">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>
            )}

            {user.role !== 'GUEST' && (
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                    {user.name?.charAt(0)}
                </div>
            )}
         </div>

         {/* Mobile Notifications Dropdown (Floating Modal style) */}
         {showNotifications && (
             <div className="absolute top-16 left-0 right-0 p-3 z-50 animate-fade-in flex justify-center">
                 <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden max-h-[70vh] flex flex-col">
                     <div className="p-4 bg-gray-50 dark:bg-gray-900/80 backdrop-blur-sm border-b dark:border-gray-700 flex justify-between items-center sticky top-0 z-10">
                         <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-sm">
                             <Bell size={16} className="text-emerald-500" /> الإشعارات
                         </h3>
                         <div className="flex items-center gap-2">
                            {unreadCount > 0 && <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-bold">{unreadCount} جديد</span>}
                            <button onClick={() => setShowNotifications(false)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <Menu className="rotate-90" size={16}/> {/* Using Menu as close indicator fallback or X */}
                            </button>
                         </div>
                     </div>
                     <div className="overflow-y-auto custom-scrollbar bg-white dark:bg-gray-800">
                         {notifications.length === 0 ? (
                             <div className="p-10 text-center text-gray-400 flex flex-col items-center">
                                 <Bell size={40} className="mb-3 opacity-20"/>
                                 <span className="text-sm">لا توجد إشعارات حالياً</span>
                             </div>
                         ) : (
                             notifications.map(n => renderNotificationItem(n))
                         )}
                     </div>
                 </div>
             </div>
         )}
      </nav>

      {/* --- MOBILE BOTTOM NAVIGATION --- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 h-20 pb-safe z-[100] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
         <div className="grid grid-cols-5 h-full px-2">
             
             <button onClick={() => handleNav('HOME')} className={mobileNavItemClass('HOME')}>
                 <div className={`p-1.5 rounded-xl mb-1 ${currentView === 'HOME' ? 'bg-emerald-100 dark:bg-emerald-900/30' : ''}`}>
                    <Home size={22} className={currentView === 'HOME' ? 'fill-emerald-600 dark:fill-emerald-400 text-emerald-600 dark:text-emerald-400' : ''} />
                 </div>
                 <span className="text-[10px] font-bold">الرئيسية</span>
             </button>

             <button onClick={() => handleNav('HEALTH_DIRECTORY')} className={mobileNavItemClass('HEALTH_DIRECTORY')}>
                 <div className={`p-1.5 rounded-xl mb-1 ${currentView === 'HEALTH_DIRECTORY' || currentView === 'PHARMACY_DETAILS' || currentView === 'DOCTOR_DETAILS' ? 'bg-emerald-100 dark:bg-emerald-900/30' : ''}`}>
                    <Activity size={22} className={currentView === 'HEALTH_DIRECTORY' ? 'fill-emerald-600 dark:fill-emerald-400 text-emerald-600 dark:text-emerald-400' : ''} />
                 </div>
                 <span className="text-[10px] font-bold">الصيدليات</span>
             </button>

             {/* Center Action Button (Logo) */}
             <div className="relative -top-6 flex justify-center">
                 <button 
                    onClick={() => handleNav('HOME')}
                    className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full shadow-lg shadow-emerald-500/40 flex items-center justify-center text-white border-4 border-white dark:border-gray-900 active:scale-95 transition-transform"
                 >
                     <FindoLogo className="text-white" size={28} />
                 </button>
             </div>

             {/* Role Specific */}
             {user.role === 'ADMIN' ? (
                 <button onClick={() => handleNav('ADMIN_DASHBOARD')} className={mobileNavItemClass('ADMIN_DASHBOARD')}>
                     <div className={`p-1.5 rounded-xl mb-1 ${currentView === 'ADMIN_DASHBOARD' ? 'bg-emerald-100 dark:bg-emerald-900/30' : ''}`}>
                        <LayoutDashboard size={22} />
                     </div>
                     <span className="text-[10px] font-bold">الإدارة</span>
                 </button>
             ) : user.role === 'PHARMACY' ? (
                 <button onClick={() => handleNav('PHARMACY_DASHBOARD')} className={mobileNavItemClass('PHARMACY_DASHBOARD')}>
                     <div className={`p-1.5 rounded-xl mb-1 ${currentView === 'PHARMACY_DASHBOARD' ? 'bg-emerald-100 dark:bg-emerald-900/30' : ''}`}>
                        <LayoutDashboard size={22} />
                     </div>
                     <span className="text-[10px] font-bold">لوحتي</span>
                 </button>
             ) : (
                 <button onClick={() => handleNav('USER_DASHBOARD')} className={mobileNavItemClass('USER_DASHBOARD')}>
                     <div className={`p-1.5 rounded-xl mb-1 ${currentView === 'USER_DASHBOARD' ? 'bg-emerald-100 dark:bg-emerald-900/30' : ''}`}>
                        <User size={22} />
                     </div>
                     <span className="text-[10px] font-bold">حسابي</span>
                 </button>
             )}

             {/* Logout */}
             <button onClick={onLogout} className="flex flex-col items-center justify-center w-full h-full text-gray-400 hover:text-red-500 transition-colors">
                 <div className="p-1.5 rounded-xl mb-1">
                    <LogOut size={22} />
                 </div>
                 <span className="text-[10px] font-bold">خروج</span>
             </button>

         </div>
      </nav>
    </>
  );
};
