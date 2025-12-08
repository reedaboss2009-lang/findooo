import React, { useState, useEffect, useRef } from 'react';
import { UserSession, MedicineAvailability, SearchRequest, DrugStat, AvailabilityStatus, AppNotification, Review } from '../types';
import { mockService } from '../services/mockService';
import { firebaseService } from '../services/firebaseService';
import { Package, Bell, BarChart2, Star, LogOut, TrendingUp, X, Check, Clock, Search, AlertCircle, ChevronRight, Filter, Plus, Settings, ShieldCheck, DollarSign, RefreshCw, MessageSquare } from 'lucide-react';

interface PharmacyDashboardProps {
  user: UserSession;
  onLogout: () => void;
  targetTab?: 'OVERVIEW' | 'STOCK' | 'ALERTS' | 'REVIEWS';
  navTimestamp?: number;
}

export const PharmacyDashboard: React.FC<PharmacyDashboardProps> = ({ user, onLogout, targetTab, navTimestamp }) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'STOCK' | 'ALERTS' | 'REVIEWS'>(targetTab || 'OVERVIEW');
  const [stock, setStock] = useState<MedicineAvailability[]>([]);
  const [searchRequests, setSearchRequests] = useState<SearchRequest[]>([]);
  // Use a ref to store hidden request IDs to prevent them from reappearing in the same session before backend update propagates
  const hiddenRequestsRef = useRef<Set<string>>(new Set());
  // Force update trigger
  const [, setForceUpdate] = useState(0);
  
  // Dashboard Stats
  const [myRating, setMyRating] = useState({ rating: 0, count: 0 });
  const [myRank, setMyRank] = useState(0);
  const [trendingMeds, setTrendingMeds] = useState<DrugStat[]>([]);
  
  // Reviews State
  const [reviews, setReviews] = useState<Review[]>([]);

  // Local state for stock filter
  const [stockFilter, setStockFilter] = useState(''); // ADDED: Stock filter state
  const [loading, setLoading] = useState(true);

  // Response Modal State
  const [responseModalOpen, setResponseModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<SearchRequest | null>(null);
  const [responseType, setResponseType] = useState<'AVAILABLE' | 'ALTERNATIVE'>('AVAILABLE');
  const [priceInput, setPriceInput] = useState('');
  const [altNameInput, setAltNameInput] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);

  // Sync with prop if provided (using timestamp to force update even if tab is same)
  useEffect(() => {
    if (targetTab) {
        setActiveTab(targetTab);
    }
  }, [targetTab, navTimestamp]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const init = async () => {
        if (!user.id) return;
        setLoading(true);

        // Fetch Requests if needed
        if (activeTab === 'OVERVIEW' || activeTab === 'ALERTS') {
            if (user.wilaya) {
                unsubscribe = mockService.listenToLiveRequests(user.wilaya, (requests) => {
                    // Filter out requests we've just responded to
                    const filtered = requests.filter(r => !hiddenRequestsRef.current.has(r.id));
                    setSearchRequests(filtered);
                });
            }
        }

        if (activeTab === 'OVERVIEW') {
            const ratingData = await mockService.getAverageRating(user.id);
            setMyRating(ratingData);
            
            if (user.wilaya) {
                try {
                    const allPharmacies = await mockService.getPharmacies();
                    const userWilayaTrimmed = (user.wilaya || '').trim();
                    const sameWilaya = allPharmacies.filter(p => (p.wilaya || '').trim() === userWilayaTrimmed);
                    
                    // Sort by Review Count (High to Low), then by Rating
                    sameWilaya.sort((a, b) => {
                         // Priority 1: Review Count (High to Low)
                         const countA = Number(a.reviews_count) || 0;
                         const countB = Number(b.reviews_count) || 0;
                         if (countB !== countA) return countB - countA;
                         
                         // Priority 2: Average Rating (High to Low)
                         const rateA = Number(a.rating) || 0;
                         const rateB = Number(b.rating) || 0;
                         return rateB - rateA;
                    });

                    const myIndex = sameWilaya.findIndex(p => p.id === user.id);
                    setMyRank(myIndex !== -1 ? myIndex + 1 : 0);
                } catch (e) {
                    console.error("Error calculating rank", e);
                }
                
                // Fetch LOCAL/WILAYA trending medicines
                mockService.getTrendingMedicines(user.wilaya).then(setTrendingMeds);
            }
        } 
        
        if (activeTab === 'STOCK') {
            const data = await mockService.getPharmacyStock(user.id);
            setStock(data);
        }

        if (activeTab === 'REVIEWS') {
            const data = await mockService.getReviews(user.id);
            // Sort by newest
            data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setReviews(data);
        }
        
        setLoading(false);
    };

    init();

    return () => {
        if (unsubscribe) unsubscribe();
    };
  }, [activeTab, user, navTimestamp]);

  const openResponseModal = (req: SearchRequest, type: 'AVAILABLE' | 'ALTERNATIVE') => {
      setSelectedRequest(req);
      setResponseType(type);
      setPriceInput('');
      setAltNameInput('');
      setResponseModalOpen(true);
  };

  const submitResponse = async () => {
      if (!user.id || !selectedRequest) return;
      
      setSubmittingResponse(true);
      try {
          let price: number | undefined;
          
          // Validation: Check if priceInput is not empty or just whitespace
          if (!priceInput || priceInput.trim() === '') {
               throw new Error("يرجى إدخال السعر");
          }
          
          price = parseFloat(priceInput);
          // Validation: Check if it's a valid number and positive
          if (isNaN(price) || price <= 0) { // MODIFIED: Added price <= 0 check
               throw new Error("السعر غير صالح (يجب أن يكون رقماً موجباً)");
          }

          // Validation
          const altName = responseType === 'ALTERNATIVE' ? altNameInput : undefined;
          if (responseType === 'ALTERNATIVE' && (!altName || altName.trim() === '')) {
              throw new Error("يرجى إدخال اسم الدواء البديل");
          }

          const status = responseType === 'AVAILABLE' ? AvailabilityStatus.AVAILABLE : AvailabilityStatus.ALTERNATIVE;

          await mockService.submitSearchResponse(selectedRequest.id, user.id, status, price, altName);
          
          // Hide request immediately
          hiddenRequestsRef.current.add(selectedRequest.id);
          setSearchRequests(prev => prev.filter(r => r.id !== selectedRequest.id));
          setForceUpdate(prev => prev + 1);

          setResponseModalOpen(false);
      } catch (e: any) {
          console.error("Submit response failed:", e);
          alert(`حدث خطأ أثناء إرسال الرد: ${e.message || 'يرجى المحاولة مرة أخرى'}`);
      } finally {
          setSubmittingResponse(false);
      }
  };

  const handleNotAvailable = async (req: SearchRequest) => {
      if (!user.id) return;
      try {
        await mockService.submitSearchResponse(req.id, user.id, AvailabilityStatus.NOT_AVAILABLE);
        // Hide request immediately
        hiddenRequestsRef.current.add(req.id);
        setSearchRequests(prev => prev.filter(r => r.id !== req.id));
        setForceUpdate(prev => prev + 1);
      } catch (e) {
          console.error("Not available submission failed", e);
      }
  };

  const toggleAvailability = async (item: MedicineAvailability) => {
      const newStatus = item.availability === AvailabilityStatus.AVAILABLE 
        ? AvailabilityStatus.NOT_AVAILABLE 
        : AvailabilityStatus.AVAILABLE;
      
      const updatedItem = { ...item, availability: newStatus, updated_at: new Date().toISOString() };
      
      await mockService.updateStock(updatedItem);
      setStock(prev => prev.map(s => s.id === item.id ? updatedItem : s));
  };
  
  // ADDED: Filtered Stock logic
  const filteredStock = stock.filter(item => 
      item.medicine_name.toLowerCase().includes(stockFilter.toLowerCase())
  );

  const renderStars = (rating: number) => {
      return (
          <div className="flex gap-0.5" dir="ltr">
              {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                      key={star}
                      size={14} 
                      className={`transition-colors ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200 dark:text-gray-600'}`}
                  />
              ))}
          </div>
      );
  };

  const SidebarItem = ({ id, icon: Icon, label, badge }: any) => (
      <button 
          onClick={() => setActiveTab(id)} 
          className={`w-full text-right p-4 rounded-2xl font-bold flex items-center justify-between transition-all duration-300 group ${
              activeTab === id 
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200 dark:shadow-none scale-[1.02]' 
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
      >
          <span className="flex items-center gap-3">
              <Icon size={20} className={activeTab === id ? 'text-white' : 'text-gray-400 group-hover:text-emerald-500'}/> 
              {label}
          </span>
          {badge > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  activeTab === id ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'
              }`}>
                  {badge}
              </span>
          )}
      </button>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 min-h-[85vh] animate-fade-in text-right" dir="rtl">
        
        {/* RESPONSE MODAL */}
        {responseModalOpen && selectedRequest && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 border border-gray-100 dark:border-gray-700">
                    <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
                        {responseType === 'AVAILABLE' ? <Check className="text-emerald-500" /> : <RefreshCw className="text-blue-500" />}
                        {responseType === 'AVAILABLE' ? 'تأكيد التوفر والسعر' : 'اقتراح بديل'}
                    </h3>
                    
                    <div className="mb-4 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl">
                        <p className="text-xs text-gray-400 font-bold mb-1">طلب المستخدم</p>
                        <p className="font-bold text-gray-800 dark:text-white">{selectedRequest.medicineName}</p>
                    </div>

                    {responseType === 'ALTERNATIVE' && (
                        <div className="mb-4">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">اسم الدواء البديل</label>
                            <input 
                                type="text" 
                                value={altNameInput}
                                onChange={(e) => setAltNameInput(e.target.value)}
                                placeholder="اكتب اسم البديل..."
                                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                                autoFocus
                            />
                        </div>
                    )}

                    <div className="mb-6">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                             {responseType === 'AVAILABLE' ? 'السعر (دج)' : 'سعر البديل (دج)'}
                        </label>
                        <div className="relative">
                            <input 
                                type="number" 
                                value={priceInput}
                                onChange={(e) => setPriceInput(e.target.value)}
                                placeholder="0.00"
                                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 pr-10 outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                            />
                            <DollarSign size={18} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={submitResponse}
                            disabled={submittingResponse || !priceInput || (responseType === 'ALTERNATIVE' && !altNameInput)}
                            className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                                responseType === 'AVAILABLE' 
                                ? 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300' 
                                : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300'
                            }`}
                        >
                            {submittingResponse ? 'جاري الإرسال...' : 'إرسال الرد'}
                        </button>
                        <button 
                            onClick={() => setResponseModalOpen(false)}
                            className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 py-3 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            إلغاء
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Sidebar Navigation */}
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-sm p-6 border border-gray-100 dark:border-gray-800 sticky top-24">
                <div className="text-center mb-8 pb-6 border-b border-gray-100 dark:border-gray-800">
                    <div className="relative w-20 h-20 mx-auto mb-4">
                        <div className="absolute inset-0 bg-emerald-100 dark:bg-emerald-900/30 rounded-full animate-pulse"></div>
                        <div className="relative w-full h-full bg-white dark:bg-gray-800 rounded-full flex items-center justify-center border-2 border-emerald-500 shadow-sm">
                            <Package size={32} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        {user.approved && (
                            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full border-2 border-white dark:border-gray-900" title="معتمد">
                                <ShieldCheck size={12} />
                            </div>
                        )}
                    </div>
                    <h2 className="font-black text-xl text-gray-800 dark:text-white mb-1">{user.name}</h2>
                    <p className="text-xs text-gray-400 font-medium bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-full w-fit mx-auto">
                        {user.wilaya}
                    </p>
                </div>
                
                <nav className="space-y-2">
                    <SidebarItem id="OVERVIEW" icon={BarChart2} label="نظرة عامة" />
                    <SidebarItem id="ALERTS" icon={Search} label="طلبات البحث" badge={searchRequests.length} />
                    <SidebarItem id="STOCK" icon={Package} label="المخزون" />
                    <SidebarItem id="REVIEWS" icon={Star} label="التقييمات" />
                    
                    <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
                        <button onClick={onLogout} className="w-full text-right p-4 rounded-2xl font-bold flex items-center gap-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <LogOut size={20}/> تسجيل الخروج
                        </button>
                    </div>
                </nav>
            </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-4 space-y-6">
            
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-emerald-900 to-teal-800 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-lg">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <div className="absolute top-1/2 left-10 -translate-y-1/2 w-48 h-48 bg-emerald-500/30 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                    <h1 className="text-3xl font-black mb-2">أهلاً بك، {user.name} 👋</h1>
                    <p className="text-emerald-100 max-w-xl text-lg opacity-90">تابع أداء صيدليتك، استجب لطلبات المستخدمين، وحدث مخزونك بسهولة.</p>
                </div>
            </div>

            {loading && activeTab === 'STOCK' ? (
                <div className="flex items-center justify-center py-20">
                     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                </div>
            ) : (
                <>
                    {activeTab === 'OVERVIEW' && (
                        <div className="space-y-6 animate-fade-in-up">
                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-6 relative overflow-hidden group hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab('REVIEWS')}>
                                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-yellow-400/10 rounded-full group-hover:scale-110 transition-transform"></div>
                                    <div className="bg-yellow-100 dark:bg-yellow-900/30 p-4 rounded-2xl text-yellow-600 dark:text-yellow-400 shadow-sm relative z-10">
                                        <Star size={28} className="fill-current"/>
                                    </div>
                                    <div className="relative z-10">
                                        <p className="text-sm text-gray-400 font-bold mb-1">التقييم العام</p>
                                        <div className="flex items-baseline gap-2">
                                            <h3 className="text-4xl font-black text-gray-800 dark:text-white">{myRating.rating}</h3>
                                            <span className="text-sm text-gray-400">/ 5</span>
                                        </div>
                                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-1">{myRating.count} مراجعة</p>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-6 relative overflow-hidden group hover:shadow-lg transition-shadow">
                                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-400/10 rounded-full group-hover:scale-110 transition-transform"></div>
                                    <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-2xl text-blue-600 dark:text-blue-400 shadow-sm relative z-10">
                                        <TrendingUp size={28}/>
                                    </div>
                                    <div className="relative z-10">
                                        <p className="text-sm text-gray-400 font-bold mb-1">ترتيبك في الولاية</p>
                                        <h3 className="text-4xl font-black text-gray-800 dark:text-white">#{myRank}</h3>
                                        <p className="text-xs text-gray-400 mt-1">حسب عدد التقييمات في {user.wilaya}</p>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-6 relative overflow-hidden group hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab('ALERTS')}>
                                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-red-400/10 rounded-full group-hover:scale-110 transition-transform"></div>
                                    <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-2xl text-red-600 dark:text-red-400 shadow-sm relative z-10">
                                        <Search size={28}/>
                                    </div>
                                    <div className="relative z-10">
                                        <p className="text-sm text-gray-400 font-bold mb-1">طلبات البحث</p>
                                        <h3 className="text-4xl font-black text-gray-800 dark:text-white">{searchRequests.length}</h3>
                                        <p className="text-xs text-gray-400 mt-1">نشطة حالياً</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Trending Medicines */}
                                <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 p-8">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                                            <TrendingUp size={20} className="text-emerald-500"/> الأكثر طلباً ({user.wilaya})
                                        </h3>
                                        <span className="text-xs text-gray-400 bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-full">آخر 24 ساعة</span>
                                    </div>
                                    <div className="space-y-6">
                                        {trendingMeds.length > 0 ? trendingMeds.map((med, idx) => (
                                            <div key={idx} className="group">
                                                <div className="flex justify-between items-end mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-6 h-6 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex items-center justify-center text-xs font-bold">#{idx + 1}</span>
                                                        <span className="font-bold text-gray-700 dark:text-gray-200">{med.name}</span>
                                                    </div>
                                                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{med.percentage}%</span>
                                                </div>
                                                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000 group-hover:bg-emerald-400" style={{ width: `${med.percentage}%` }}></div>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="text-center py-12 text-gray-400">لا توجد بيانات كافية حالياً</div>
                                        )}
                                    </div>
                                </div>

                                {/* Recent Alerts Preview */}
                                <div className="bg-gradient-to-b from-gray-900 to-gray-800 dark:from-black dark:to-gray-900 rounded-[2rem] shadow-xl p-6 text-white flex flex-col">
                                    <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                                        <AlertCircle size={20} className="text-red-400"/> تنبيهات عاجلة
                                    </h3>
                                    
                                    <div className="flex-1 space-y-4 overflow-y-auto max-h-[300px] pr-1 custom-scrollbar">
                                        {searchRequests.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-gray-500 text-center opacity-50">
                                                <Search size={40} className="mb-2"/>
                                                <p className="text-sm">لا توجد طلبات جديدة</p>
                                            </div>
                                        ) : (
                                            searchRequests.slice(0, 5).map(req => (
                                                <div key={req.id} className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/5 hover:bg-white/15 transition-colors">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <span className="font-bold text-emerald-300 block text-lg mb-1">{req.medicineName}</span>
                                                            <span className="text-[10px] text-gray-300 flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded w-fit">
                                                                <Clock size={10}/> منذ قليل
                                                            </span>
                                                        </div>
                                                        <button 
                                                            onClick={() => setActiveTab('ALERTS')} 
                                                            className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-400 transition-colors"
                                                        >
                                                            <ChevronRight size={16} className="rtl:rotate-180"/>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    
                                    {searchRequests.length > 0 && (
                                        <button 
                                            onClick={() => setActiveTab('ALERTS')}
                                            className="w-full mt-6 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-bold text-sm transition-colors border border-white/10"
                                        >
                                            عرض كل الطلبات ({searchRequests.length})
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'ALERTS' && (
                        <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 p-8 min-h-[600px] animate-fade-in">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="font-bold text-2xl text-gray-800 dark:text-white flex items-center gap-3">
                                         <span className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-xl text-emerald-600 dark:text-emerald-400"><Search size={24}/></span>
                                         طلبات البحث النشطة
                                    </h3>
                                    <p className="text-gray-400 text-sm mt-2 mr-14">استجب لطلبات المستخدمين في {user.wilaya} لزيادة مبيعاتك.</p>
                                </div>
                                <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full border border-green-100 dark:border-green-800">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                    <span className="text-xs font-bold text-green-700 dark:text-green-400">تحديث مباشر</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {searchRequests.length === 0 ? (
                                    <div className="text-center py-24 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                                        <div className="bg-white dark:bg-gray-800 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                                            <Search size={40} className="text-gray-300 dark:text-gray-600" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-500 dark:text-gray-400">لا توجد طلبات بحث حالياً</h3>
                                        <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">ستظهر هنا طلبات المستخدمين الذين يبحثون عن أدوية في منطقتك</p>
                                    </div>
                                ) : (
                                    searchRequests.map(req => (
                                        <div key={req.id} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg hover:border-emerald-200 dark:hover:border-emerald-700 transition-all duration-300">
                                            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                                                <div className="flex items-center gap-5 w-full md:w-auto">
                                                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50">
                                                        <Package size={32} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black text-2xl text-gray-800 dark:text-white mb-1">{req.medicineName}</h4>
                                                        <div className="flex items-center gap-3">
                                                            <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md text-xs font-bold text-gray-600 dark:text-gray-300">{req.wilaya}</span>
                                                            <span className="flex items-center gap-1 text-xs text-gray-400"><Clock size={12}/> {new Date(req.timestamp).toLocaleTimeString('ar-DZ', {hour: '2-digit', minute:'2-digit'})}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                                                    <button 
                                                        onClick={() => openResponseModal(req, 'AVAILABLE')}
                                                        className="flex-1 md:flex-none bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 dark:shadow-none hover:bg-emerald-700 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <Check size={18} /> متوفر
                                                    </button>
                                                    <button 
                                                        onClick={() => openResponseModal(req, 'ALTERNATIVE')}
                                                        className="flex-1 md:flex-none bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-6 py-3 rounded-xl font-bold hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <RefreshCw size={18} /> يوجد بديل
                                                    </button>
                                                    <button 
                                                        onClick={() => handleNotAvailable(req)}
                                                        className="flex-1 md:flex-none bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-4 py-3 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-red-500 transition-all"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'STOCK' && (
                        <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 p-8 animate-fade-in">
                            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
                                 <div>
                                    <h3 className="font-bold text-2xl text-gray-800 dark:text-white flex items-center gap-3">
                                        <span className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-xl text-blue-600 dark:text-blue-400"><Package size={24}/></span>
                                        إدارة المخزون
                                    </h3>
                                    <p className="text-gray-400 text-sm mt-2 mr-14">قم بتحديث حالة توفر الأدوية ليظهر للمستخدمين.</p>
                                 </div>
                                 {/* NEW: Stock Search/Filter Input */}
                                 <div className="relative w-full md:w-64">
                                     <input
                                         type="text"
                                         placeholder="ابحث باسم الدواء..."
                                         value={stockFilter}
                                         onChange={(e) => setStockFilter(e.target.value)}
                                         className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 pr-10 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm"
                                     />
                                     <Search size={18} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
                                 </div>
                                 {/* END NEW */}
                            </div>

                            <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800">
                                <table className="w-full text-right">
                                    <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-400 text-xs uppercase font-bold tracking-wider">
                                        <tr>
                                            <th className="p-5">اسم الدواء</th>
                                            <th className="p-5">الحالة الحالية</th>
                                            <th className="p-5">آخر تحديث</th>
                                            <th className="p-5 text-center">تغيير الحالة</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                                        {filteredStock.map(item => ( {/* CHANGED: Using filteredStock */}
                                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                                                <td className="p-5 font-bold text-gray-800 dark:text-white text-base">
                                                    {item.medicine_name}
                                                </td>
                                                <td className="p-5">
                                                    {item.availability === AvailabilityStatus.AVAILABLE ? (
                                                        <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs px-3 py-1.5 rounded-full font-bold inline-flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800/50">
                                                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> متوفر
                                                        </span>
                                                    ) : (
                                                        <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs px-3 py-1.5 rounded-full font-bold inline-flex items-center gap-1.5 border border-red-200 dark:border-red-800/50">
                                                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span> غير متوفر
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-5 text-sm text-gray-400 font-mono">
                                                    {new Date(item.updated_at).toLocaleDateString('ar-DZ')}
                                                </td>
                                                <td className="p-5 flex justify-center">
                                                    <button 
                                                        onClick={() => toggleAvailability(item)}
                                                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm ${
                                                            item.availability === AvailabilityStatus.AVAILABLE 
                                                            ? 'text-red-500 bg-white border border-gray-200 hover:bg-red-50 hover:border-red-200 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-red-900/20' 
                                                            : 'text-white bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200 dark:shadow-none'
                                                        }`}
                                                        title="تبديل الحالة"
                                                    >
                                                        {item.availability === AvailabilityStatus.AVAILABLE ? <X size={20}/> : <Check size={20}/>}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {/* CHANGED: Conditional rendering for no stock/no results */}
                                {stock.length === 0 && (
                                    <div className="text-center py-16 text-gray-400">
                                        <Package size={48} className="mx-auto mb-4 opacity-20"/>
                                        <p>لا توجد أدوية في المخزون.</p>
                                    </div>
                                )}
                                {stock.length > 0 && filteredStock.length === 0 && (
                                    <div className="text-center py-16 text-gray-400">
                                        <Filter size={48} className="mx-auto mb-
