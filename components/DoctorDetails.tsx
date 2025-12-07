
import React from 'react';
import { Doctor } from '../types';
import { ArrowLeft, MapPin, Phone, Clock, Star, ShieldCheck, Share2, UserRound, Stethoscope, Map } from 'lucide-react';

interface DoctorDetailsProps {
    doctor: Doctor;
    onBack: () => void;
}

export const DoctorDetails: React.FC<DoctorDetailsProps> = ({ doctor, onBack }) => {
    
    const handleMapClick = () => {
        if (doctor.lat && doctor.lng) {
            window.open(`https://www.google.com/maps/search/?api=1&query=${doctor.lat},${doctor.lng}`, '_blank');
        } else {
            // Fallback to searching by address
            const query = encodeURIComponent(`${doctor.name} ${doctor.specialty} ${doctor.wilaya}`);
            window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
        }
    };

    const renderStars = (rating: number) => {
        return (
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <div key={star} className="relative flex items-center justify-center w-5 h-5">
                        <Star 
                            size={20} 
                            className={`transition-colors ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200 dark:text-gray-600'}`}
                        />
                         <span className={`absolute text-[8px] font-black ${star <= rating ? 'text-amber-900' : 'text-gray-400 dark:text-gray-500'} pt-[1px] select-none pointer-events-none`}>
                            {star}
                        </span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in text-right" dir="rtl">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-bold mb-4 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                <ArrowLeft size={20}/> العودة للدليل
            </button>
            
            <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-xl overflow-hidden border border-gray-100 dark:border-gray-800 relative">
                
                {/* Modern Abstract Header */}
                <div className="h-40 bg-gradient-to-r from-emerald-600 to-teal-800 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-white opacity-10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
                    
                    <div className="absolute top-4 right-4 text-white/80">
                         {doctor.is_certified && <span className="bg-white/20 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-2 border border-white/20"><ShieldCheck size={14}/> طبيب معتمد</span>}
                    </div>

                    {/* Actions */}
                    <div className="absolute top-4 left-4 flex gap-2">
                        <button className="bg-white/10 hover:bg-white/20 p-2.5 rounded-full backdrop-blur-md transition-all border border-white/20 text-white">
                            <Share2 size={20} />
                        </button>
                    </div>
                </div>

                {/* Content Container */}
                <div className="px-8 pb-10 relative">
                    
                    {/* Floating Avatar */}
                    <div className="relative -top-12 mb-[-30px]">
                        <div className="bg-white dark:bg-gray-800 p-2 rounded-[2rem] shadow-lg w-28 h-28 flex items-center justify-center">
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-900 w-full h-full rounded-[1.5rem] flex items-center justify-center text-4xl shadow-inner border border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400">
                                <UserRound size={40} />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8 border-b border-gray-100 dark:border-gray-800 pb-8 mt-2">
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-2">{doctor.name}</h1>
                            <div className="flex flex-col gap-2">
                                <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-lg">
                                    <Stethoscope size={18} /> {doctor.specialty}
                                </span>
                                <div className="flex flex-wrap items-center gap-4 text-sm">
                                    <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1.5 rounded-lg border border-yellow-100 dark:border-yellow-900/30">
                                        <span className="font-bold text-yellow-700 dark:text-yellow-400 text-lg">{doctor.rating}</span>
                                        {renderStars(Math.round(doctor.rating))}
                                        <span className="text-gray-400 text-xs">({doctor.reviews_count} تقييم)</span>
                                    </div>
                                    <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400"><MapPin size={16}/> {doctor.wilaya}, {doctor.commune}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="w-full md:w-auto">
                            <button 
                                onClick={handleMapClick}
                                className="w-full md:w-auto bg-white dark:bg-gray-800 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 px-6 py-3 rounded-xl font-bold hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center justify-center gap-2 shadow-sm transition-all"
                            >
                                <Map size={20}/> افتح موقع العيادة على الخريطة
                            </button>
                        </div>
                    </div>
                    
                    {/* Modern Information Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* Information */}
                        <div className="space-y-4">
                             <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-2">معلومات التواصل</h3>
                             
                             <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                                <div className="bg-white dark:bg-gray-700 p-3 rounded-full text-gray-400 dark:text-gray-300 shadow-sm">
                                    <MapPin size={24}/>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 font-bold mb-1 uppercase tracking-wider">العنوان</p>
                                    <p className="text-gray-800 dark:text-gray-200 font-bold text-base leading-relaxed">{doctor.address}</p>
                                    <p className="text-gray-500 text-sm">{doctor.commune}, {doctor.wilaya}</p>
                                </div>
                            </div>

                            <a href={`tel:${doctor.phone}`} className="flex items-center gap-4 p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all duration-300 group cursor-pointer">
                                <div className="bg-white dark:bg-gray-800 p-3 rounded-full text-emerald-600 dark:text-emerald-400 shadow-sm group-hover:scale-110 transition-transform">
                                    <Phone size={24}/>
                                </div>
                                <div>
                                    <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 font-bold mb-1 uppercase tracking-wider">اتصل الآن</p>
                                    <p className="text-emerald-900 dark:text-emerald-100 font-bold text-xl leading-none dir-ltr font-mono">{doctor.phone}</p>
                                </div>
                            </a>

                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                                <div className="bg-white dark:bg-gray-700 p-3 rounded-full text-gray-400 dark:text-gray-300 shadow-sm">
                                    <Clock size={24}/>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 font-bold mb-1 uppercase tracking-wider">ساعات العمل</p>
                                    <p className="text-gray-800 dark:text-gray-200 font-bold text-lg leading-none">{doctor.opening_hours}</p>
                                    <span className="text-orange-500 text-xs font-bold mt-1 inline-block">● يستقبل بالحجز المسبق</span>
                                </div>
                            </div>
                        </div>

                        {/* Map Placeholder or Note */}
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
                            <MapPin size={48} className="text-gray-300 dark:text-gray-600 mb-4"/>
                            <h4 className="font-bold text-gray-600 dark:text-gray-300 mb-2">موقع العيادة</h4>
                            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mb-6">
                                اضغط على زر الخريطة أعلاه لعرض موقع العيادة الدقيق والحصول على الاتجاهات.
                            </p>
                            
                            <div className="w-full border-t border-gray-200 dark:border-gray-700 pt-6 mt-2">
                                <h5 className="font-bold text-sm text-gray-700 dark:text-gray-200 mb-3">صيدليات قريبة (محاكاة)</h5>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between bg-white dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-600">
                                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">صيدلية الشفاء</span>
                                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">500m</span>
                                    </div>
                                    <div className="flex items-center justify-between bg-white dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-600">
                                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">صيدلية الأمل</span>
                                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">1.2km</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                </div>
            </div>
        </div>
    );
};
