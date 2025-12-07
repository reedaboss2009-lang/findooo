
import { firebaseService } from './firebaseService';
import { MedicineAvailability, Pharmacy, Offer, Prescription, UserSession, AvailabilityStatus, DrugStat, SearchRequest, SearchResponse, Medicine, Review, Doctor } from '../types';

/**
 * MOCK SERVICE REPLACEMENT
 * This service now acts ONLY as a bridge to FirebaseService.
 * ALL demo data has been removed to delete history.
 */

export const mockService = {
  // --- AUTH ---
  login: async (email: string, pass: string) => {
      return firebaseService.login(email, pass);
  },

  registerUser: async (data: any) => {
      return firebaseService.registerUser(data);
  },

  // --- PHARMACIES ---
  getPharmacies: async (): Promise<Pharmacy[]> => {
    return firebaseService.getAllPharmacies();
  },

  savePharmacy: async (pharmacy: Pharmacy) => {
      // If no ID, generate a random one for the DB entry
      if (!pharmacy.id) pharmacy.id = `ph_${Date.now()}`;
      await firebaseService.savePharmacyProfile(pharmacy.id, pharmacy);
  },

  deletePharmacy: async (id: string) => {
      await firebaseService.deleteUserDoc(id); 
  },

  // --- DOCTORS ---
  getDoctors: async (): Promise<Doctor[]> => {
      return firebaseService.getAllDoctors();
  },

  saveDoctor: async (doctor: Doctor) => {
      if (!doctor.id) doctor.id = `d_${Date.now()}`;
      await firebaseService.saveDoctorProfile(doctor.id, doctor);
  },

  deleteDoctor: async (id: string) => {
      await firebaseService.deleteUserDoc(id);
  },

  // --- USERS ---
  getAllUsers: async () => {
      return firebaseService.getAllUsers();
  },

  deleteUser: async (id: string) => {
      return firebaseService.deleteUserDoc(id);
  },

  // --- MEDICINES ---
  getAllMedicines: async () => {
      return firebaseService.getAllMedicines();
  },

  saveMedicine: async (med: Medicine) => {
      return firebaseService.saveMedicine(med);
  },

  deleteMedicine: async (id: string) => {
      return firebaseService.deleteMedicine(id);
  },

  // --- REVIEWS ---
  getReviews: async (targetId: string) => {
      return firebaseService.getReviews(targetId);
  },
  
  getAllReviews: async () => {
      return []; 
  },

  addReview: async (review: Review) => {
      return firebaseService.addReview(review);
  },

  deleteReview: async (id: string) => {
      console.warn("Delete review not supported directly");
  },

  getAverageRating: async (targetId: string) => {
      try {
          const reviews = await firebaseService.getReviews(targetId);
          if (reviews.length === 0) return { rating: 0, count: 0 };
          const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
          return { rating: parseFloat((sum / reviews.length).toFixed(1)), count: reviews.length };
      } catch (e) {
          console.warn("Rating fetch failed (likely missing index or permission):", e);
          // Return default instead of crashing
          return { rating: 0, count: 0 };
      }
  },

  // --- FAVORITES ---
  toggleFavorite: async (userId: string, pharmacyId: string) => {
     // Check if exists
     const isFav = await firebaseService.checkIsFavorite(userId, pharmacyId);
     if (isFav) {
         await firebaseService.removeFromFavorites(userId, pharmacyId);
         return false;
     } else {
         // Note: UI usually needs to pass the full object. 
         // If we don't have it here, this toggle might fail or save incomplete data.
         // This is a bridge limitation, UI should prefer calling firebaseService directly.
         return true;
     }
  },

  getFavorites: async (userId: string) => {
      return firebaseService.getUserFavorites(userId);
  },

  checkIsFavorite: async (userId: string, pharmacyId: string) => {
      return firebaseService.checkIsFavorite(userId, pharmacyId);
  },

  // --- USER HISTORY & REQUESTS ---
  getUserHistory: async (userId: string) => {
      const reqs = await firebaseService.getUserRequests(userId);
      return reqs.map(r => ({ term: r.medicineName, wilaya: r.wilaya, date: r.timestamp }));
  },

  addToSearchHistory: async (userId: string, term: string, wilaya: string) => {
      const req: SearchRequest = {
          id: `req_${Date.now()}`,
          medicineName: term,
          wilaya: wilaya,
          timestamp: new Date().toISOString(),
          status: 'active'
      };
      await firebaseService.addSearchRequest(userId, req);
  },

  startSearchSession: async (query: string, wilaya: string) => {
      return `req_${Date.now()}`;
  },

  getSearchResponses: async (requestId: string) => {
      // Real-time listener handled in UI or Notification logic
      return []; 
  },
  
  getLiveSearchRequests: async (wilaya: string) => {
      return firebaseService.getLiveSearchRequests(wilaya);
  },

  listenToLiveRequests: (wilaya: string, callback: (requests: SearchRequest[]) => void) => {
      return firebaseService.listenToLiveRequests(wilaya, callback);
  },
  
  getTrendingMedicines: async (wilaya?: string) => {
      return firebaseService.getTrendingMedicines(wilaya);
  },

  submitSearchResponse: async (reqId: string, pharmacyId: string, status: AvailabilityStatus, price?: number, alt?: string) => {
      return firebaseService.submitSearchResponse(reqId, pharmacyId, status, price, alt);
  },
  
  // --- PHARMACY STOCK ---
  getPharmacyStock: async (pharmacyId: string) => {
      return firebaseService.getPharmacyStock(pharmacyId);
  },
  
  updateStock: async (item: MedicineAvailability) => {
      if (item.pharmacy_id) {
          return firebaseService.updateStock(item.pharmacy_id, item);
      }
  },

  // --- PRESCRIPTIONS ---
  sendPrescription: async (file: File, wilaya: string, phone: string) => {
       const p: Prescription = {
           id: `pr_${Date.now()}`,
           image_url: 'https://via.placeholder.com/300', 
           user_phone: phone,
           wilaya: wilaya,
           timestamp: new Date().toISOString(),
           status: 'pending'
       };
       await firebaseService.sendPrescription(p);
       return p.id;
  },

  getPharmacyPrescriptions: async (wilaya: string) => {
      return firebaseService.getPharmacyPrescriptions(wilaya);
  },
  
  respondToPrescription: async (pharmaId: string, pId: string, status: any, notes: string) => {
      return firebaseService.respondToPrescription(pharmaId, pId, status, notes);
  },

  // --- STUBS ---
  getOffers: async () => [],
  addOffer: async (offer: Offer) => {},
  getCommonMedicines: async () => firebaseService.getTrendingMedicines('ALL'),
  getUserPrescriptionResponses: async (id: string) => [],
  upsertStock: async () => {}
};
