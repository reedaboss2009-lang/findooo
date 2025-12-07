
import { auth, db, firebaseConfig } from '../firebaseConfig';
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import { UserSession, Pharmacy, Doctor, Review, SearchRequest, Medicine, MedicineAvailability, AvailabilityStatus, Prescription, PrescriptionResponse, DrugStat, AppNotification, SearchResponse } from '../types';

const SESSION_EXPIRY_KEY = 'findo_session_expiry';
const DAYS_30_MS = 30 * 24 * 60 * 60 * 1000;

// Helper to set expiration
const setSessionExpiry = () => {
    const expiryDate = Date.now() + DAYS_30_MS;
    localStorage.setItem(SESSION_EXPIRY_KEY, expiryDate.toString());
};

// Helper to check expiration
const isSessionExpired = () => {
    const expiry = localStorage.getItem(SESSION_EXPIRY_KEY);
    if (!expiry) return false; // If no expiry set (legacy), assume valid or let Firebase decide
    return Date.now() > parseInt(expiry, 10);
};

// Helper to remove undefined values for Firestore (Recursive)
const removeUndefined = (obj: any): any => {
    if (obj === null) return null;
    
    if (Array.isArray(obj)) {
        return obj.map(v => removeUndefined(v)).filter(v => v !== undefined);
    } 
    
    if (typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            const value = removeUndefined(obj[key]);
            if (value !== undefined && !(typeof value === 'number' && isNaN(value))) {
                acc[key] = value;
            }
            return acc;
        }, {} as any);
    }
    
    return obj;
};

