
import React, { useEffect, useState } from 'react';
import { UserSession, Pharmacy, ViewState } from '../types';
import { mockService } from '../services/mockService';
import { firebaseService } from '../services/firebaseService';
import { WILAYAS } from '../constants';
import { User, MapPin, Phone, Mail, Clock, Search, ChevronRight, Heart, Pill, LogOut, Building2 } from 'lucide-react';

interface UserDashboardProps {
  user: UserSession;
  onLogout: () => void;
  onUpdateUser?: (updatedData: Partial<UserSession>) => void;
  onNavigate: (view: ViewState) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ user, onLogout, onUpdateUser, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'HISTORY' | 'FAVORITES'>('HISTORY');
  const [history, setHistory] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<Pharmacy[]>([]);

  useEffect(() => {
    const initDashboard = async () => {
        if (user.id) {
            // Fetch fresh profile data from 'users' collection explicitly
            const freshProfile = await firebaseService.getUserProfile(user.id);
            if (freshProfile) {
                // Update parent state if callback provided
                if (onUpdateUser) onUpdateUser(freshProfile);
            }

            mockService.getUserHistory(user.id).then(setHistory);
            loadFavorites();
        }
    };
    initDashboard();
  }, [user.id]);

  const loadFavorites = async () => {
      if (user.id) {
          const favs = await mockService.getFavorites(user.id);
          setFavorites(favs);
      }
  };

