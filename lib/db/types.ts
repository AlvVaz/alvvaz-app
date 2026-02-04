export type ClientStatus = "new" | "active" | "vip" | "archived";

export type Client = {
  id: string;
  name: string;
  contact: string;
  tags: string[];
  notes: string;
  status: ClientStatus;
  createdAt: string;
  updatedAt: string;
};

export type MagazineIssue = {
  id: string;
  slug: string;
  title: string;
  description: string;
  publishedAt: string | null;
  thumbnailUrl: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type MagazineItemKind = "PDF" | "IMAGE";

export type MagazineItem = {
  id: string;
  issueId: string;
  title: string;
  kind: MagazineItemKind;
  fileUrl: string;
  sortOrder: number;
  createdAt: string;
  metadata: Record<string, unknown>;
};

export type MagazinePage = {
  id: string;
  issueId: string;
  pageNumber: number;
  imageUrl: string;
  title?: string;
};

export type TripTraveler = {
  name: string;
  phone: string;
  contract: string;
};

export type Trip = {
  id: string;
  clientName: string;
  destination: string;
  hotel: string;
  supplier: string;
  organizer: string;
  passengerCount: number;
  departureDate: string | null;
  returnDate: string | null;
  travelers: TripTraveler[];
  notes: string;
  prepStage: number;
  createdAt: string;
  updatedAt: string;
};

export type ContractStatus = "pending" | "signed" | "paid" | "canceled";

export type Contract = {
  id: string;
  clientId: string | null;
  tripId: string | null;
  contractNumber: string | null;
  reservationDate: string | null;
  seller: string | null;
  agency: string | null;
  clientName: string;
  destination: string;
  hotel: string | null;
  supplier: string | null;
  organizer: string | null;
  passengerCount: number | null;
  departureDate: string | null;
  returnDate: string | null;
  travelers: TripTraveler[];
  description: string | null;
  totalPrice: string | null;
  firstPayment: string | null;
  balanceDue: string | null;
  liquidationDate: string | null;
  status: ContractStatus;
  isSigned: boolean;
  isPaid: boolean;
  title: string;
  fileUrl: string | null;
  storageBucket: string | null;
  storagePath: string | null;
  mimeType: string | null;
  size: number | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type PromotionStatus = "live" | "draft" | "paused";

export type PromotionImage = {
  id: string;
  promotionId: string;
  fileUrl: string;
  storageBucket: string | null;
  storagePath: string | null;
  sortOrder: number;
  createdAt: string;
};

export type Promotion = {
  id: string;
  slug: string;
  title: string;
  destinationCity: string;
  destinationState: string;
  durationDays: number;
  durationNights: number | null;
  priceFrom: number;
  category: string;
  budget: string;
  summary: string;
  description: string | null;
  includes: string[];
  excludes: string[];
  itinerary: string[];
  activities: string[];
  availableFrom: string | null;
  availableTo: string | null;
  hotelName: string | null;
  hotelCategory: string | null;
  ctaLabel: string | null;
  ctaLink: string | null;
  tags: string[];
  status: PromotionStatus;
  sortOrder: number;
  images: PromotionImage[];
  createdAt: string;
  updatedAt: string;
};

export type DatabaseShape = {
  clients: Client[];
  issues: MagazineIssue[];
  items: MagazineItem[];
  contracts: Contract[];
  trips: Trip[];
  promotions: Promotion[];
};
