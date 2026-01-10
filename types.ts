
export enum RoomStatus {
  VACANT = 'VACANT',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
  DIRTY = 'DIRTY',
  REPAIR = 'REPAIR',
  MANAGEMENT = 'MANAGEMENT',
  STAFF_BLOCK = 'STAFF_BLOCK'
}

export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'RECEPTIONIST' | 'ACCOUNTANT' | 'SUPERVISOR';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  password?: string;
}

export interface Supervisor {
  id: string;
  name: string;
  loginId: string;
  password?: string;
  assignedRoomIds: string[];
  status: 'ACTIVE' | 'INACTIVE';
  lastActive?: string;
}

export enum RoomType {
  DELUXE = 'DELUXE ROOM',
  BUDGET = 'BUDGET ROOM',
  STANDARD = 'STANDARD ROOM',
  AC_FAMILY = 'AC FAMILY ROOM'
}

export interface Occupant {
  id: string;
  name: string;
  gender: 'Male' | 'Female' | 'Other';
  idFront?: string;
  idBack?: string;
}

export interface Guest {
  id: string;
  name: string; 
  surName?: string;
  givenName?: string;
  gender?: 'Male' | 'Female' | 'Other';
  dob?: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  country?: string;
  nationality: string;
  idType: 'Aadhar' | 'Passport' | 'PAN' | 'VoterId' | 'License' | 'Other';
  idNumber: string;
  adults: number;
  children: number;
  kids: number;
  others: number;
  gstin?: string;
  
  passportNo?: string;
  passportPlaceOfIssue?: string;
  passportDateOfIssue?: string;
  passportDateOfExpiry?: string;
  visaNo?: string;
  visaType?: string;
  visaPlaceOfIssue?: string;
  visaDateOfIssue?: string;
  visaDateOfExpiry?: string;
  embassyCountry?: string;
  arrivalFrom?: string;
  nextDestination?: string;
  arrivalInIndiaDate?: string;
  stayDurationIndia?: string;
  purposeOfVisit?: string;
  employedInIndia?: boolean;
  contactInIndia?: string;
  cellInIndia?: string;
  residingCountryContact?: string;
  addressInIndia?: string;
  applicationId?: string;
  remarks?: string;

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
export type AccountGroupName = 'Capital' | 'Fixed Asset' | 'Current Asset' | 'Direct Expense' | 'Indirect Expense' | 'Direct Income' | 'Indirect Income' | 'Current Liability' | 'Operating';

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  accountGroup: AccountGroupName;
  ledger: string;
  amount: number;
  entityName?: string;
  description: string;
  referenceId?: string;
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
  date: string;
  staffName?: string;
}

export interface Quotation {
  id: string;
  date: string;
  guestName: string;
  amount: number;
  remarks?: string;
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
  adults?: number;
  children?: number;
  kids?: number;
  others?: number;
  mealPlan?: string;
  agent?: string;
  purpose?: string;
  company?: string;
  occupants?: Occupant[];
  secondaryGuest?: {
    name: string;
    gender: 'Male' | 'Female' | 'Other';
    documents: {
      aadharFront?: string;
      aadharBack?: string;
    };
  };
}

export interface Room {
  id: string;
  number: string;
  floor: number;
  type: string;
  price: number;
  status: RoomStatus;
  currentBookingId?: string;
}

export interface AgentConfig {
  name: string;
  commission: number;
}

export interface HostelSettings {
  name: string;
  address: string;
  agents: AgentConfig[];
  roomTypes: string[];
  gstNumber?: string;
  taxRate?: number;
  cgstRate?: number;
  sgstRate?: number;
  igstRate?: number;
  hsnCode?: string;
  upiId?: string;
  adminPassword?: string;
  receptionistPassword?: string;
  accountantPassword?: string;
  supervisorPassword?: string;
  logo?: string;
  signature?: string;
}
