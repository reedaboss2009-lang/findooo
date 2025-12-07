
import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, CheckCircle, XCircle, RefreshCw, ChevronRight, Loader2, Clock, Building2, Star, ArrowRight, ArrowLeft } from 'lucide-react';
import { WILAYAS } from '../constants';
import { SearchResponse, AvailabilityStatus, Pharmacy, UserSession, SearchRequest, ViewState } from '../types';
import { mockService } from '../services/mockService';
import { firebaseService } from '../services/firebaseService';
import { PharmacyDetails } from './PharmacyDetails';

interface HomeViewProps {
  onPharmacyClick: (pharmacy: Pharmacy) => void;
  user: UserSession;
  onNavigate: (view: ViewState) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onPharmacyClick, user, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [wilaya, setWilaya] = useState(WILAYAS[16]); 
  
  const [isSearching, setIsSearching] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [liveResponses, setLiveResponses] = useState<SearchResponse[]>([]);
  
  const [selectedPharmacyInModal, setSelectedPharmacyInModal] = useState<Pharmacy | null>(null);

  const responseListenerUnsubscribe = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
        if (responseListenerUnsubscribe.current) responseListenerUnsubscribe.current();
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value);
  };

  const executeSearch = async (searchTerm: string) => {
    if (!searchTerm) return;
    
    setIsSearching(true);
    setLiveResponses([]);
    setSelectedPharmacyInModal(null);
    
    // Clear previous search artifacts
    if (responseListenerUnsubscribe.current) {
        responseListenerUnsubscribe.current();
    }

    try {
      const id = await mockService.startSearchSession(searchTerm, wilaya);
      setRequestId(id);

      // 1. Create Request Object
      const reqObj: SearchRequest = {
          id: id,
          medicineName: searchTerm,
          wilaya: wilaya,
          timestamp: new Date().toISOString(),
          status: 'active'
      };
      
      // 2. Save Request to Firebase (Global and User History if logged in)
      await firebaseService.addSearchRequest(user.id || null, reqObj);

      // 3. Notify Pharmacies in this Wilaya
      await firebaseService.notifyPharmaciesOfSearch(wilaya, searchTerm);

      // 4. Listen for Responses Realtime
      responseListenerUnsubscribe.current = firebaseService.listenToSearchResponses(id, (responses) => {
          setLiveResponses(responses);
      });

    } catch (err) {
      console.error(err);
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query);
  };

  const cancelSearch = () => {
      if (responseListenerUnsubscribe.current) responseListenerUnsubscribe.current();
      setIsSearching(false);
  };

  const getStatusBadge = (status: AvailabilityStatus) => {
    switch (status) {
      case AvailabilityStatus.AVAILABLE:
        return <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 rounded-full text-xs font-bold shadow-sm"><CheckCircle size={14}/> متوفر</span>;
      case AvailabilityStatus.NOT_AVAILABLE:
        return <span className="flex items-center gap-1 text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-3 py-1 rounded-full text-xs font-bold shadow-sm"><XCircle size={14}/> غير متوفر</span>;
      case AvailabilityStatus.ALTERNATIVE:
        return <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full text-xs font-bold shadow-sm"><RefreshCw size={14}/> بديل</span>;
    }
  };

  if (isSearching && liveResponses.length === 0) {
      return (
          <div className="fixed inset-0 bg-emerald-900/95 dark:bg-emerald-950/95 z-50 flex flex-col items-center justify-center text-white p-6 text-center animate-fade-in backdrop-blur-sm">
              <div className="relative mb-8">
                  <div className="absolute inset-0 bg-emerald-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
                  <div className="bg-white/10 p-6 rounded-full relative border border-white/20 shadow-2xl">
                    <Loader2 className="w-16 h-16 animate-spin text-emerald-400" />
                  </div>
              </div>
              <h2 className="text-4xl font-bold mb-4 tracking-tight">🔎 جاري البحث...</h2>
              <p className="text-emerald-100 text-xl max-w-lg leading-relaxed mb-10 font-light">
                  تم إرسال طلبك للصيدليات في <span className="font-bold text-white border-b border-emerald-400 pb-1">{wilaya}</span>.
                  <br/>نحن بانتظار رد الصيادلة، يرجى البقاء في الصفحة.
              </p>
              <button onClick={cancelSearch} className="mt-12 text-sm text-emerald-300 hover:text-white underline transition-colors">
                  إلغاء البحث
              </button>
          </div>
      );
  }

  if (isSearching || liveResponses.length > 0) {
      return (
        <div className="space-y-6 animate-fade-in max-w-5xl mx-auto py-8 relative px-4">
            {selectedPharmacyInModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-800">
                         <div className="p-2">
                             <PharmacyDetails 
                                pharmacy={selectedPharmacyInModal} 
                                user={user} 
                                onBack={() => setSelectedPharmacyInModal(null)} 
                             />
                         </div>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4 sticky top-2 md:top-24 z-30 transition-all">
                <div className="flex items-center gap-5 w-full">
                    <div className="bg-emerald-50 dark:bg-emerald-900/30 p-4 rounded-full shadow-inner relative">
                        <span className="absolute top-1 right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        <Search className="text-emerald-600 dark:text-emerald-400" size={28}/>
                    </div>
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">{query}</h2>
                        <div className="flex items-center gap-3 text-sm">
                            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md"><MapPin size={14}/> {wilaya}</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold animate-pulse">جاري انتظار الردود...</span>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={() => {setIsSearching(false); setLiveResponses([]); setQuery('');}} 
                    className="w-full md:w-auto bg-gray-100 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-600 dark:text-gray-300 hover:text-red-600 px-6 py-3 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                >
                    <ArrowRight size={18} className="rtl:rotate-180"/> العودة للبحث
                </button>
            </div>

            {liveResponses.length > 0 && (
                <div className="grid gap-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="font-bold text-gray-700 dark:text-gray-300 text-lg">النتائج المستلمة</h3>
                        <span className="bg-emerald-600 text-white text-xs px-3 py-1 rounded-full font-bold shadow-sm">{liveResponses.length} ردود</span>
                    </div>
                    {liveResponses.map((item) => (
                        <div key={item.id} className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-md border border-gray-100 dark:border-gray-800 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="bg-emerald-50 dark:bg-emerald-900/30 h-12 w-12 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xl shrink-0">
                                        {item.pharmacy.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg text-gray-800 dark:text-gray-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">{item.pharmacy.name}</h4>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-1 mt-1"><MapPin size={12}/> {item.pharmacy.wilaya} - {item.pharmacy.commune}</p>
                                    </div>
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-4 md:gap-8 bg-gray-50 dark:bg-gray-800 md:bg-transparent p-3 md:p-0 rounded-lg">
                                    <div className="flex flex-col items-center min-w-[80px]">
                                        <span className="text-xs text-gray-400 font-bold mb-1">الحالة</span>
                                        {getStatusBadge(item.status)}
                                    </div>
                                    
                                    {/* Middle Section: Price / Alternative info */}
                                    {item.status === AvailabilityStatus.ALTERNATIVE ? (
                                        <div className="flex flex-col items-center min-w-[120px] border-r border-l border-gray-200 dark:border-gray-700 px-4 text-center">
                                            <span className="text-xs text-blue-500 font-bold mb-1">البديل المقترح</span>
                                            <span className="font-bold text-gray-800 dark:text-white text-base mb-0.5">{item.alternativeName}</span>
                                            {item.price && <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{item.price} دج</span>}
                                        </div>
                                    ) : (
                                        item.price && (
                                            <div className="flex flex-col items-center min-w-[100px] border-r border-l border-gray-200 dark:border-gray-700 px-4">
                                                <span className="text-xs text-gray-400 font-bold mb-1">السعر</span>
                                                <span className="font-bold text-gray-800 dark:text-gray-100 text-lg">
                                                    {item.price} دج
                                                </span>
                                            </div>
                                        )
                                    )}
                                    
                                    {/* RATING BUTTON */}
                                    <div className="flex flex-col items-center justify-center px-2">
                                         <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedPharmacyInModal(item.pharmacy);
                                            }}
                                            className="flex flex-col items-center gap-1 text-yellow-500 hover:text-yellow-600 transition-colors group/rate"
                                            title="تقييم الصيدلية"
                                         >
                                             <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-full group-hover/rate:bg-yellow-100 dark:group-hover/rate:bg-yellow-900/40 border border-yellow-200 dark:border-yellow-900/50">
                                                <Star size={20} className="fill-current" />
                                             </div>
                                             <span className="text-[10px] font-bold">تقييم</span>
                                         </button>
                                    </div>

                                    <div className="flex flex-col items-center min-w-[80px]">
                                        <span className="text-xs text-gray-400 font-bold mb-1">الرد</span>
                                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                            <Clock size={10}/> منذ لحظات
                                        </span>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => setSelectedPharmacyInModal(item.pharmacy)}
                                    className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-100 dark:shadow-none hover:bg-emerald-700 hover:shadow-emerald-200 transition-all flex items-center justify-center gap-2"
                                >
                                    التفاصيل <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      );
  }

  return (
    <div className="w-full min-h-[65vh] flex flex-col relative rounded-[2rem] overflow-hidden shadow-2xl bg-emerald-900 animate-fade-in">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-teal-800 to-emerald-950">
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-[100px] animate-pulse"></div>
            <div className="absolute bottom-[10%] right-[-5%] w-[300px] h-[300px] bg-teal-400/20 rounded-full blur-[80px]"></div>
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(rgba(255,255,255,0.2)_1px,transparent_1px)] [background-size:24px_24px]"></div>
        </div>
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 md:p-10 text-center">
            <div className="mb-6 animate-fade-in-up">
                 <h2 className="text-lg md:text-2xl text-transparent bg-clip-text bg-gradient-to-b from-white to-emerald-200 font-medium font-[Amiri,serif] drop-shadow-[0_4px_6px_rgba(0,0,0,0.3)] whitespace-nowrap tracking-wide leading-relaxed">
                    <span className="text-xl md:text-3xl text-emerald-400 opacity-80 mx-2">﴾</span>
                     وَإِذَا مَرِضْتُ فَهُوَ يَشْفِينِ 
                    <span className="text-xl md:text-3xl text-emerald-400 opacity-80 mx-2">﴿</span>
                </h2>
                <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent mx-auto mt-2 opacity-50"></div>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight leading-tight animate-fade-in-up delay-100 drop-shadow-xl">
                دليل الصيدليات في الجزائر
            </h1>
            <p className="text-base md:text-lg text-emerald-50/90 mb-8 max-w-2xl mx-auto font-light leading-relaxed animate-fade-in-up delay-200">
                نظام متكامل يربطك بأقرب الصيدليات، للعثور على الاستشارة الصحيحة وتوفّر الأدوية بسهولة.
            </p>
            <form onSubmit={handleSearchSubmit} className="w-full max-w-4xl bg-white dark:bg-white/10 dark:backdrop-blur-xl border border-gray-200 dark:border-white/20 p-1.5 rounded-[2rem] shadow-2xl flex flex-col md:flex-row items-center gap-2 animate-fade-in-up delay-300 relative z-50">
                <div className="relative w-full md:w-1/4 group bg-gray-50 dark:bg-gray-900/95 rounded-[1.7rem] h-12 md:h-14 transition-all hover:scale-[1.02] shadow-sm">
                    <MapPin className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-600" size={18}/>
                    <select 
                        className="w-full h-full pl-4 pr-11 rounded-[1.7rem] bg-transparent border-none outline-none font-bold text-gray-900 dark:text-white appearance-none cursor-pointer text-sm md:text-base"
                        value={wilaya}
                        onChange={(e) => setWilaya(e.target.value)}
                    >
                        {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                     <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none">
                        <ChevronRight className="rotate-90 text-gray-400" size={14}/>
                    </div>
                </div>
                <div className="relative w-full flex-1 bg-gray-50 dark:bg-gray-900/95 rounded-[1.7rem] h-12 md:h-14 transition-all hover:scale-[1.02] flex items-center shadow-sm">
                    <div className="absolute right-5 text-gray-400">
                        <Search size={20}/>
                    </div>
                    <input 
                        type="text" 
                        placeholder="ما هو الدواء الذي تبحث عنه؟"
                        className="w-full h-full pl-6 pr-12 bg-transparent border-none outline-none font-bold text-gray-900 dark:text-white text-sm md:text-base placeholder-gray-500 dark:placeholder-gray-400"
                        value={query}
                        onChange={handleInputChange}
                    />
                </div>
                <button type="submit" className="w-full md:w-auto h-12 md:h-14 px-8 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-[1.7rem] font-bold shadow-lg shadow-emerald-900/20 transition-all active:scale-95 flex items-center justify-center gap-2 text-base whitespace-nowrap">
                    بحث
                </button>
            </form>

            <div className="mt-8 flex justify-center w-full max-w-lg animate-fade-in-up delay-500 relative z-20 px-4 md:px-0">
                <button 
                   onClick={() => onNavigate('HEALTH_DIRECTORY')} 
                   className="w-full md:w-auto px-8 bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md p-3 rounded-2xl flex items-center gap-3 transition-all group shadow-lg"
                >
                    <div className="bg-white/20 p-2.5 rounded-full text-white group-hover:scale-110 transition-transform shadow-inner border border-white/10">
                        <Building2 size={20} />
                    </div>
                    <span className="text-white font-bold text-base">تصفح دليل الصيدليات</span>
                </button>
            </div>
        </div>
    </div>
  );
};
