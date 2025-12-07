
import React, { useState, useEffect } from 'react';
import { Pharmacy, UserSession, Review } from '../types';
import { ArrowLeft, Heart, MapPin, Phone, Star, ShieldCheck, Share2, Building, CheckCircle } from 'lucide-react';
import { firebaseService } from '../services/firebaseService';

interface PharmacyDetailsProps {
    pharmacy: Pharmacy;
    user: UserSession;
    onBack: () => void;
}

export const PharmacyDetails: React.FC<PharmacyDetailsProps> = ({ pharmacy, user, onBack }) => {
    const [isFavorite, setIsFavorite] = useState(false);
    const [reviews, setReviews] = useState<Review[]>([]);
    
    // Initialize rating from props for immediate display
    const [averageRating, setAverageRating] = useState(pharmacy.rating || 0);
    const [reviewCount, setReviewCount] = useState(pharmacy.reviews_count || 0);
    
    // Rating Breakdown Stats
    const [ratingStats, setRatingStats] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

    // Rating state logic
    const [userRating, setUserRating] = useState<number | null>(null);
    const [hoverRating, setHoverRating] = useState<number | null>(null);

    useEffect(() => {
        if (user.id && user.role !== 'GUEST') {
            // Check favorites against Firebase
            firebaseService.checkIsFavorite(user.id, pharmacy.id).then(setIsFavorite);
        }
        loadReviews();
    }, [user, pharmacy]);

    const loadReviews = async () => {
        // Fetch from Firebase subcollection
        const data = await firebaseService.getReviews(pharmacy.id);
        
        // Sort by newest
        data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        setReviews(data);

        // Calculate Stats
        const stats: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        data.forEach(r => {
             const floored = Math.floor(r.rating);
             if(floored >= 1 && floored <= 5) stats[floored] = (stats[floored] || 0) + 1;
        });
        setRatingStats(stats);
        
        // Check if user already rated
        if (user.id) {
            const myReview = data.find(r => r.authorId === user.id);
            if (myReview) setUserRating(myReview.rating);
        }
    };

    const handleToggleFavorite = async () => {
        if (!user.id || user.role === 'GUEST') {
            alert('يجب تسجيل الدخول لإضافة المفضلة');
            return;
        }
        
        // Optimistic UI update
        const nextState = !isFavorite;
        setIsFavorite(nextState);

        try {
            if (nextState) {
                await firebaseService.addToFavorites(user.id, pharmacy);
            } else {
                await firebaseService.removeFromFavorites(user.id, pharmacy.id);
            }
        } catch (e) {
            // Revert on error
            setIsFavorite(!nextState);
            console.error(e);
        }
    };

    const handleDirectRating = async (rating: number) => {
        if(!user.id || user.role === 'GUEST') {
             alert('يجب تسجيل الدخول كعضو لإضافة تقييم');
             return;
        }

        if (userRating) return; 
        
        // Optimistic update
        setUserRating(rating);
        setHoverRating(null);
        
        // Update local stats mathematically
        const newCount = reviewCount + 1;
        const newAvg = ((averageRating * reviewCount) + rating) / newCount;
        setAverageRating(parseFloat(newAvg.toFixed(1)));
        setReviewCount(newCount);
        
        // Update Histogram locally
        setRatingStats(prev => ({
            ...prev,
            [rating]: (prev[rating] || 0) + 1
        }));

        const review: Review = {
            id: `rev_${Date.now()}`,
            targetId: pharmacy.id,
            authorId: user.id,
            authorName: user.name || 'مستخدم',
            rating: rating,
            comment: "", 
            timestamp: new Date().toISOString()
        };

        // Save to Firebase Subcollection
        try {
            await firebaseService.addReview(review);
            loadReviews(); // Reload to show the new review in list and sync exact data
        } catch (e) {
            console.error(e);
            alert("حدث خطأ أثناء إرسال التقييم");
            setUserRating(null); // Revert
            // Revert stats (approximate, full revert requires reloading)
            setReviewCount(reviewCount);
            setAverageRating(averageRating);
            setRatingStats(prev => ({ ...prev, [rating]: prev[rating] - 1 }));
        }
    };

    // Helper for reviews list (static stars)
    const renderStaticStars = (rating: number, size: number = 14) => {
        return (
            <div className="flex gap-1" dir="ltr">
                {[1, 2, 3, 4, 5].map((star) => (
                    <div key={star} className="relative flex items-center justify-center" style={{ width: size, height: size }}>
                        <Star 
                            size={size} 
                            className={`transition-colors ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200 dark:text-gray-600'}`}
                        />
                    </div>
                ))}
            </div>
        );
    };

    // Helper to check if user can perform actions (User or Admin)
    const canInteract = user.role !== 'GUEST';
    // Only regular users can rate pharmacies (Pharmacists cannot rate other pharmacies)
    const canRate = user.role === 'USER';

    return (
        <div className="space-y-6 animate-fade-in text-right" dir="rtl">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-bold mb-4 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                <ArrowLeft size={20}/> العودة للدليل
            </button>
            
            <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-xl overflow-hidden border border-gray-100 dark:border-gray-800 relative">
                
                <div className="h-40 bg-gradient-to-r from-emerald-600 to-teal-800 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-white opacity-10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
                    
                    <div className="absolute top-4 right-4 text-white/80">
                         {pharmacy.approved && <span className="bg-white/20 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-2 border border-white/20"><ShieldCheck size={14}/> صيدلية معتمدة</span>}
                    </div>

                    <div className="absolute top-4 left-4 flex gap-2">
                        {canInteract && (
                            <button 
                                onClick={handleToggleFavorite}
                                className="bg-white/10 hover:bg-white/20 p-2.5 rounded-full backdrop-blur-md transition-all border border-white/20"
                                title="إضافة للمفضلة"
                            >
                                <Heart size={20} className={`transition-colors ${isFavorite ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                            </button>
                        )}
                        <button className="bg-white/10 hover:bg-white/20 p-2.5 rounded-full backdrop-blur-md transition-all border border-white/20 text-white">
                            <Share2 size={20} />
                        </button>
                    </div>
                </div>

                <div className="px-8 pb-10 relative">
                    
                    <div className="relative -top-12 mb-[-30px]">
                        <div className="bg-white dark:bg-gray-800 p-2 rounded-[2rem] shadow-lg w-28 h-28 flex items-center justify-center">
                            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900 dark:to-teal-900 w-full h-full rounded-[1.5rem] flex items-center justify-center text-4xl shadow-inner border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
                                <Building size={40} />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col xl:flex-row justify-between items-start gap-8 mb-6 mt-2">
                        <div className="flex-1">
                            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-2">{pharmacy.name}</h1>
                            <div className="flex flex-wrap items-center gap-4 text-sm">
                                <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400"><MapPin size={16}/> {pharmacy.wilaya}, {pharmacy.commune}</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* INFO CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        <a href={`tel:${pharmacy.phone}`} className="flex items-center gap-4 p-5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all duration-300 group cursor-pointer">
                            <div className="bg-white dark:bg-gray-800 p-3 rounded-full text-emerald-600 dark:text-emerald-400 shadow-sm group-hover:scale-110 transition-transform">
                                <Phone size={24}/>
                            </div>
                            <div>
                                <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 font-bold mb-1 uppercase tracking-wider">اتصل الآن</p>
                                <p className="text-emerald-900 dark:text-emerald-100 font-bold text-xl leading-none dir-ltr font-mono">{pharmacy.phone}</p>
                            </div>
                        </a>

                        <div className="flex items-center gap-4 p-5 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                            <div className="bg-white dark:bg-gray-700 p-3 rounded-full text-gray-400 dark:text-gray-300 shadow-sm">
                                <MapPin size={24}/>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 dark:text-gray-500 font-bold mb-1 uppercase tracking-wider">الموقع</p>
                                <p className="text-gray-800 dark:text-gray-200 font-bold text-lg leading-none">{pharmacy.commune}</p>
                                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">{pharmacy.wilaya}</p>
                            </div>
                        </div>
                    </div>

                    {/* UNIFIED RATING COMPONENT (Moved Below Info) */}
                    <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row items-center gap-8 shadow-sm mb-10">
                        
                        <div className="flex flex-col items-center justify-center gap-2 min-w-[150px]">
                             <h3 className="font-bold text-gray-400 text-xs uppercase tracking-wider">تقييم الصيدلية</h3>
                            <div className="text-center">
                                <span className="text-5xl font-black text-gray-800 dark:text-white leading-none block">{averageRating}</span>
                                <span className="text-asi font-bold text-gray-400">من 5</span>
                            </div>
                            <span className="text-xs font-bold text-gray-400 flex items-center gap-1">
                                {userRating ? <><CheckCircle size={12} className="text-emerald-500"/> تم التقييم</> : `${reviewCount} تقييم`}
                            </span>
                        </div>

                        {/* Interactive Stars - Only visible to normal users (not pharmacists) */}
                        {canRate && (
                            <>
                                <div className="flex flex-col items-center justify-center gap-3">
                                    <div className="flex gap-2" dir="ltr" onMouseLeave={() => setHoverRating(null)}>
                                        {[1, 2, 3, 4, 5].map((star) => {
                                            // Modified: Show user rating OR hover rating. If neither, show empty (0).
                                            const displayValue = hoverRating || userRating || 0;
                                            const isActive = star <= displayValue;
                                            const isGold = isActive;

                                            return (
                                                <button
                                                    key={star}
                                                    disabled={!!userRating}
                                                    onClick={() => handleDirectRating(star)}
                                                    onMouseEnter={() => !userRating && setHoverRating(star)}
                                                    className={`
                                                        relative flex items-center justify-center w-10 h-10 transition-transform
                                                        ${(!userRating) ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}
                                                    `}
                                                >
                                                    <Star 
                                                        size={32} 
                                                        className={`transition-colors duration-200 ${
                                                            isGold 
                                                            ? 'fill-amber-400 text-amber-400' 
                                                            : 'text-gray-300 dark:text-gray-600'
                                                        }`}
                                                    />
                                                    <span className={`
                                                        absolute text-[10px] font-black pt-0.5 select-none pointer-events-none transition-colors
                                                        ${isGold ? 'text-amber-900' : 'text-gray-400 dark:text-gray-500'}
                                                    `}>
                                                        {star}
                                                    </span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                    {!userRating && <span className="text-xs text-gray-400">اضغط على النجوم للتقييم</span>}
                                </div>

                                {/* Divider */}
                                <div className="hidden md:block w-px h-24 bg-gray-200 dark:bg-gray-700 mx-4"></div>
                            </>
                        )}

                        {/* Histogram */}
                        <div className="flex-1 w-full space-y-2">
                            {[5, 4, 3, 2, 1].map(num => {
                                const count = ratingStats[num] || 0;
                                const percentage = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
                                
                                return (
                                    <div key={num} className="flex items-center gap-3 text-xs">
                                        <div className="flex items-center gap-1 w-8 justify-end text-gray-500 dark:text-gray-400 font-bold">
                                            <span>{num}</span>
                                            <Star size={10} className="fill-current"/>
                                        </div>
                                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-amber-400 rounded-full transition-all duration-500" 
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-gray-400 dark:text-gray-500 w-6 text-left font-mono">{count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Reviews List Section */}
                    {reviews.length > 0 && (
                        <div className="pt-8 border-t border-gray-100 dark:border-gray-800">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6">آراء المرضى ({reviews.length})</h3>
                            <div className="space-y-4">
                                {reviews.map(review => (
                                    <div key={review.id} className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-2xl">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="font-bold text-gray-800 dark:text-white">{review.authorName}</div>
                                            <div className="text-xs text-gray-400">{new Date(review.timestamp).toLocaleDateString('ar-DZ')}</div>
                                        </div>
                                        <div className="mb-2">
                                            {renderStaticStars(review.rating)}
                                        </div>
                                        {review.comment && <p className="text-sm text-gray-600 dark:text-gray-300">{review.comment}</p>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
