


import React, { useState, useEffect } from 'react';
import { Doctor } from '../types';
import { WILAYAS, SPECIALTIES } from '../constants';
import { mockService } from '../services/mockService';
import { MapPin, Search, Star, ShieldCheck, UserRound, Phone, Map, ChevronRight, Stethoscope } from 'lucide-react';

interface DoctorsDirectoryProps {
    onSelectDoctor: (doctor: Doctor) => void;
}

export const DoctorsDirectory: React.FC<DoctorsDirectoryProps> = ({ onSelectDoctor }) => {
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
    
    // Filters
    const [selectedWilaya, setSelectedWilaya] = useState('الكل');
    const [selectedSpecialty, setSelectedSpecialty] = useState('الكل');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<'RATING' | 'NEAREST'>('RATING');

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const data = await mockService.getDoctors();
                setDoctors(data);
                setFilteredDoctors(data);
            } catch (err) {
                console.error("Failed to load doctors:", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    useEffect(() => {
        let results = doctors;

        if (selectedWilaya !== 'الكل') {
            results = results.filter(d => d.wilaya === selectedWilaya);
        }

        if (selectedSpecialty !== 'الكل') {
            results = results.filter(d => d.specialty === selectedSpecialty);
        }

        if (searchTerm) {
            results = results.filter(d => 
                d.name.includes(searchTerm) || 
                d.specialty.includes(searchTerm) ||
                d.commune.includes(searchTerm)
            );
        }

        if (sortBy === 'RATING') {
            results = [...results].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        }

        setFilteredDoctors(results);
    }, [selectedWilaya, selectedSpecialty, searchTerm, sortBy, doctors]);

    const handleMapClick = (e: React.MouseEvent, doctor: Doctor) => {
        e.stopPropagation();
        if (doctor.lat && doctor.lng) {
            window.open(`https://www.google.com/maps/search/?api=1&query=${doctor.lat},${doctor.lng}`, '_blank');
        } else {
             const query = encodeURIComponent(`${doctor.name} ${doctor.specialty} ${doctor.wilaya}`);
             window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
        }
    };
    
    const handleCallClick = (e: React.MouseEvent, phone: string) => {
        e.stopPropagation();
        window.location.href = `tel:${phone}`;
    };

    return (
        <div className="animate-fade-in pb-20">
            
            {/* HERO SECTION */}
            <div className="bg-emerald-900 rounded-[3rem] p-10 md:p-14 mb-16 relative overflow-hidden text-center shadow-2xl mx-4 lg:mx-0 isolate">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-emerald-500 rounded-full blur-[100px] opacity-40"></div>
                <div className="absolute top-1/2 -right-24 w-80 h-80 bg-teal-400 rounded-full blur-[120px] opacity-30"></div>
                
                <div className="relative z-10 pb-12">
                    <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight drop-shadow-sm">
                        نخبة الأطباء في الجزائر
                    </h2>
                    <p className="text-emerald-100 text-lg max-w-2xl mx-auto font-light leading-relaxed opacity-90">
                        استكشف الدليل الشامل لأفضل الأطباء والمختصّين، مصنّفين حسب الولاية والتخصص وتقييمات المرضى.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4">
                
                {/* SEARCH BAR & FILTERS CONTAINER */}
                <div className="relative z-20 -mt-28 mb-12 px-2 md:px-0">
                    <div className="bg-white dark:bg-gray-800 p-2 rounded-[2rem] shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row items-center gap-2 max-w-5xl mx-auto ring-1 ring-black/5 relative overflow-hidden group-focus-within:ring-2 ring-emerald-500/50 transition-all">
                        
                        {/* Search Input */}
                        <div className="flex-1 w-full relative h-14 md:h-16 flex items-center px-4 md:px-8 bg-gray-50 dark:bg-gray-900/50 md:bg-transparent md:dark:bg-transparent rounded-2xl md:rounded-none transition-colors">
                            <Search className="text-gray-400 ml-4 shrink-0" size={24}/>
                            <div className="flex-1">
                                <label className="block text-[10px] text-gray-400 font-bold mb-0.5">ابحث عن طبيب</label>
                                <input 
                                    type="text" 
                                    placeholder="اسم الطبيب أو التخصص..." 
                                    className="w-full bg-transparent border-none outline-none p-0 text-gray-800 dark:text-white font-bold placeholder-gray-300 text-base"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Divider (Desktop) */}
                        <div className="hidden md:block w-px h-10 bg-gray-200 dark:bg-gray-700 mx-2"></div>

                        {/* Wilaya Dropdown */}
                        <div className="w-full md:w-1/4 relative h-14 md:h-16 flex items-center px-4 md:px-8 bg-gray-50 dark:bg-gray-900/50 md:bg-transparent md:dark:bg-transparent rounded-2xl md:rounded-none cursor-pointer group/wilaya">
                             <MapPin className="text-emerald-500 ml-4 shrink-0 group-hover/wilaya:scale-110 transition-transform" size={24}/>
                             <div className="flex-1">
                                <label className="block text-[10px] text-gray-400 font-bold mb-0.5">الموقع (الولاية)</label>
                                <select 
                                    className="w-full bg-transparent border-none outline-none p-0 text-gray-800 dark:text-white font-bold appearance-none cursor-pointer text-base"
                                    value={selectedWilaya}
                                    onChange={(e) => setSelectedWilaya(e.target.value)}
                                >
                                    {WILAYAS.map(w => <option key={w} value={w} className="text-gray-900 bg-white dark:bg-gray-800 py-2">{w}</option>)}
                                </select>
                            </div>
                            <ChevronRight className="absolute left-6 text-gray-400 rotate-90 md:rotate-0 pointer-events-none" size={16}/>
                        </div>
                    </div>

                    {/* QUICK FILTERS CHIPS */}
                    <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                        
                        {/* Specialty Filter */}
                        <div className="relative group">
                            <select 
                                value={selectedSpecialty}
                                onChange={(e) => setSelectedSpecialty(e.target.value)}
                                className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 py-2 px-4 pr-8 rounded-xl text-sm font-bold shadow-sm hover:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                            >
                                {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <Stethoscope size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                        </div>

                        {/* Sort Filter */}
                        <div className="flex bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                             <button 
                                onClick={() => setSortBy('RATING')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${sortBy === 'RATING' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'text-gray-500 hover:text-gray-700'}`}
                             >
                                 الأعلى تقييماً
                             </button>
                             <button 
                                onClick={() => setSortBy('NEAREST')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${sortBy === 'NEAREST' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'text-gray-500 hover:text-gray-700'}`}
                             >
                                 الأقرب إلي
                             </button>
                        </div>
                    </div>
                </div>

                {/* DOCTOR CARDS LIST */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {loading ? (
                         <div className="flex gap-1 justify-center col-span-full py-20"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></span><span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-100"></span><span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-200"></span></div>
                    ) : filteredDoctors.length === 0 ? (
                        <div className="col-span-full text-center py-20 bg-white dark:bg-gray-800 rounded-3xl shadow-sm">
                            <UserRound size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                            <h3 className="text-xl font-bold text-gray-500 dark:text-gray-400">لا يوجد أطباء مسجلين</h3>
                            <p className="text-sm text-gray-400 mt-2">يرجى من المدير إضافة أطباء للنظام.</p>
                        </div>
                    ) : filteredDoctors.map((doctor) => ( 
                        <div 
                            key={doctor.id} 
                            className="group relative bg-white dark:bg-gray-800 rounded-[2rem] overflow-hidden border border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-2xl hover:shadow-emerald-900/5 dark:hover:shadow-black/50 hover:-translate-y-2 transition-all duration-500 cursor-pointer flex flex-col h-full"
                            onClick={() => onSelectDoctor(doctor)}
                        >
                            {/* Card Header & Badge */}
                            <div className="p-6 pb-0 flex justify-between items-start">
                                <div className="bg-blue-50 dark:bg-blue-900/20 w-16 h-16 rounded-[1.2rem] flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner border border-blue-100 dark:border-blue-800/30">
                                    <UserRound size={32} />
                                </div>
                                {doctor.is_certified && (
                                    <span className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] px-2 py-1 rounded-full font-bold flex items-center gap-1 border border-emerald-100 dark:border-emerald-800/30">
                                        <ShieldCheck size={12}/> طبيب معتمد
                                    </span>
                                )}
                            </div>

                            <div className="px-6 py-4 flex-1">
                                <h3 className="text-xl font-black text-gray-800 dark:text-white leading-tight mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                    {doctor.name}
                                </h3>
                                <p className="text-emerald-600 dark:text-emerald-400 font-bold text-sm mb-4 flex items-center gap-1">
                                    <Stethoscope size={14}/> {doctor.specialty}
                                </p>

                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                                        <MapPin size={14} className="shrink-0"/>
                                        <span className="truncate">{doctor.wilaya}، {doctor.commune}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-yellow-500 text-sm">
                                        <div className="flex gap-0.5">
                                            <Star size={14} className="fill-current"/>
                                            <Star size={14} className="fill-current"/>
                                            <Star size={14} className="fill-current"/>
                                            <Star size={14} className="fill-current"/>
                                            <Star size={14} className="fill-gray-300 dark:fill-gray-600 text-gray-300 dark:text-gray-600"/>
                                        </div>
                                        <span className="text-gray-400 text-xs">({doctor.reviews_count || 0})</span>
                                    </div>
                                    <div className="text-xs text-orange-500 bg-orange-50 dark:bg-orange-900/10 px-2 py-1 rounded w-fit">
                                        ● يستقبل بالحجز المسبق فقط
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="px-6 pb-6 pt-2 grid gap-3">
                                <button 
                                    onClick={(e) => handleCallClick(e, doctor.phone)}
                                    className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30 flex items-center justify-center gap-2"
                                >
                                    <Phone size={16}/> اتصل الآن
                                </button>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={(e) => handleMapClick(e, doctor)}
                                        className="flex-1 py-3 rounded-xl border-2 border-emerald-600 text-emerald-600 dark:border-emerald-500 dark:text-emerald-500 font-bold text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Map size={16}/> الخريطة
                                    </button>
                                </div>
                                <div className="text-center text-[10px] text-gray-400 mt-1">
                                    ساعات العمل: {doctor.opening_hours}
                                </div>
                            </div>

                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};