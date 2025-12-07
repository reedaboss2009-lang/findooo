
import React, { useState, useEffect } from 'react';
import { Pharmacy } from '../types';
import { WILAYAS } from '../constants';
import { mockService } from '../services/mockService';
import { MapPin, Search, ChevronRight, Star, Building2, Phone, ShieldCheck, ArrowDownAZ, AlertTriangle } from 'lucide-react';

interface PharmaciesDirectoryProps {
    onSelectPharmacy: (pharmacy: Pharmacy) => void;
}

export const PharmaciesDirectory: React.FC<PharmaciesDirectoryProps> = ({ onSelectPharmacy }) => {
    const [sortedPharmacies, setSortedPharmacies] = useState<(Pharmacy & { avgRating: number, ratingCount: number })[]>([]);
    const [filteredPharmacies, setFilteredPharmacies] = useState<(Pharmacy & { avgRating: number, ratingCount: number })[]>([]);
    
    // Filters
    const [selectedWilaya, setSelectedWilaya] = useState('الكل');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'RATING' | 'NAME'>('RATING');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await mockService.getPharmacies();
                
                const withRatings = data.map((p) => ({ 
                    ...p, 
                    avgRating: p.rating || 0, 
                    ratingCount: p.reviews_count || 0 
                }));

                setSortedPharmacies(withRatings);
            } catch (err: any) {
                console.error("Failed to load pharmacies:", err);
                setError(err.message || "تعذر تحميل قائمة الصيدليات. تأكد من الاتصال بالإنترنت.");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    useEffect(() => {
        let results = [...sortedPharmacies];

        if (selectedWilaya !== 'الكل') {
            results = results.filter(p => p.wilaya === selectedWilaya);
        }

        if (searchTerm) {
            results = results.filter(p => 
                (p.name && p.name.includes(searchTerm)) || 
                (p.commune && p.commune.includes(searchTerm))
            );
        }

        // Apply Sorting
        if (sortBy === 'RATING') {
            results.sort((a, b) => {
                if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
                return b.ratingCount - a.ratingCount;
            });
        } else if (sortBy === 'NAME') {
            results.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
        }

        setFilteredPharmacies(results);
    }, [selectedWilaya, searchTerm, sortedPharmacies, sortBy]);

    return (
        <div className="animate-fade-in pb-20 pt-4">
            
            <div className="max-w-7xl mx-auto px-4">
                
                {/* MODERN SEARCH BAR */}
                <div className="relative z-20 mb-8 px-2 md:px-0">
                    <div className="
                        group
                        bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl
                        rounded-[2rem] md:rounded-full 
                        p-2 
                        shadow-[0_8px_40px_rgba(0,0,0,0.06)] dark:shadow-black/40
                        border border-white/50 dark:border-gray-700/50
                        flex flex-col md:flex-row items-center gap-2 
                        w-full max-w-5xl mx-auto
                        transition-all duration-300
                        hover:shadow-[0_12px_50px_rgba(0,0,0,0.1)] hover:scale-[1.005]
                    ">
                        
                        {/* Search Input Section */}
                        <div className="flex-[3] w-full relative h-14 flex items-center px-6 bg-gray-50/50 dark:bg-gray-900/50 md:bg-transparent md:dark:bg-transparent rounded-[1.8rem] md:rounded-none transition-colors">
                            <Search className="text-gray-400 ml-4 shrink-0 transition-colors group-hover:text-emerald-500" size={24}/>
                            <input 
                                type="text" 
                                placeholder="ابحث باسم الصيدلية أو البلدية..." 
                                className="w-full bg-transparent border-none outline-none p-0 text-gray-800 dark:text-white font-bold placeholder-gray-400 text-base"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Divider (Desktop) */}
                        <div className="hidden md:block w-px h-8 bg-gray-200 dark:bg-gray-700 mx-2"></div>

                        {/* Wilaya Dropdown Section */}
                        <div className="w-full md:w-72 relative h-14 flex items-center px-6 bg-gray-50/50 dark:bg-gray-900/50 md:bg-transparent md:dark:bg-transparent rounded-[1.8rem] md:rounded-none cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700/30 md:rounded-full transition-colors">
                             <MapPin className="text-emerald-500 ml-3 shrink-0" size={20}/>
                             <div className="flex-1 min-w-0">
                                <span className="text-[10px] text-gray-400 block font-bold mb-0.5 uppercase tracking-wider">الموقع</span>
                                <select 
                                    className="w-full bg-transparent border-none outline-none p-0 text-gray-800 dark:text-white font-bold appearance-none cursor-pointer text-sm"
                                    value={selectedWilaya}
                                    onChange={(e) => setSelectedWilaya(e.target.value)}
                                >
                                    {WILAYAS.map(w => <option key={w} value={w} className="text-gray-900 bg-white dark:bg-gray-800 py-2">{w}</option>)}
                                </select>
                             </div>
                            <ChevronRight className="absolute left-6 text-gray-400 rotate-90 md:rotate-0 pointer-events-none" size={16}/>
                        </div>

                        {/* Search Action Button */}
                        <div className="w-full md:w-auto p-1">
                            <button className="w-full md:w-auto bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white h-12 md:h-12 md:w-12 px-6 md:px-0 rounded-[1.5rem] md:rounded-full font-bold shadow-lg shadow-emerald-500/20 dark:shadow-emerald-900/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                                <Search size={20} className="md:block hidden" />
                                <span className="md:hidden">بحث</span>
                            </button>
                        </div>
                    </div>
                </div>
                
                {/* ERROR MESSAGE */}
                {error && (
                    <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 flex items-center gap-3 animate-fade-in shadow-sm max-w-4xl mx-auto">
                        <AlertTriangle size={24} />
                        <span className="font-bold">{error}</span>
                    </div>
                )}

                {/* Filters & Results Count */}
                <div className="flex flex-wrap justify-between items-center mb-6 px-4 gap-4 max-w-7xl mx-auto">
                    <div className="text-sm font-bold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-4 py-2 rounded-full shadow-sm border border-gray-100 dark:border-gray-700">
                         تم العثور على <span className="text-emerald-600 dark:text-emerald-400 font-black px-1">{filteredPharmacies.length}</span> صيدلية
                    </div>
                    
                    {/* Sort Toggles */}
                    <div className="flex items-center gap-1 bg-white dark:bg-gray-800 p-1.5 rounded-full border border-gray-100 dark:border-gray-700 shadow-sm">
                            <div className="text-[10px] font-bold text-gray-400 px-3 uppercase tracking-wider hidden sm:block">
                                ترتيب حسب
                            </div>
                            <button 
                            onClick={() => setSortBy('RATING')}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${sortBy === 'RATING' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                            >
                            <Star size={12} className={sortBy === 'RATING' ? 'fill-current' : ''} />
                            <span>الأعلى تقييماً</span>
                            </button>
                            <button 
                            onClick={() => setSortBy('NAME')}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${sortBy === 'NAME' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                            >
                            <ArrowDownAZ size={14} />
                            <span>أبجدياً</span>
                            </button>
                    </div>
                </div>

                {loading && (
                    <div className="flex justify-center py-32">
                        <div className="flex gap-2">
                            <span className="w-3 h-3 bg-emerald-500 rounded-full animate-[bounce_1s_infinite]"></span>
                            <span className="w-3 h-3 bg-emerald-500 rounded-full animate-[bounce_1s_infinite_0.2s]"></span>
                            <span className="w-3 h-3 bg-emerald-500 rounded-full animate-[bounce_1s_infinite_0.4s]"></span>
                        </div>
                    </div>
                )}

                {/* MODERN CARD GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {!loading && filteredPharmacies.length === 0 && !error ? (
                        <div className="col-span-full text-center py-20 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-[3rem] border border-dashed border-gray-200 dark:border-gray-700">
                            <Building2 size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-6" />
                            <h3 className="text-2xl font-bold text-gray-500 dark:text-gray-400">لا توجد صيدليات مطابقة</h3>
                            <p className="text-gray-400 mt-2">جرب تغيير كلمات البحث أو الولاية.</p>
                        </div>
                    ) : (filteredPharmacies.slice(0, 50).map((pharmacy) => ( 
                        <div 
                            key={pharmacy.id} 
                            className="group relative bg-white dark:bg-gray-800 rounded-[2rem] p-5 border border-white dark:border-gray-700 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-black/20 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] hover:-translate-y-2 transition-all duration-300 flex flex-col h-full overflow-hidden"
                            onClick={() => onSelectPharmacy(pharmacy)}
                        >
                            {/* Decorative Background Blob */}
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-50 dark:bg-emerald-900/10 rounded-full blur-2xl group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/20 transition-colors -z-10"></div>

                            {/* Header: Icon + Rating Badge */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 relative z-10">
                                    <Building2 size={22} strokeWidth={2} />
                                </div>
                                
                                <div className="flex items-center gap-1.5 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-full border border-yellow-100 dark:border-yellow-900/30">
                                    <span className="font-black text-yellow-700 dark:text-yellow-400 text-xs">{pharmacy.avgRating.toFixed(1)}</span>
                                    <Star size={10} className="fill-yellow-400 text-yellow-400" />
                                </div>
                            </div>

                            {/* Main Info */}
                            <div className="flex-1 mb-4">
                                <h3 className="text-lg font-black text-gray-800 dark:text-white leading-tight mb-2 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                                    {pharmacy.name}
                                </h3>
                                
                                <div className="space-y-2">
                                    <div className="flex items-start gap-2 text-gray-500 dark:text-gray-400 text-xs">
                                        <MapPin size={14} className="shrink-0 text-emerald-500 mt-0.5"/>
                                        <span className="font-medium leading-snug">{pharmacy.wilaya} - {pharmacy.commune || 'غير محدد'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs">
                                        <Phone size={14} className="shrink-0 text-emerald-500"/>
                                        <span className="font-mono dir-ltr font-medium tracking-wider">{pharmacy.phone}</span>
                                    </div>
                                </div>

                                {/* Tags */}
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {pharmacy.approved && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-[9px] font-bold border border-emerald-100 dark:border-emerald-900/30">
                                            <ShieldCheck size={10} /> معتمد
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Footer Button */}
                            <div className="pt-4 mt-auto border-t border-gray-100 dark:border-gray-700/50">
                                <button className="w-full py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 font-bold text-xs group-hover:bg-emerald-600 group-hover:text-white transition-colors flex items-center justify-center gap-2">
                                    عرض التفاصيل
                                    <ChevronRight size={14} className="rtl:rotate-180" />
                                </button>
                            </div>

                        </div>
                    )))}
                </div>
            </div>
        </div>
    );
};