  const handleRemoveFavorite = async (pharmacyId: string) => {
      if (!user.id) return;
      await mockService.toggleFavorite(user.id, pharmacyId);
      loadFavorites();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto animate-fade-in text-right">
      
      {/* Profile Section */}
      <div className="col-span-1">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-emerald-100 dark:border-emerald-900 overflow-hidden sticky top-24">
            <div className="bg-emerald-600 h-24 relative">
                <div className="absolute -bottom-10 right-1/2 translate-x-1/2">
                    <div className="h-20 w-20 rounded-full bg-white dark:bg-gray-800 p-1 shadow-lg">
                        <div className="h-full w-full rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <User size={40} />
                        </div>
                    </div>
                </div>
            </div>
            <div className="pt-12 pb-6 px-6 text-center">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">{user.name || 'مستخدم جديد'}</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">عضو مريض</p>
                
                <div className="mt-6 space-y-3 text-right">
                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <Mail size={18} className="text-emerald-500"/>
                        <span className="text-sm font-bold truncate">{user.email || 'البريد غير متوفر'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <Phone size={18} className="text-emerald-500"/>
                        <span className="text-sm font-bold" dir="ltr">{user.phone || 'رقم الهاتف غير مسجل'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <MapPin size={18} className="text-emerald-500"/>
                        <span className="text-sm font-bold">{user.wilaya || 'الولاية غير محددة'}</span>
                    </div>
                </div>

                <button 
                    onClick={onLogout}
                    className="w-full mt-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                >
                    <LogOut size={18} /> تسجيل الخروج
                </button>
            </div>
        </div>
      </div>

      {/* Main Activity Section */}
      <div className="col-span-1 md:col-span-2 space-y-6">
          
          {/* Tabs */}
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
              <button 
                onClick={() => setActiveTab('HISTORY')}
                className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'HISTORY' ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
              >
                  <Clock size={18}/> سجل البحث
              </button>
              <button 
                onClick={() => setActiveTab('FAVORITES')}
                className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'FAVORITES' ? 'bg-white dark:bg-gray-700 text-red-500 dark:text-red-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
              >
                  <Heart size={18} className={activeTab === 'FAVORITES' ? 'fill-current' : ''}/> الصيدليات المفضلة
              </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 min-h-[400px]">
              
              {activeTab === 'HISTORY' && (
                  <>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg text-emerald-600 dark:text-emerald-400">
                            <Clock size={24}/>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">سجل البحث الأخير</h3>
                    </div>

                    {history.length > 0 ? (
                        <div className="space-y-4">
                            {history.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors group cursor-pointer">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-white dark:bg-gray-800 p-2 rounded-full text-gray-400 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 shadow-sm">
                                            <Search size={18}/>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800 dark:text-gray-200">{item.term}</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                                                <MapPin size={10}/> {item.wilaya}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium bg-white dark:bg-gray-800 px-2 py-1 rounded-md border dark:border-gray-600">
                                            {new Date(item.date).toLocaleDateString('ar-DZ')}
                                        </span>
                                        <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-emerald-500 dark:group-hover:text-emerald-400"/>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-gray-400 dark:text-gray-500">
                            لا يوجد سجل بحث حتى الآن.
                        </div>
                    )}
                  </>
              )}

              {activeTab === 'FAVORITES' && (
                  <>
                     <div className="flex items-center gap-3 mb-6">
                        <div className="bg-red-100 dark:bg-red-900/20 p-2 rounded-lg text-red-500 dark:text-red-400">
                            <Heart size={24} className="fill-current"/>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">الصيدليات المفضلة</h3>
                    </div>

                    {favorites.length > 0 ? (
                         <div className="grid gap-4">
                             {favorites.map(pharma => (
                                 <div key={pharma.id} className="border border-gray-100 dark:border-gray-700 rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-shadow dark:bg-gray-700/20">
                                     <div className="flex items-center gap-4">
                                         <div className="h-12 w-12 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 flex items-center justify-center font-bold text-lg">
                                             {pharma.name.charAt(0)}
                                         </div>
                                         <div>
                                             <h4 className="font-bold text-gray-800 dark:text-gray-200">{pharma.name}</h4>
                                             <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                 <MapPin size={12}/> {pharma.wilaya}, {pharma.commune}
                                             </p>
                                         </div>
                                     </div>
                                     <button 
                                        onClick={() => handleRemoveFavorite(pharma.id)}
                                        className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                                        title="إزالة من المفضلة"
                                     >
                                         <Heart size={20} className="fill-red-500 text-red-500" />
                                     </button>
                                 </div>
                             ))}
                         </div>
                    ) : (
                        <div className="text-center py-12">
                             <div className="bg-gray-50 dark:bg-gray-700/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300 dark:text-gray-600">
                                 <Heart size={32} />
                             </div>
                             <p className="text-gray-500 dark:text-gray-400">قائمة المفضلة فارغة.</p>
                             <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">يمكنك حفظ الصيدليات للوصول السريع إليها لاحقاً.</p>
                        </div>
                    )}
                  </>
              )}
          </div>
          
          {/* Quick Access Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Medicine Search Card */}
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full blur-2xl"></div>
                    </div>
                    <div className="relative z-10 flex flex-col items-start gap-4 h-full justify-between">
                        <div className="flex items-start gap-3">
                            <div className="bg-white/20 p-3 rounded-xl">
                                <Pill size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">هل تحتاج دواء؟</h3>
                                <p className="text-emerald-100 text-xs mt-1">ابحث فوراً عن الأدوية المتوفرة.</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => onNavigate('HOME')}
                            className="w-full bg-white text-emerald-700 px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-emerald-50 transition-colors text-sm"
                        >
                            بحث الآن
                        </button>
                    </div>
              </div>

              {/* Health Directory Card */}
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10">
                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white rounded-full blur-2xl"></div>
                    </div>
                    <div className="relative z-10 flex flex-col items-start gap-4 h-full justify-between">
                        <div className="flex items-start gap-3">
                            <div className="bg-white/20 p-3 rounded-xl">
                                <Building2 size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">الدليل الصحي</h3>
                                <p className="text-blue-100 text-xs mt-1">تصفح قائمة الأطباء والصيدليات.</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => onNavigate('HEALTH_DIRECTORY')}
                            className="w-full bg-white text-blue-700 px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-blue-50 transition-colors text-sm"
                        >
                            تصفح الدليل
                        </button>
                    </div>
              </div>

          </div>

      </div>
    </div>
  );
};