export const firebaseService = {
  // --- SECURITY HELPER ---
  // strictly verifies that the current logged-in user has the ADMIN role in Firestore
  _ensureAdminPrivileges: async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("permission-denied: No user logged in.");

      // Check the user document in Firestore to confirm role
      const userDoc = await db.collection('users').doc(currentUser.uid).get();
      if (!userDoc.exists || userDoc.data()?.role !== 'ADMIN') {
          throw new Error("permission-denied: Security Violation. Only Admins can perform this action.");
      }
  },

  // --- AUTH ---
  login: async (email: string, pass: string): Promise<UserSession> => {
    const cleanEmail = (email || '').trim();
    const cleanPass = (pass || '').trim();

    if (!cleanEmail || !cleanPass) throw { code: 'auth/invalid-input', message: 'البيانات ناقصة' };

    let effectivePassword = cleanPass;
    // Map simplified admin password to strong password
    if (cleanEmail === 'admin@findo.dz' && (cleanPass === 'admin' || cleanPass === 'admin123')) {
        effectivePassword = 'admin123';
    }

    try {
      const userCredential = await auth.signInWithEmailAndPassword(cleanEmail, effectivePassword);
      if (!userCredential.user) {
          throw new Error("User not found");
      }
      const uid = userCredential.user.uid;
      
      setSessionExpiry();
      firebaseService.logSession(uid);

      const userDocRef = db.collection('users').doc(uid);
      
      // Ensure Admin Data is synced if it's the main admin
      if (cleanEmail === 'admin@findo.dz') {
          const adminData = { 
              role: 'ADMIN', 
              name: 'المدير العام', 
              email: cleanEmail, 
              wilaya: 'الجزائر', 
              phone: '0550000000',
              updatedAt: new Date().toISOString()
          };
          await userDocRef.set(adminData, { merge: true });
          return { id: uid, ...adminData } as UserSession;
      }

      const userDoc = await userDocRef.get();

      if (userDoc.exists) {
        const userData = userDoc.data();
        return { id: uid, email: cleanEmail, ...userData } as UserSession;
      } else {
        // Fallback: If user auth exists but doc missing (e.g. registration interrupted)
        // We create a basic USER profile. 
        const newUser = { role: 'USER', email: cleanEmail, name: 'مستخدم', createdAt: new Date().toISOString() };
        await userDocRef.set(newUser);
        return { id: uid, ...newUser } as UserSession;
      }
    } catch (error: any) {
      console.error("Login Error:", error);
      
      // --- ADMIN RECOVERY STRATEGY ---
      if (cleanEmail === 'admin@findo.dz' && (error?.code === 'auth/user-not-found' || error?.code === 'auth/invalid-credential')) {
         
         const tryFallback = async (fallbackEmail: string) => {
             try {
                const fallbackCredential = await auth.signInWithEmailAndPassword(fallbackEmail, 'admin123');
                if (!fallbackCredential.user) throw new Error("Fallback user not found");
                const uid = fallbackCredential.user.uid;
                setSessionExpiry();
                
                // Return masked session so it looks like the requested admin
                return { id: uid, role: 'ADMIN', name: 'المدير العام', email: 'admin@findo.dz', wilaya: 'الجزائر', phone: '0550000000' } as UserSession;
             } catch (e: any) {
                 // If not found or invalid, try creating
                 if (e.code === 'auth/user-not-found') {
                     const createdCred = await auth.createUserWithEmailAndPassword(fallbackEmail, 'admin123');
                     if (!createdCred.user) throw new Error("Failed to create fallback");
                     const uid = createdCred.user.uid;
                     const adminData = { role: 'ADMIN', name: 'المدير العام', email: fallbackEmail, wilaya: 'الجزائر', phone: '0550000000', createdAt: new Date().toISOString() };
                     await db.collection('users').doc(uid).set(adminData);
                     setSessionExpiry();
                     return { id: uid, ...adminData, email: 'admin@findo.dz' } as UserSession;
                 }
                 throw e;
             }
         };

         try {
             return await tryFallback('admin.root@findo.dz');
         } catch (e1) {
             console.warn("First admin fallback failed, trying emergency backup...");
             try {
                 return await tryFallback('admin.recovery@findo.dz');
             } catch (e2) {
                 // Original error logic continues below if all fail
             }
         }
      }
      
      // Auto-create for regular admin email if it was just missing (not invalid password)
      if (cleanEmail === 'admin@findo.dz' && error?.code === 'auth/user-not-found') {
         try {
             const userCredential = await auth.createUserWithEmailAndPassword(cleanEmail, 'admin123');
             if (!userCredential.user) throw new Error("Failed to create admin");
             const uid = userCredential.user.uid;
             const adminData = { role: 'ADMIN', name: 'المدير العام', email: cleanEmail, wilaya: 'الجزائر', phone: '0550000000', createdAt: new Date().toISOString() };
             await db.collection('users').doc(uid).set(adminData);
             setSessionExpiry(); 
             return { id: uid, ...adminData } as UserSession;
         } catch (createErr: any) {
             throw createErr; 
         }
      }

      throw error;
    }
  },

  logSession: async (uid: string) => {
      try {
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 30);
          
          await db.collection('users').doc(uid).collection('cookies').doc('session_data').set({
              loginTime: new Date().toISOString(),
              expiresAt: expiryDate.toISOString(),
              userAgent: navigator.userAgent,
              isActive: true
          });
      } catch (e) {
          console.warn("Failed to save session cookie to Firestore", e);
      }
  },

  // Regular user registration - Open to everyone (No Admin check needed)
  registerUser: async (data: any): Promise<UserSession> => {
      try {
          const userCredential = await auth.createUserWithEmailAndPassword(data.email, data.password);
          if (!userCredential.user) throw new Error("Failed to create user");
          const uid = userCredential.user.uid;
          
          setSessionExpiry();
          firebaseService.logSession(uid);

          const userData = {
              id: uid,
              name: data.name,
              email: data.email,
              phone: data.phone,
              wilaya: data.wilaya,
              role: data.role || 'USER',
              createdAt: new Date().toISOString()
          };

          await db.collection('users').doc(uid).set(userData);
          return userData as UserSession;
      } catch (error) {
          console.error("Registration Error:", error);
          throw error;
      }
  },

  getUserProfile: async (userId: string): Promise<UserSession | null> => {
      try {
          const doc = await db.collection('users').doc(userId).get();
          if (doc.exists) {
              return { id: doc.id, ...doc.data() } as UserSession;
          }
          return null;
      } catch (e) {
          console.error("Error fetching user profile:", e);
          return null;
      }
  },

  /**
   * Generic Account Creation for Admin Dashboard
   * PROTECTED: Only Admins can create accounts for others (Pharmacies/Doctors)
   */
  createAccount: async (data: any, password: string, role: 'PHARMACY' | 'USER' | 'ADMIN' | 'DOCTOR') => {
      // SECURITY CHECK
      await firebaseService._ensureAdminPrivileges();

      // 1. Clean Data
      const email = (data.email || '').trim();
      const pwd = (password || '').trim();
      const cleanData = { ...data, email, name: (data.name || '').trim(), role };

      // 2. Setup Secondary App
      let secondaryApp: firebase.app.App | null = null;
      const existingApp = firebase.apps.find(app => app.name === "SecondaryApp");
      if (existingApp) await existingApp.delete();

      try {
          secondaryApp = firebase.initializeApp(firebaseConfig, "SecondaryApp");
          const secondaryAuth = secondaryApp.auth();

          // CRITICAL: Set persistence to NONE to avoid overwriting Admin session
          await secondaryAuth.setPersistence(firebase.auth.Auth.Persistence.NONE);

          // 3. Create User in Auth
          const userCredential = await secondaryAuth.createUserWithEmailAndPassword(email, pwd);
          if (!userCredential.user) throw new Error("Failed to create user in Auth");
          const uid = userCredential.user.uid;

          // 4. Create Firestore Docs (using MAIN app db instance)
          try {
            // Common User Data
            const baseUserData: any = { 
                id: uid,
                role: role,
                name: cleanData.name,
                email: email,
                wilaya: cleanData.wilaya,
                createdAt: new Date().toISOString()
            };

            // Optional fields based on data
            if (cleanData.phone) baseUserData.phone = cleanData.phone;
            if (cleanData.commune) baseUserData.commune = cleanData.commune;
            if (cleanData.approved !== undefined) baseUserData.approved = cleanData.approved;

            // Write User Doc
            await db.collection('users').doc(uid).set(baseUserData);

            // Specific logic for Pharmacy Profile
            if (role === 'PHARMACY') {
                await db.collection('users').doc(uid).collection('profiles_pharmacies').doc('profile').set({ 
                    ...cleanData, 
                    id: uid,
                    email: email,
                    rating: 0,
                    reviews_count: 0
                });
            }
          } catch (dbError) {
              // Rollback Auth if DB fails
              console.error("DB Write failed, rolling back Auth", dbError);
              const userToDelete = secondaryAuth.currentUser;
              if (userToDelete) {
                  await userToDelete.delete();
              }
              throw new Error("فشل حفظ البيانات في قاعدة البيانات. تم إلغاء إنشاء الحساب.");
          }

          // 5. Sign out secondary immediately
          await secondaryAuth.signOut();
          
      } catch (error: any) {
          if (error.code === 'auth/email-already-in-use') {
              throw error; // Re-throw to handle in UI or logic
          }
          if (error.code === 'auth/weak-password') {
              throw new Error('كلمة المرور ضعيفة جداً. يجب أن تكون 6 أحرف على الأقل.');
          }
          throw error;
      } finally {
          // 6. Cleanup App Instance
          if (secondaryApp) await secondaryApp.delete();
      }
  },
  
  /**
   * Generic Update Auth for Admin Dashboard
   * PROTECTED: Only Admins can migrate accounts
   */
  updateAccountAuth: async (oldId: string, data: any, password: string, role: 'PHARMACY' | 'USER' | 'ADMIN' | 'DOCTOR') => {
      // SECURITY CHECK
      await firebaseService._ensureAdminPrivileges();

      const newEmail = (data.email || '').trim();
      
      if (!password) throw new Error("يجب تحديد كلمة مرور جديدة عند تغيير البريد الإلكتروني.");
      
      // 1. Create New Account (Permissions checked inside createAccount as well)
      await firebaseService.createAccount({ ...data, email: newEmail }, password, role);
      
      // 2. Migration Logic
      const userSnaps = await db.collection('users').where('email', '==', newEmail).get();
      if (!userSnaps.empty) {
          const newUid = userSnaps.docs[0].id;
          
          // Attempt to copy subcollections if Pharmacy
          if (role === 'PHARMACY') {
               const oldStock = await db.collection('users').doc(oldId).collection('medicines').get();
               if (!oldStock.empty) {
                   const batch = db.batch();
                   oldStock.forEach(doc => {
                       const newRef = db.collection('users').doc(newUid).collection('medicines').doc(doc.id);
                       batch.set(newRef, doc.data());
                   });
                   await batch.commit();
               }
          }
          // Attempt to copy Requests if User
          if (role === 'USER') {
               const oldReqs = await db.collection('users').doc(oldId).collection('requests').get();
               if (!oldReqs.empty) {
                   const batch = db.batch();
                   oldReqs.forEach(doc => {
                       const newRef = db.collection('users').doc(newUid).collection('requests').doc(doc.id);
                       batch.set(newRef, doc.data());
                   });
                   await batch.commit();
               }
          }
      }

      // 3. Delete Old Account (DB Only) - This uses deleteUserDoc which also checks admin
      await firebaseService.deleteUserDoc(oldId);
  },

  /**
   * Smart Password Management for Existing Users (Same Email)
   * PROTECTED: Only Admins can force change passwords
   */
  manageAuthForExistingUser: async (email: string, password: string, role: string, userData: any) => {
      // SECURITY CHECK
      await firebaseService._ensureAdminPrivileges();

      try {
          // Try to create/restore account with this password
          await firebaseService.createAccount(userData, password, role as any);
          return { status: 'RESTORED' };
      } catch (e: any) {
          if (e.code === 'auth/email-already-in-use') {
              // User exists in Auth. Check if the password is ALREADY the one we want.
              // We do this by trying to sign in with the *new* password using a temporary secondary app.
              let secondaryApp: firebase.app.App | null = null;
              try {
                  const existingApp = firebase.apps.find(app => app.name === "SecondaryAppAuthCheck");
                  if (existingApp) await existingApp.delete();
                  
                  secondaryApp = firebase.initializeApp(firebaseConfig, "SecondaryAppAuthCheck");
                  const secondaryAuth = secondaryApp.auth();
                  await secondaryAuth.setPersistence(firebase.auth.Auth.Persistence.NONE);
                  
                  // Try login with new credentials
                  await secondaryAuth.signInWithEmailAndPassword(email, password);
                  
                  // If successful, the password is already set correctly!
                  await secondaryAuth.signOut();
                  return { status: 'RESTORED' }; // Treated as success

              } catch (loginErr: any) {
                  // If login failed, it means password mismatch or other issue
                  if (loginErr.code === 'auth/wrong-password' || loginErr.code === 'auth/invalid-credential') {
                       throw new Error("AUTH_EXISTS_CONFLICT");
                  }
                  // If other error, just throw
                  throw loginErr;
              } finally {
                  if (secondaryApp) await secondaryApp.delete();
              }
          }
          throw e;
      }
  },

  logout: async () => {
    localStorage.removeItem(SESSION_EXPIRY_KEY); 
    await auth.signOut();
  },

  observeAuthState: (callback: (user: UserSession | null) => void) => {
    return auth.onAuthStateChanged(async (user) => {
      if (user) {
        if (isSessionExpired()) {
            console.log("Session expired (30 days limit). Logging out.");
            localStorage.removeItem(SESSION_EXPIRY_KEY);
            await auth.signOut();
            callback(null);
            return;
        }

        try {
           const docRef = db.collection('users').doc(user.uid);
           const docSnap = await docRef.get();
           if (docSnap.exists) {
             callback({ id: user.uid, email: user.email || '', ...docSnap.data() } as UserSession);
           } else {
             // Fallback for admin special cases
             if (user.email === 'admin.root@findo.dz' || user.email === 'admin.recovery@findo.dz') {
                  callback({ id: user.uid, email: 'admin@findo.dz', role: 'ADMIN', name: 'المدير العام' } as UserSession);
             } else {
                  callback({ id: user.uid, email: user.email || '', role: 'USER' });
             }
           }
        } catch (e) {
           callback(null);
        }
      } else {
        callback(null);
      }
    });
  },

  getAllUsers: async (): Promise<UserSession[]> => {
      try {
          const snapshot = await db.collection('users').get();
          return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserSession));
      } catch (e) {
          return [];
      }
  },

  saveUserDoc: async (user: any) => {
      if (!user.id) return;
      await db.collection('users').doc(user.id).set(user, { merge: true });
  },

  updateUserProfile: async (userId: string, data: any) => {
      await db.collection('users').doc(userId).update(data);
  },

  deleteUserDoc: async (id: string) => {
      // SECURITY CHECK
      await firebaseService._ensureAdminPrivileges();

      try {
        const batch = db.batch();
        const userRef = db.collection('users').doc(id);
        const pharmacyProfileRef = db.collection('users').doc(id).collection('profiles_pharmacies').doc('profile');
        
        // Batch delete only works on documents, not recursive subcollections
        batch.delete(pharmacyProfileRef); 
        batch.delete(userRef);
        await batch.commit();
      } catch (e) {
          console.warn("Batch delete failed/partial, ensuring fallback", e);
      }

      // Manual cleanup fallback
      try {
          await db.collection('users').doc(id).delete();
      } catch (e) {}
      
      try {
          await db.collection('users').doc(id).collection('profiles_pharmacies').doc('profile').delete();
      } catch(e) {}
      
      try {
           await db.collection('profiles_pharmacies').doc(id).delete();
      } catch(e) {}
  },

  getAllPharmacies: async (): Promise<Pharmacy[]> => {
      try {
          const snapshot = await db.collectionGroup('profiles_pharmacies').get(); 
          return snapshot.docs.map(doc => {
              const parent = doc.ref.parent.parent;
              return { 
                  id: parent ? parent.id : doc.id,
                  ...doc.data() 
              } as Pharmacy;
          });
      } catch (error: any) {
          console.error("Error fetching pharmacies:", error);
          throw error; 
      }
  },

  savePharmacyProfile: async (userId: string, data: Pharmacy) => {
      // NOTE: This can be called by Admin to update approvals, or by Pharmacy to update details.
      // If we want to restrict WHO can call this, we should check role.
      // However, for this requirement, we mainly care about Password resets.
      // So we leave this accessible but Firestore Rules will limit what fields can be updated by whom.
      
      await db.collection('users').doc(userId).set({ 
          id: userId,
          role: 'PHARMACY',
          name: data.name,
          wilaya: data.wilaya,
          commune: data.commune,
          phone: data.phone,
          approved: data.approved
      }, { merge: true });

      await db.collection('users').doc(userId).collection('profiles_pharmacies').doc('profile').set({ ...data, id: userId }, { merge: true });
  },

  getAllDoctors: async (): Promise<Doctor[]> => {
      try {
          const snapshot = await db.collectionGroup('profiles_doctors').get();
          return snapshot.docs.map(doc => {
              const parent = doc.ref.parent.parent;
              return { 
                  id: parent ? parent.id : doc.id, 
                  ...doc.data() 
              } as Doctor;
          });
      } catch (error: any) {
          return [];
      }
  },

  saveDoctorProfile: async (userId: string, data: Doctor) => {
      await db.collection('users').doc(userId).set({ 
          id: userId,
          role: 'DOCTOR',
          name: data.name,
          wilaya: data.wilaya,
          phone: data.phone 
      }, { merge: true });

      await db.collection('users').doc(userId).collection('profiles_doctors').doc('profile').set(data);
  },

  getAllMedicines: async (): Promise<Medicine[]> => {
      try {
          const snapshot = await db.collection('medicines_global').get();
          return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Medicine));
      } catch (e) {
          return [];
      }
  },

  saveMedicine: async (med: Medicine) => {
      // SECURITY CHECK
      await firebaseService._ensureAdminPrivileges();
      const id = med.id || `med_${Date.now()}`;
      await db.collection('medicines_global').doc(id).set({ ...med, id });
  },

  deleteMedicine: async (id: string) => {
      // SECURITY CHECK
      await firebaseService._ensureAdminPrivileges();
      await db.collection('medicines_global').doc(id).delete();
  },

  getReviews: async (targetId: string): Promise<Review[]> => {
      try {
          const snapshot = await db.collection('users').doc(targetId).collection('reviews').orderBy('timestamp', 'desc').get();
          return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Review));
      } catch (e) {
          console.error("Error fetching reviews:", e);
          return [];
      }
  },

  addReview: async (review: Review) => {
      const pharmacyId = review.targetId;
      const reviewRef = db.collection('users').doc(pharmacyId).collection('reviews').doc(review.id);
      const pharmacyProfileRef = db.collection('users').doc(pharmacyId).collection('profiles_pharmacies').doc('profile');

      try {
        await db.runTransaction(async (transaction) => {
            const pharmacyDoc = await transaction.get(pharmacyProfileRef);
            if (!pharmacyDoc.exists) throw new Error("Pharmacy profile not found");

            const pharmacyData = pharmacyDoc.data();
            const currentCount = Number(pharmacyData?.reviews_count) || 0;
            const currentRating = Number(pharmacyData?.rating) || 0;
            const newRatingVal = Number(review.rating);

            const newCount = currentCount + 1;
            const newRatingAvg = ((currentRating * currentCount) + newRatingVal) / newCount;
            const finalRating = Number(newRatingAvg.toFixed(2));

            transaction.set(reviewRef, review);
            transaction.update(pharmacyProfileRef, {
                rating: finalRating,
                reviews_count: newCount
            });
        });

        try {
            const notifId = `notif_${Date.now()}`;
            const notifRef = db.collection('users').doc(pharmacyId).collection('realtime_notifications').doc(notifId);
            
            const notification: AppNotification = {
                id: notifId,
                type: 'REVIEW',
                title: 'تقييم جديد 🌟',
                message: `قام ${review.authorName} بإضافة تقييم ${review.rating} نجوم لصيدليتك.`,
                timestamp: new Date().toISOString(),
                read: false,
                link: '/dashboard'
            };
            
            await notifRef.set(notification);
        } catch (notifErr) {
            console.error("Failed to send notification for review", notifErr);
        }

      } catch (e) {
          console.error("Failed to add review with transaction:", e);
          throw e;
      }
  },
  
  listenToRealtimeNotifications: (userId: string, callback: (notifs: AppNotification[]) => void) => {
      return db.collection('users').doc(userId).collection('realtime_notifications')
        .limit(50)
        .onSnapshot((snapshot) => {
          const notifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
          notifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          callback(notifs);
      }, (error) => {
          if (error.code !== 'permission-denied') {
              console.warn("Snapshot listener warning:", error);
          }
      });
  },

  getNotifications: async (userId: string): Promise<AppNotification[]> => {
      try {
          const snapshot = await db.collection('users').doc(userId).collection('realtime_notifications').limit(50).get();
          const notifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
          return notifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      } catch (e) {
          return [];
      }
  },

  markNotificationAsRead: async (userId: string, notificationId: string) => {
      try {
          await db.collection('users').doc(userId).collection('realtime_notifications').doc(notificationId).update({
              read: true
          });
      } catch (e) {}
  },

  getUserFavorites: async (userId: string): Promise<Pharmacy[]> => {
      try {
          const snapshot = await db.collection('users').doc(userId).collection('favoris').get();
          return snapshot.docs.map(d => d.data() as Pharmacy);
      } catch (e) {
          return [];
      }
  },

  checkIsFavorite: async (userId: string, pharmacyId: string): Promise<boolean> => {
      const snap = await db.collection('users').doc(userId).collection('favoris').doc(pharmacyId).get();
      return snap.exists;
  },

  addToFavorites: async (userId: string, pharmacy: Pharmacy) => {
      await db.collection('users').doc(userId).collection('favoris').doc(pharmacy.id).set(pharmacy);
  },

  removeFromFavorites: async (userId: string, pharmacyId: string) => {
      await db.collection('users').doc(userId).collection('favoris').doc(pharmacyId).delete();
  },

  addSearchRequest: async (userId: string | null, req: SearchRequest) => {
      if (userId) {
          try {
             await db.collection('users').doc(userId).collection('requests').doc(req.id).set(req);
          } catch(e) {}
      }
      
      try {
        const cleanReq = { ...req, wilaya: req.wilaya.trim() }; 
        await db.collection('requests_global').doc(req.id).set({ ...cleanReq, userId: userId || 'guest' });
      } catch (e) {}
  },
  
  notifyPharmaciesOfSearch: async (wilaya: string, medicineName: string) => {
      try {
          const snapshot = await db.collection('users').where('wilaya', '==', wilaya.trim()).get();
          
          if (snapshot.empty) return;

          const batch = db.batch();
          let count = 0;

          snapshot.docs.forEach(docSnap => {
              if (count >= 490) return; 
              
              const userData = docSnap.data();
              if (userData.role !== 'PHARMACY') return;

              const pharmacyId = docSnap.id;
              const notifId = `req_notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
              
              const notifRef = db.collection('users').doc(pharmacyId).collection('realtime_notifications').doc(notifId);
              
              const notification: AppNotification = {
                  id: notifId,
                  type: 'REQUEST',
                  title: 'طلب دواء جديد 💊',
                  message: `مريض في ${wilaya} يبحث عن: ${medicineName}`,
                  timestamp: new Date().toISOString(),
                  read: false,
                  link: '/dashboard'
              };
              
              batch.set(notifRef, notification);
              count++;
          });
          
          if (count > 0) {
              await batch.commit();
          }
      } catch (e) {
          console.error("Error notifying pharmacies of search:", e);
      }
  },

  getUserRequests: async (userId: string): Promise<SearchRequest[]> => {
      try {
          const snapshot = await db.collection('users').doc(userId).collection('requests').get();
          const reqs = snapshot.docs.map(d => d.data() as SearchRequest);
          return reqs.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      } catch (e) {
          return [];
      }
  },

  listenToLiveRequests: (wilaya: string, callback: (requests: SearchRequest[]) => void) => {
      return db.collection('requests_global').onSnapshot((snapshot) => {
          const now = Date.now();
          const TIME_WINDOW_MS = 60 * 60 * 1000;
          const targetWilaya = (wilaya || '').trim();

          const activeRequests = snapshot.docs
            .map(d => d.data() as SearchRequest)
            .filter(req => {
                const reqWilaya = (req.wilaya || '').trim();
                if (reqWilaya !== targetWilaya) return false;

                const reqTime = req.timestamp ? new Date(req.timestamp).getTime() : 0;
                const isFresh = (now - reqTime) < TIME_WINDOW_MS;
                return req.status === 'active' && isFresh;
            })
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          
          callback(activeRequests);
      }, (error) => {
          if (error.code !== 'permission-denied') {
              console.warn("Error listening to live requests:", error);
          }
      });
  },

  getLiveSearchRequests: async (wilaya: string): Promise<SearchRequest[]> => {
      try {
          const snapshot = await db.collection('requests_global').where('wilaya', '==', wilaya.trim()).get();
          const now = Date.now();
          const FIVE_MINUTES_MS = 5 * 60 * 1000;

          return snapshot.docs
            .map(d => d.data() as SearchRequest)
            .filter(req => {
                const reqTime = new Date(req.timestamp).getTime();
                const isFresh = (now - reqTime) < FIVE_MINUTES_MS;
                return req.status === 'active' && isFresh;
            })
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      } catch (e) {
          return [];
      }
  },

  getTrendingMedicines: async (wilaya?: string): Promise<DrugStat[]> => {
      try {
          let snapshot;
          
          if (wilaya && wilaya !== 'ALL') {
             // Specific Wilaya
             snapshot = await db.collection('requests_global')
                .where('wilaya', '==', wilaya.trim())
                .limit(200)
                .get();
          } else {
             // Global (No Filter)
             // Order by timestamp desc to get recent trends
             // Note: Requires composite index if chaining .where with .orderBy. 
             // Since we removed .where, simple orderBy works or just simple limit.
             // For performance on large sets without an index, just limiting is safer for now.
             snapshot = await db.collection('requests_global')
                .limit(200)
                .get();
          }
          
          const totalDocs = snapshot.size;
          if (totalDocs === 0) return [];

          const counts: Record<string, number> = {};
          
          snapshot.forEach(doc => {
              const data = doc.data();
              const nameRaw = (data.medicineName || '').trim();
              if (nameRaw) {
                  const key = nameRaw.toLowerCase();
                  counts[key] = (counts[key] || 0) + 1;
              }
          });

          const stats: DrugStat[] = Object.keys(counts).map(key => ({
              name: key.charAt(0).toUpperCase() + key.slice(1),
              count: counts[key],
              percentage: Math.round((counts[key] / totalDocs) * 100)
          }));

          return stats.sort((a, b) => b.count - a.count).slice(0, 5);
      } catch (e) {
          console.error("Error fetching trending stats:", e);
          return [];
      }
  },

  submitSearchResponse: async (reqId: string, pharmacyId: string, status: AvailabilityStatus, price?: number, alt?: string) => {
      const profileSnap = await db.collection('users').doc(pharmacyId).collection('profiles_pharmacies').doc('profile').get();
      let pharmacyData: Pharmacy;
      
      if (profileSnap.exists) {
         pharmacyData = { id: pharmacyId, ...profileSnap.data() } as Pharmacy;
      } else {
         const userSnap = await db.collection('users').doc(pharmacyId).get();
         pharmacyData = { id: pharmacyId, ...userSnap.data() } as Pharmacy;
      }

      const response: SearchResponse = {
          id: `resp_${Date.now()}_${pharmacyId}`,
          requestId: reqId,
          pharmacy: pharmacyData,
          status: status,
          timestamp: new Date().toISOString()
      };
      
      if (price !== undefined && price !== null && !isNaN(price)) {
          response.price = price;
      }
      if (alt !== undefined && alt !== null) {
          response.alternativeName = alt;
      }

      const cleanResponse = removeUndefined(response);

      await db.collection('requests_global').doc(reqId).collection('responses').doc(cleanResponse.id).set(cleanResponse);

      if (status !== AvailabilityStatus.NOT_AVAILABLE) {
          try {
              const requestDoc = await db.collection('requests_global').doc(reqId).get();
              if (requestDoc.exists) {
                  const requestData = requestDoc.data();
                  const userId = requestData?.userId;

                  if (userId && userId !== 'guest') {
                      const notifId = `resp_notif_${Date.now()}`;
                      const notifRef = db.collection('users').doc(userId).collection('realtime_notifications').doc(notifId);
                      
                      let message = `${pharmacyData.name} لديها الدواء: ${status}`;
                      if (status === AvailabilityStatus.AVAILABLE && price) {
                          message += ` (السعر: ${price} دج)`;
                      } else if (status === AvailabilityStatus.ALTERNATIVE && alt) {
                          message += ` (بديل: ${alt})`;
                          if (price) message += ` (السعر: ${price} دج)`;
                      }

                      const notification: AppNotification = {
                          id: notifId,
                          type: 'RESPONSE',
                          title: 'رد جديد من الصيدلية 🔔',
                          message: message,
                          timestamp: new Date().toISOString(),
                          read: false,
                          link: '/home'
                      };

                      await notifRef.set(notification);
                  }
              }
          } catch (e) {
              console.error("Failed to send notification to user", e);
          }
      }
  },

  listenToSearchResponses: (requestId: string, callback: (responses: SearchResponse[]) => void) => {
      return db.collection('requests_global').doc(requestId).collection('responses')
        .onSnapshot((snapshot) => {
          const responses = snapshot.docs.map(d => d.data() as SearchResponse);
          callback(responses);
      }, (err) => {
          console.error("Listener error for responses:", err);
      });
  },

  getPharmacyStock: async (pharmacyId: string): Promise<MedicineAvailability[]> => {
      try {
          const snapshot = await db.collection('users').doc(pharmacyId).collection('medicines').get();
          return snapshot.docs.map(d => d.data() as MedicineAvailability);
      } catch (e) {
          return [];
      }
  },

  updateStock: async (pharmacyId: string, item: MedicineAvailability) => {
      await db.collection('users').doc(pharmacyId).collection('medicines').doc(item.id).set(item);
  },

  sendPrescription: async (p: Prescription) => {
      await db.collection('prescriptions').doc(p.id).set(p);
  },

  getPharmacyPrescriptions: async (wilaya: string): Promise<Prescription[]> => {
      try {
          const snapshot = await db.collection('prescriptions').where('wilaya', '==', wilaya).get();
          return snapshot.docs.map(d => d.data() as Prescription);
      } catch (e) {
          return [];
      }
  },

  respondToPrescription: async (pharmacyId: string, prescriptionId: string, status: any, notes: string) => {
      const response: PrescriptionResponse = {
          id: `res_${Date.now()}`,
          prescription_id: prescriptionId,
          pharmacy_id: pharmacyId,
          pharmacy_name: 'صيدلية', 
          response: status,
          notes: notes,
          timestamp: new Date().toISOString()
      };
      await db.collection('prescriptions').doc(prescriptionId).collection('responses').doc(response.id).set(response);
      await db.collection('prescriptions').doc(prescriptionId).update({ status: 'responded' });
  }
};
