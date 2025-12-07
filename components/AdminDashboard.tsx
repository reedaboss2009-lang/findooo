
import React, { useState, useEffect } from 'react';
import { Pharmacy, UserSession, Medicine } from '../types';
import { firebaseService } from '../services/firebaseService';
import { Users, Building2, Plus, Trash2, Edit, Save, X, ShieldCheck, LogOut, Pill, Activity, KeyRound, AlertCircle, TrendingUp, CheckCircle, Clock, Star, MessageSquare } from 'lucide-react';
import { WILAYAS } from '../constants';

interface AdminDashboardProps {
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'PHARMACIES' | 'USERS' | 'MEDICINES'>('OVERVIEW');
    const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
    const [users, setUsers] = useState<UserSession[]>([]);
    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'ADD' | 'EDIT'>('ADD');
    const [currentEntity, setCurrentEntity] = useState<any>(null); 
    const [modalType, setModalType] = useState<'PHARMACY' | 'USER' | 'MEDICINE'>('PHARMACY');
    const [newPassword, setNewPassword] = useState('');
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteConfig, setDeleteConfig] = useState<{id: string, type: string, title: string, message: string} | null>(null);

    // Stats State
    const [stats, setStats] = useState({
        totalUsers: 0,
        regularUsers: 0,
        pharmacists: 0,
        totalPharmacies: 0,
        approvedPharmacies: 0,
        pendingPharmacies: 0,
        totalMedicines: 0,
        totalReviews: 0,
        averageSystemRating: "0.0"
    });

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Always fetch users and pharmacies for overview stats
            const u = await firebaseService.getAllUsers();
            setUsers(u);
            
            const p = await firebaseService.getAllPharmacies();
            setPharmacies(p);
            
            const m = await firebaseService.getAllMedicines();
            setMedicines(m);

            // Calculate Reviews Stats
            let totalRev = 0;
            let totalRatSum = 0;
            let pharmaciesWithRatings = 0;

            p.forEach(pharma => {
                if (pharma.reviews_count) totalRev += pharma.reviews_count;
                if (pharma.rating && pharma.rating > 0) {
                    totalRatSum += pharma.rating;
                    pharmaciesWithRatings++;
                }
            });

            const avgSysRating = pharmaciesWithRatings > 0 ? (totalRatSum / pharmaciesWithRatings).toFixed(2) : "0.0";

            // Calculate Stats
            setStats({
                totalUsers: u.length,
                regularUsers: u.filter(user => user.role === 'USER').length,
                pharmacists: u.filter(user => user.role === 'PHARMACY').length,
                totalPharmacies: p.length,
                approvedPharmacies: p.filter(pharma => pharma.approved).length,
                pendingPharmacies: p.filter(pharma => !pharma.approved).length,
                totalMedicines: m.length,
                totalReviews: totalRev,
                averageSystemRating: avgSysRating
            });

        } catch(e) { console.error(e); }
        setLoading(false);
    };

    const handleDelete = (id: string, type: 'PHARMACY' | 'USER' | 'MEDICINE') => {
        setDeleteConfig({
            id, type, 
            title: `حذف ${type === 'PHARMACY' ? 'الصيدلية' : type === 'USER' ? 'المستخدم' : 'الدواء'}`,
            message: 'هل أنت متأكد من الحذف؟ هذا الإجراء نهائي ولا يمكن التراجع عنه.'
        });
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteConfig) return;
        try {
            if (deleteConfig.type === 'MEDICINE') {
                await firebaseService.deleteMedicine(deleteConfig.id);
            } else {
                await firebaseService.deleteUserDoc(deleteConfig.id);
            }
            setIsDeleteModalOpen(false);
            setDeleteConfig(null);
            loadData();
        } catch (error) {
            console.error("Delete failed", error);
            alert("فشل الحذف. يرجى المحاولة مرة أخرى.");
        }
    };

    const openModal = (type: 'PHARMACY' | 'USER' | 'MEDICINE', mode: 'ADD' | 'EDIT', entity?: any) => {
        setModalType(type);
        setModalMode(mode);
        setCurrentEntity(entity || {});
        setNewPassword(''); // Reset password field
        setSaveError(null);
        setSaveSuccess(null);
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaveError(null);
        setSaveSuccess(null);
        setIsSaving(true);
        try {
            if (modalType === 'PHARMACY' || modalType === 'USER') {
                const entityData = currentEntity;
                const trimmedEmail = (entityData.email || '').trim();
                const trimmedPass = newPassword.trim();
                const role = modalType;
                
                if (modalMode === 'ADD') {
                    // Validation for new account
                    if (!trimmedEmail || !trimmedPass) {
                        setSaveError("يرجى إدخال البريد الإلكتروني وكلمة المرور.");
                        setIsSaving(false);
                        return;
                    }
                    if (trimmedPass.length < 6) {
                        setSaveError("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
                        setIsSaving(false);
                        return;
                    }
                    
                    // Create Account + Docs
                    await firebaseService.createAccount({ ...entityData, email: trimmedEmail }, trimmedPass, role);
                    setIsModalOpen(false);
                    loadData();

                } else {
                    // EDIT Mode
                    // Determine if email changed or just password or just data
                    const oldEmail = users.find(u => u.id === entityData.id)?.email || pharmacies.find(p => p.id === entityData.id)?.email;
                    const emailChanged = oldEmail !== trimmedEmail;
                    
                    if (emailChanged) {
                         // CASE 1: Email Changed -> Full Migration (Create New, Move Data, Delete Old)
                         if (!trimmedPass) {
                             setSaveError("يجب إدخال كلمة المرور عند تغيير البريد الإلكتروني.");
                             setIsSaving(false);
                             return;
                         }
                         await firebaseService.updateAccountAuth(entityData.id, { ...entityData, email: trimmedEmail }, trimmedPass, role);
                         setIsModalOpen(false);
                         loadData();

                    } else if (trimmedPass) {
                         // CASE 2: Same Email, New Password
                         
                         // First update profile data to be safe
                         if (role === 'PHARMACY') {
                             await firebaseService.savePharmacyProfile(entityData.id, { ...entityData, email: trimmedEmail });
                         } else {
                             await firebaseService.saveUserDoc(entityData);
                         }

                         const result = await firebaseService.manageAuthForExistingUser(trimmedEmail, trimmedPass, role, entityData);
                         
                         if (result.status === 'RESTORED') {
                             // Account verified with new password successfully
                             alert("تم تحديث كلمة المرور واستعادة بيانات الدخول بنجاح.");
                             setIsModalOpen(false);
                         } 
                         // Note: 'RESET_SENT' case is removed as requested
                         
                         loadData();

                    } else {
                         // CASE 3: Simple Profile Update (No Auth changes)
                         if (role === 'PHARMACY') {
                             await firebaseService.savePharmacyProfile(entityData.id, { ...entityData, email: trimmedEmail });
                         } else {
                             await firebaseService.saveUserDoc(entityData);
                         }
                         setIsModalOpen(false);
                         loadData();
                    }
                }

            } else if (modalType === 'MEDICINE') {
                await firebaseService.saveMedicine(currentEntity as Medicine);
                setIsModalOpen(false);
                loadData();
            }
            
        } catch (error: any) {
            if (error.message === 'AUTH_EXISTS_CONFLICT') {
                 setSaveError("هذا البريد مسجل بكلمة مرور مختلفة. لتغيير كلمة المرور فوراً، يجب عليك حذف المستخدم يدوياً من لوحة تحكم Firebase (قسم Authentication) أولاً، ثم إعادة المحاولة.");
                 setIsSaving(false);
                 return;
            }
            console.error(error);
            setSaveError(error.message || "حدث خطأ أثناء الحفظ");
        } finally {
            setIsSaving(false);
        }
    };

    const renderModalContent = () => {
        switch (modalType) {
            case 'PHARMACY':
                return (
                    <>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Account Credentials */}
                            <div className="col-span-1 md:col-span-2 bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800 mb-2">
                                <h4 className="font-bold text-emerald-800 dark:text-emerald-400 mb-3 text-sm flex items-center gap-2"><KeyRound size={16}/> بيانات الدخول للحساب</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold mb-1">البريد الإلكتروني (للدخول)</label>
                                        <input 
                                            type="email" 
                                            required 
                                            value={currentEntity.email || ''} 
                                            onChange={e => setCurrentEntity({...currentEntity, email: e.target.value})} 
                                            className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                                            placeholder="pharmacy@example.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold mb-1">
                                            {modalMode === 'EDIT' ? 'تغيير كلمة المرور' : 'كلمة المرور'}
                                        </label>
                                        <input 
                                            type="text" 
                                            required={modalMode === 'ADD'} 
                                            value={newPassword} 
                                            onChange={e => setNewPassword(e.target.value)} 
                                            className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                                            placeholder={modalMode === 'EDIT' ? 'اترك فارغاً للإبقاء على الحالية' : '******'}
                                        />
                                        {modalMode === 'EDIT' && (
                                            <p className="text-[10px] text-gray-500 mt-1">
                                                * لتغيير كلمة المرور لمستخدم موجود: قد يتطلب ذلك حذف المستخدم من لوحة التحكم الرئيسية إذا حدث تعارض.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-1">اسم الصيدلية</label>
                                <input required value={currentEntity.name || ''} onChange={e => setCurrentEntity({...currentEntity, name: e.target.value})} className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">الهاتف</label>
                                <input required value={currentEntity.phone || ''} onChange={e => setCurrentEntity({...currentEntity, phone: e.target.value})} className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">الولاية</label>
                                <select value={currentEntity.wilaya || WILAYAS[0]} onChange={e => setCurrentEntity({...currentEntity, wilaya: e.target.value})} className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                    {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">البلدية</label>
                                <input required value={currentEntity.commune || ''} onChange={e => setCurrentEntity({...currentEntity, commune: e.target.value})} className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                            </div>
                            <div className="flex items-center gap-2 mt-6">
                                <input type="checkbox" checked={currentEntity.approved || false} onChange={e => setCurrentEntity({...currentEntity, approved: e.target.checked})} className="w-5 h-5" />
                                <label className="font-bold">صيدلية معتمدة</label>
                            </div>
                        </div>
                    </>
                );
            case 'USER':
                return (
                    <div className="space-y-4">
                         {/* Account Credentials for User */}
                         <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 mb-2">
                                <h4 className="font-bold text-blue-800 dark:text-blue-400 mb-3 text-sm flex items-center gap-2"><KeyRound size={16}/> بيانات الدخول</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold mb-1">البريد الإلكتروني</label>
                                        <input 
                                            type="email" 
                                            required 
                                            value={currentEntity.email || ''} 
                                            onChange={e => setCurrentEntity({...currentEntity, email: e.target.value})} 
                                            className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold mb-1">
                                            {modalMode === 'EDIT' ? 'تغيير كلمة المرور' : 'كلمة المرور'}
                                        </label>
                                        <input 
                                            type="text" 
                                            required={modalMode === 'ADD'} 
                                            value={newPassword} 
                                            onChange={e => setNewPassword(e.target.value)} 
                                            className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                                            placeholder={modalMode === 'EDIT' ? 'اترك فارغاً للإبقاء على الحالية' : '******'}
                                        />
                                    </div>
                                </div>
                        </div>

                         <div>
                            <label className="block text-sm font-bold mb-1">الاسم</label>
                            <input value={currentEntity.name || ''} onChange={e => setCurrentEntity({...currentEntity, name: e.target.value})} className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1">الصلاحية (Role)</label>
                            <select value={currentEntity.role || 'USER'} onChange={e => setCurrentEntity({...currentEntity, role: e.target.value})} className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                <option value="USER">مستخدم عادي</option>
                                <option value="PHARMACY">صيدلي</option>
                                <option value="ADMIN">مدير</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1">الولاية</label>
                             <select value={currentEntity.wilaya || WILAYAS[0]} onChange={e => setCurrentEntity({...currentEntity, wilaya: e.target.value})} className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                    {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1">الهاتف</label>
                            <input value={currentEntity.phone || ''} onChange={e => setCurrentEntity({...currentEntity, phone: e.target.value})} className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        </div>
                    </div>
                );
            case 'MEDICINE':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold mb-1">اسم الدواء</label>
                            <input required value={currentEntity.name || ''} onChange={e => setCurrentEntity({...currentEntity, name: e.target.value})} className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1">الفئة</label>
                            <input required value={currentEntity.category || ''} onChange={e => setCurrentEntity({...currentEntity, category: e.target.value})} className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-[80vh] text-right pb-10" dir="rtl">
            
            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && deleteConfig && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                            <Trash2 size={32} />
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-gray-800 dark:text-white">{deleteConfig.title}</h3>
                        <p className="text-gray-500 mb-6">{deleteConfig.message}</p>
                        <div className="flex gap-3">
                            <button onClick={confirmDelete} className="flex-1 bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700">حذف</button>
                            <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white py-2 rounded-lg font-bold hover:bg-gray-300 dark:hover:bg-gray-600">إلغاء</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit/Add Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10">
                            <h3 className="font-bold text-lg text-gray-800 dark:text-white">
                                {modalMode === 'ADD' ? 'إضافة جديد' : 'تعديل البيانات'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6">
                            
                            {saveError && (
                                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm font-bold mb-4 flex items-center gap-2 border border-red-100 dark:border-red-800">
                                    <AlertCircle size={18} className="shrink-0"/> {saveError}
                                </div>
                            )}

                            {saveSuccess && (
                                <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-3 rounded-lg text-sm font-bold mb-4 flex items-center gap-2 border border-green-100 dark:border-green-800">
                                    <CheckCircle size={18} className="shrink-0"/> {saveSuccess}
                                </div>
                            )}

                            {renderModalContent()}
                            <div className="mt-8 flex gap-3">
                                <button type="submit" disabled={isSaving} className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex justify-center items-center gap-2">
                                    <Save size={18}/> {isSaving ? 'جاري الحفظ...' : 'حفظ'}
                                </button>
                                <button type="button" disabled={isSaving} onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 py-3 rounded-lg font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                                    إلغاء
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Responsive Sidebar Navigation */}
            <div className="lg:col-span-1 bg-white dark:bg-gray-800 lg:rounded-2xl shadow-sm p-2 lg:p-4 sticky top-16 md:top-20 lg:top-24 z-30 lg:h-fit border-b lg:border-b-0 lg:border border-gray-100 dark:border-gray-700">
                {/* Desktop Header */}
                <div className="hidden lg:block text-center mb-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="font-black text-xl text-emerald-800 dark:text-emerald-400">لوحة الإدارة</h2>
                    <p className="text-xs text-gray-400 mt-1">نسخة المدير العام</p>
                </div>
                
                {/* Mobile / Desktop Nav Layout */}
                <nav className="flex lg:flex-col overflow-x-auto lg:overflow-visible gap-2 lg:space-y-2 no-scrollbar p-1">
                    <button onClick={() => setActiveTab('OVERVIEW')} className={`whitespace-nowrap flex-shrink-0 lg:w-full text-right px-4 py-2 lg:p-3 rounded-xl font-bold flex items-center gap-3 transition-colors text-sm md:text-base ${activeTab === 'OVERVIEW' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-100 dark:ring-emerald-800' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                        <Activity size={18} className="lg:w-5 lg:h-5"/> <span>نظرة عامة</span>
                    </button>
                    <button onClick={() => setActiveTab('PHARMACIES')} className={`whitespace-nowrap flex-shrink-0 lg:w-full text-right px-4 py-2 lg:p-3 rounded-xl font-bold flex items-center gap-3 transition-colors text-sm md:text-base ${activeTab === 'PHARMACIES' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-100 dark:ring-emerald-800' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                        <Building2 size={18} className="lg:w-5 lg:h-5"/> <span>الصيدليات</span>
                    </button>
                    <button onClick={() => setActiveTab('USERS')} className={`whitespace-nowrap flex-shrink-0 lg:w-full text-right px-4 py-2 lg:p-3 rounded-xl font-bold flex items-center gap-3 transition-colors text-sm md:text-base ${activeTab === 'USERS' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-100 dark:ring-emerald-800' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                        <Users size={18} className="lg:w-5 lg:h-5"/> <span>المستخدمين</span>
                    </button>
                    <button onClick={() => setActiveTab('MEDICINES')} className={`whitespace-nowrap flex-shrink-0 lg:w-full text-right px-4 py-2 lg:p-3 rounded-xl font-bold flex items-center gap-3 transition-colors text-sm md:text-base ${activeTab === 'MEDICINES' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-100 dark:ring-emerald-800' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                        <Pill size={18} className="lg:w-5 lg:h-5"/> <span>قاعدة الأدوية</span>
                    </button>
                    
                    {/* Logout Button */}
                    <div className="hidden lg:block border-t border-gray-100 dark:border-gray-700 pt-2 mt-2">
                        <button onClick={onLogout} className="w-full text-right p-3 rounded-xl font-bold flex items-center gap-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <LogOut size={20}/> تسجيل الخروج
                        </button>
                    </div>
                </nav>
            </div>

            <div className="lg:col-span-4 space-y-6">
                
                {activeTab === 'OVERVIEW' && (
                    <div className="space-y-6 animate-fade-in-up">
                         {/* Stats Grid: 1 col mobile, 2 cols tablet, 4 cols desktop */}
                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between h-32 relative overflow-hidden">
                                <div className="absolute top-2 left-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
                                    <Users size={20} />
                                </div>
                                <p className="text-xs font-bold text-gray-400 uppercase">إجمالي المستخدمين</p>
                                <div className="flex items-end gap-2">
                                    <h3 className="text-3xl font-black text-gray-800 dark:text-white">{stats.totalUsers}</h3>
                                    <span className="text-xs text-green-500 font-bold mb-1 flex items-center"><TrendingUp size={10} className="mr-0.5"/> نشط</span>
                                </div>
                                <div className="flex gap-2 mt-2">
                                     <span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md text-gray-600 dark:text-gray-300">{stats.regularUsers} عادي</span>
                                     <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-md text-blue-600 dark:text-blue-300">{stats.pharmacists} صيدلي</span>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between h-32 relative overflow-hidden">
                                <div className="absolute top-2 left-2 p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600">
                                    <Building2 size={20} />
                                </div>
                                <p className="text-xs font-bold text-gray-400 uppercase">الصيدليات المسجلة</p>
                                <div className="flex items-end gap-2">
                                    <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{stats.totalPharmacies}</h3>
                                </div>
                                <div className="flex gap-2 mt-2">
                                     <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-md text-emerald-700 flex items-center gap-1"><CheckCircle size={8}/> {stats.approvedPharmacies} معتمدة</span>
                                     <span className="text-[10px] bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded-md text-yellow-700 flex items-center gap-1"><Clock size={8}/> {stats.pendingPharmacies} انتظار</span>
                                </div>
                            </div>

                             {/* Reviews Stat Card */}
                             <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between h-32 relative overflow-hidden">
                                <div className="absolute top-2 left-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-yellow-600">
                                    <Star size={20} />
                                </div>
                                <p className="text-xs font-bold text-gray-400 uppercase">التقييم العام</p>
                                <div className="flex items-end gap-2">
                                    <h3 className="text-3xl font-black text-yellow-500">{stats.averageSystemRating}</h3>
                                    <span className="text-xs text-gray-400 mb-1">من 5</span>
                                </div>
                                <div className="flex gap-2 mt-2">
                                     <span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md text-gray-600 dark:text-gray-300 flex items-center gap-1">
                                        <MessageSquare size={10} /> {stats.totalReviews} مراجعة
                                     </span>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between h-32 relative overflow-hidden">
                                <div className="absolute top-2 left-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600">
                                    <Pill size={20} />
                                </div>
                                <p className="text-xs font-bold text-gray-400 uppercase">قاعدة الأدوية</p>
                                <div className="flex items-end gap-2">
                                    <h3 className="text-3xl font-black text-purple-600 dark:text-purple-400">{stats.totalMedicines}</h3>
                                    <span className="text-xs text-gray-400 mb-1">نوع دواء</span>
                                </div>
                            </div>
                         </div>
                    </div>
                )}

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden min-h-[500px]">
                    <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-3">
                        <h3 className="font-bold text-lg text-gray-800 dark:text-white">
                            {activeTab === 'OVERVIEW' ? 'أحدث المسجلين (صيدليات)' : 
                             activeTab === 'PHARMACIES' ? 'قائمة الصيدليات' :
                             activeTab === 'USERS' ? 'إدارة المستخدمين' : 'قائمة الأدوية'}
                        </h3>
                        {activeTab !== 'OVERVIEW' && (
                            <button 
                                onClick={() => openModal(activeTab === 'PHARMACIES' ? 'PHARMACY' : activeTab === 'USERS' ? 'USER' : 'MEDICINE', 'ADD')}
                                className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 dark:shadow-none transition-transform active:scale-95"
                            >
                                <Plus size={18}/> إضافة جديد
                            </button>
                        )}
                    </div>

                    <div className="overflow-x-auto custom-scrollbar pb-2">
                        <table className="w-full text-right whitespace-nowrap">
                            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-400 text-xs uppercase font-bold">
                                <tr>
                                    <th className="p-4 hidden md:table-cell">#</th>
                                    <th className="p-4">الاسم / العنوان</th>
                                    <th className="p-4 hidden sm:table-cell">معلومات إضافية</th>
                                    {(activeTab === 'PHARMACIES' || activeTab === 'OVERVIEW') && <th className="p-4">التقييم</th>}
                                    <th className="p-4">الحالة</th>
                                    <th className="p-4 text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {loading ? (
                                    <tr><td colSpan={6} className="p-8 text-center">جاري التحميل...</td></tr>
                                ) : (activeTab === 'PHARMACIES' || (activeTab === 'OVERVIEW' && pharmacies.length > 0)) ? pharmacies.slice(0, activeTab === 'OVERVIEW' ? 8 : undefined).map((p, idx) => (
                                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="p-4 text-gray-400 font-mono text-xs hidden md:table-cell">{idx+1}</td>
                                        <td className="p-4">
                                            <p className="font-bold text-gray-800 dark:text-white truncate max-w-[150px] md:max-w-none">{p.name}</p>
                                            <p className="text-xs text-gray-500">{p.wilaya}, {p.commune}</p>
                                        </td>
                                        <td className="p-4 text-sm hidden sm:table-cell">
                                            <p className="font-mono text-gray-600 dark:text-gray-300">{p.phone}</p>
                                            {p.email && <p className="text-xs text-gray-400 truncate max-w-[150px]">{p.email}</p>}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/10 w-fit px-2 py-0.5 rounded-lg border border-yellow-100 dark:border-yellow-900/30">
                                                <Star size={12} className="text-amber-400 fill-amber-400"/>
                                                <span className="font-bold text-gray-700 dark:text-gray-300 text-xs">{p.rating?.toFixed(1) || "0.0"}</span>
                                                <span className="text-[10px] text-gray-400">({p.reviews_count || 0})</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {p.approved ? 
                                                <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-1 rounded-full font-bold flex items-center w-fit gap-1"><ShieldCheck size={12}/> معتمد</span> : 
                                                <span className="bg-yellow-100 text-yellow-700 text-[10px] px-2 py-1 rounded-full font-bold flex items-center w-fit gap-1">قيد الانتظار</span>
                                            }
                                        </td>
                                        <td className="p-4 flex justify-center gap-2">
                                            <button onClick={() => openModal('PHARMACY', 'EDIT', p)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><Edit size={16}/></button>
                                            <button onClick={() => handleDelete(p.id, 'PHARMACY')} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                )) : activeTab === 'MEDICINES' ? medicines.map((m, idx) => (
                                    <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="p-4 text-gray-400 font-mono text-xs hidden md:table-cell">{idx+1}</td>
                                        <td className="p-4 font-bold text-gray-800 dark:text-white truncate max-w-[150px]">{m.name}</td>
                                        <td className="p-4 text-sm hidden sm:table-cell">{m.category}</td>
                                        <td className="p-4"><span className="text-emerald-500 text-xs font-bold">نشط</span></td>
                                        <td className="p-4 flex justify-center gap-2">
                                            <button onClick={() => openModal('MEDICINE', 'EDIT', m)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><Edit size={16}/></button>
                                            <button onClick={() => handleDelete(m.id, 'MEDICINE')} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                )) : activeTab === 'USERS' ? users.map((u, idx) => (
                                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="p-4 text-gray-400 font-mono text-xs hidden md:table-cell">{idx+1}</td>
                                        <td className="p-4">
                                            <p className="font-bold text-gray-800 dark:text-white truncate max-w-[120px]">{u.name || 'بدون اسم'}</p>
                                            <p className="text-xs text-gray-500 truncate max-w-[120px]">{u.email}</p>
                                        </td>
                                        <td className="p-4 text-sm hidden sm:table-cell">{u.wilaya || '-'}</td>
                                        <td className="p-4">
                                            <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${
                                                u.role === 'ADMIN' ? 'bg-red-100 text-red-700' :
                                                u.role === 'PHARMACY' ? 'bg-blue-100 text-blue-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="p-4 flex justify-center gap-2">
                                            <button onClick={() => openModal('USER', 'EDIT', u)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><Edit size={16}/></button>
                                            <button onClick={() => handleDelete(u.id!, 'USER')} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={6} className="p-8 text-center text-gray-500">لا توجد بيانات للعرض</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
