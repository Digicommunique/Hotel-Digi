
export enum RoomStatus {
  VACANT = 'VACANT',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
  DIRTY = 'DIRTY',
  REPAIR = 'REPAIR',
  MANAGEMENT = 'MANAGEMENT',
  STAFF_BLOCK = 'STAFF_BLOCK'
}

export type UserRole = 'ADMIN' | 'RECEPTIONIST' | 'ACCOUNTANT' | 'SUPERVISOR';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  password?: string;
}

export enum RoomType {
  DELUXE = 'DELUXE ROOM',
  BUDGET = 'BUDGET ROOM',
  STANDARD = 'STANDARD ROOM',
  AC_FAMILY = 'AC FAMILY ROOM'
}

export interface RoomInventoryItem {
  id: string;
  name: string;
  quantity: number;
}

export interface Guest {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  nationality: string;
  gstin?: string;
  passportNo?: string;
  visaNo?: string;
  documents: {
    aadharFront?: string;
    aadharBack?: string;
    pan?: string;
    passportFront?: string;
    passportBack?: string;
    voterId?: string;
    drivingLicense?: string;
    photo?: string;
  };
}

export interface GroupProfile {
  id: string;
  groupName: string;
  groupType: 'Tour' | 'Corporate' | 'Wedding' | 'School' | 'Religious' | 'Sports';
  headName: string;
  phone: string;
  email: string;
  orgName?: string;
  gstNumber?: string;
  billingPreference: 'Single' | 'Split' | 'Mixed';
  documents: {
    contract?: string;
    headId?: string;
  };
  status: 'ACTIVE' | 'CLOSED';
}

export interface Charge {
  id: string;
  description: string;
  amount: number;
  date: string;
}

export interface Payment {
  id: string;
  amount: number;
  date: string;
  method: string;
  remarks: string;
}

export type TransactionType = 'RECEIPT' | 'PAYMENT' | 'JOURNAL' | 'DEBIT_NOTE' | 'CREDIT_NOTE' | 'REFUND';

export type AccountGroupName = 
  | 'Capital' 
  | 'Fixed Asset' 
  | 'Current Asset' 
  | 'Direct Expense' 
  | 'Indirect Expense' 
  | 'Direct Income' 
  | 'Indirect Income' 
  | 'Current Liability' 
  | 'Operating';

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  accountGroup: AccountGroupName;
  ledger: string;
  amount: number;
  description: string;
  referenceId?: string;
  entityName?: string;
}

export interface RoomShiftLog {
  id: string;
  bookingId: string;
  guestName: string;
  fromRoom: string;
  toRoom: string;
  date: string;
  reason: string;
}

export interface CleaningLog {
  id: string;
  roomId: string;
  staffName: string;
  date: string;
  status: 'CLEANED' | 'IN_PROGRESS';
}

export interface Quotation {
  id: string;
  date: string;
  guestName: string;
  validUntil: string;
  items: { description: string; price: number; qty: number }[];
  total: number;
  status: 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
}

export interface Booking {
  id: string;
  bookingNo: string;
  roomId: string;
  guestId: string;
  groupId?: string; 
  checkInDate: string;
  checkInTime: string;
  checkOutDate: string;
  checkOutTime: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'RESERVED';
  charges: Charge[];
  payments: Payment[];
  basePrice: number;
  discount: number;
  paxCount?: number;
  placeOfSupply?: string;
  mealPlan?: string;
  discountPercent?: number;
  company?: string;
  bizSource?: string;
  agent?: string;
  remarks?: string;
  purpose?: string;
  groupBookingId?: string;
  isComplementary?: boolean;
  agentCommission?: number;
}

export interface Room {
  id: string;
  number: string;
  floor: number;
  type: string;
  price: number;
  status: RoomStatus;
  currentBookingId?: string;
  inventory?: RoomInventoryItem[];
}

export interface AgentConfig {
  name: string;
  commission: number;
}

export interface HostelSettings {
  name: string;
  address: string;
  logo?: string;
  signature?: string;
  agents: AgentConfig[];
  roomTypes: string[];
  gstNumber?: string;
  taxRate?: number;
  hsnCode?: string;
  upiId?: string;
  adminPassword?: string;
  receptionistPassword?: string;
  accountantPassword?: string;
  supervisorPassword?: string;
}
