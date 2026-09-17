import { API_BASE } from '../config';
export { API_BASE };

export type ItemUnit = 'unidad' | 'kg' | 'litro' | 'paquete';
export type ItemType = 'producto' | 'servicio';
export type CategoryKind = 'negocio' | 'item';
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export type CatalogBusiness = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  photoUrl: string | null;
  categoryId: string | null;
  categoryName: string | null;
  itemsCount: number;
};

export type PublicItem = {
  id: string;
  type: ItemType;
  name: string;
  description: string | null;
  price: number;
  unit: ItemUnit | null;
  photoUrl: string | null;
  categoryId: string | null;
  categoryName: string | null;
};

export type CatalogProduct = {
  id: string;
  type: ItemType;
  name: string;
  description: string | null;
  price: number;
  unit: ItemUnit | null;
  photoUrl: string | null;
  categoryName: string | null;
  businessId: string;
  businessName: string;
  businessAddress: string | null;
  businessLatitude: number | null;
  businessLongitude: number | null;
  distanceKm: number | null;
};

export type CatalogProductDetail = CatalogProduct & {
  businessPhone: string | null;
  businessPhotoUrl: string | null;
};

export type Business = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  categoryId: string | null;
  categoryName: string | null;
  latitude: number | null;
  longitude: number | null;
  active: boolean;
  itemsCount?: number;
};

export type BusinessItem = {
  id: string;
  businessId: string;
  type: ItemType;
  name: string;
  description: string | null;
  price: number;
  unit: ItemUnit | null;
  photoUrl: string | null;
  categoryId: string | null;
  available: boolean;
};

export type Category = {
  id: string;
  name: string;
  kind: CategoryKind;
};

export type ProductCategory = {
  id: string;
  name: string;
};

export type Application = {
  id: string;
  status: ApplicationStatus;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
};

export type UserRole = 'consumidor' | 'productor' | 'administrador';
export type UserStatus = 'active' | 'suspended';

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
};

export type AdminApplication = {
  id: string;
  status: ApplicationStatus;
  createdAt: string;
  reviewedAt: string | null;
  userName: string;
  userEmail: string;
};

export type AdminBusiness = {
  id: string;
  name: string;
  address: string | null;
  active: boolean;
  itemsCount: number;
  ownerName: string;
  ownerEmail: string;
};

export type AdminStats = {
  totals: {
    businesses: number;
    products: number;
    services: number;
  };
  byBusiness: { name: string; products: number; services: number }[];
  businessesByCategory: { name: string; count: number }[];
  productsByCategory: { name: string; count: number }[];
};