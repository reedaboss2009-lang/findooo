export enum AvailabilityStatus {
  AVAILABLE = 'متوفر',
  NOT_AVAILABLE = 'غير متوفر',
  ALTERNATIVE = 'يوجد بديل'
}

export interface Pharmacy {
  id: string;
  name: string;
  wilaya: string;
  commune: string;
  phone: string;
  opening_hours: string;
  email: string;
  approved: boolean;
  rating?: number;
  reviews_count?: number;
  lat?: number;
  lng?: number;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  wilaya: string;
  commune: string;
  address?: string;
  phone: string;
  opening_hours: string;
  rating: number;
  reviews_count: number;
  lat?: number;
  lng?: number;
  is_certified: boolean;
  email?: string;
}

export interface Medicine {
  id: string;
  name: string;
  category: string;
  description?: string;
}

export interface MedicineAvailability {
  id: string;
  pharmacy_id: string;
  medicine_name: string;
  availability: AvailabilityStatus;
  price?: number;
  alternative_name?: string;
  updated_at: string;
  pharmacy?: Pharmacy;
}

export interface Prescription {
  id: string;
  image_url: string;
  user_phone: string;
  wilaya: string;
  timestamp: string;
  status: 'pending' | 'responded';
}

export interface PrescriptionResponse {
  id: string;
  prescription_id: string;
  pharmacy_id: string;
  pharmacy_name: string;
  response: AvailabilityStatus;
  notes: string;
  timestamp: string;
}

export interface Offer {
  id: string;
  pharmacy_id: string;
  pharmacy_name: string;
  title: string;
  description: string;
  price: number;
  image_url: string;
  created_at: string;
}

export interface Review {
  id: string;
  targetId: string;
  authorId: string;
  authorName: string;
  rating: number;
  comment: string;
  timestamp: string;
}

export interface AppNotification {
  id: string;
  type: 'REVIEW' | 'SYSTEM' | 'REQUEST' | 'RESPONSE';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
}

export interface SearchRequest {
  id: string;
  medicineName: string;
  wilaya: string;
  timestamp: string;
  status: 'active' | 'expired';
}

export interface SearchResponse {
  id: string;
  requestId: string;
  pharmacy: Pharmacy;
  status: AvailabilityStatus;
  price?: number;
  alternativeName?: string;
  timestamp: string;
}

export type ViewState = 
  | 'HOME' 
  | 'PHARMACY_DETAILS' 
  | 'DOCTOR_DETAILS'
  | 'HEALTH_DIRECTORY' 
  | 'COMMON_MEDICINES'
  | 'LOGIN' 
  | 'PHARMACY_DASHBOARD' 
  | 'ADMIN_DASHBOARD'
  | 'USER_DASHBOARD';

export interface UserSession {
  role: 'GUEST' | 'PHARMACY' | 'ADMIN' | 'USER' | 'DOCTOR';
  id?: string;
  name?: string;
  wilaya?: string;
  phone?: string;
  email?: string;
  password?: string;
  approved?: boolean;
}

export interface DrugStat {
  name: string;
  count: number;
  percentage: number;
}