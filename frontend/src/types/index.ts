// Типы пользователей
export interface User {
  id: number;
  username: string;
  login: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  currentRole?: UserRole;
  email?: string;
  phone?: string;
  status: UserStatus;
  availabilityStatus?: AvailabilityStatus;
  createdAt: string;
  updatedAt: string;
}

export const UserRole = {
  DEVELOPER: 'DEVELOPER',
  ADMIN: 'ADMIN',
  DIRECTOR: 'DIRECTOR',
  ACCOUNTANT: 'ACCOUNTANT',
  MANAGER: 'MANAGER',
  DISPATCHER: 'DISPATCHER',
  SUPPLIER: 'SUPPLIER',
  OPERATOR: 'OPERATOR',
  DRIVER: 'DRIVER',
  CLIENT: 'CLIENT',
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

export const UserStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  BLOCKED: 'BLOCKED',
} as const;

export type UserStatus = typeof UserStatus[keyof typeof UserStatus];

export const AvailabilityStatus = {
  ONLINE: 'ONLINE',
  BREAK: 'BREAK',
  LUNCH: 'LUNCH',
} as const;

export type AvailabilityStatus = typeof AvailabilityStatus[keyof typeof AvailabilityStatus];

// Типы компаний
export interface Company {
  id: number;
  name: string;
  bin: string;
  address: string;
  phone: string;
  email?: string;
  director?: string;
  bankName?: string;
  iik?: string;
  bik?: string;
  createdAt: string;
  updatedAt: string;
}

// Типы контрагентов
export interface Counterparty {
  id: number;
  kind: CounterpartyKind;
  type: CounterpartyType;
  name: string;
  binOrIin?: string;
  phone: string;
  address?: string;
  representativeName?: string;
  representativePhone?: string;
  createdAt: string;
  updatedAt: string;
}

export const CounterpartyKind = {
  INDIVIDUAL: 'INDIVIDUAL',
  LEGAL: 'LEGAL',
} as const;

export type CounterpartyKind = typeof CounterpartyKind[keyof typeof CounterpartyKind];

export const CounterpartyType = {
  CUSTOMER: 'CUSTOMER',
  SUPPLIER: 'SUPPLIER',
} as const;

export type CounterpartyType = typeof CounterpartyType[keyof typeof CounterpartyType];

// Типы складов
export interface Warehouse {
  id: number;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  companyId?: number;
  company?: Company;
  // Весы и камера
  scaleActive?: boolean;
  scaleUrl?: string;
  scaleDriver?: string;
  scalePolling?: number;
  scaleDecimals?: number;
  cameraActive?: boolean;
  cameraUrl?: string;
  // ScaleBridge интеграция
  hasScales?: boolean;
  scaleIpAddress?: string;
  scaleApiKey?: string;
  scaleComPort?: string;
  scaleStatus?: string;
  scaleLastSeen?: string;
  hasCamera?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Типы материалов
export interface Material {
  id: number;
  name: string;
  unit: string;
  typeId: number;
  type: MaterialType;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialType {
  id: number;
  name: MaterialTypeEnum;
}

export const MaterialTypeEnum = {
  CEMENT: 'CEMENT',
  SAND: 'SAND',
  GRAVEL: 'GRAVEL',
  WATER: 'WATER',
  ADDITIVE: 'ADDITIVE',
} as const;

export type MaterialTypeEnum = typeof MaterialTypeEnum[keyof typeof MaterialTypeEnum];

// Типы марок бетона
export interface ConcreteMark {
  id: number;
  name: string;
  description?: string;
  materials?: ConcreteMarkMaterial[];
  createdAt: string;
  updatedAt: string;
}

export interface ConcreteMarkMaterial {
  id: number;
  markId: number;
  materialId: number;
  quantityPerM3: number;
  unit: string;
  material: Material;
}

// Типы водителей
export interface Driver {
  id: number;
  firstName: string;
  lastName: string;
  name: string;
  phone: string;
  email?: string;
  licenseNumber?: string;
  licenseExpiryDate?: string;
  userId?: number;
  user?: User;
  _count?: {
    invoices: number;
  };
  createdAt: string;
  updatedAt: string;
}

// Типы транспорта
export interface Vehicle {
  id: number;
  type: VehicleType;
  plate: string;
  capacity?: number;
  unit?: string;
  drivers?: {
    id: number;
    firstName: string;
    lastName: string;
    phone: string;
  }[];
  _count?: {
    invoices: number;
  };
  createdAt: string;
  updatedAt: string;
}

export const VehicleType = {
  MIXER: 'MIXER',
  DUMP_TRUCK: 'DUMP_TRUCK',
  LOADER: 'LOADER',
  OTHER: 'OTHER',
} as const;

export type VehicleType = typeof VehicleType[keyof typeof VehicleType];

// Типы заказов
export interface Order {
  id: number;
  orderNumber: string;
  customerId: number;
  concreteMarkId: number;
  quantityM3: number;
  paymentType: PaymentType;
  deliveryDate: string;
  deliveryTime: string;
  deliveryAddress: string;
  coordinates?: string;
  status: OrderStatus;
  notes?: string;
  createdById: number;
  approvedById?: number;
  // Поля для предложенных изменений от директора
  proposedDeliveryDate?: string;
  proposedDeliveryTime?: string;
  proposedDeliveryAddress?: string;
  proposedCoordinates?: string;
  changeReason?: string;
  // Поля для запроса на удаление (тройное подтверждение)
  deletionRequestedById?: number;
  deletionReason?: string;
  deletionRequestedAt?: string;
  deletionRequestedBy?: User;
  directorApprovedDeletion?: boolean;
  dispatcherApprovedDeletion?: boolean;
  creatorApprovedDeletion?: boolean;
  customer: Counterparty;
  concreteMark: ConcreteMark;
  createdBy: User;
  approvedBy?: User;
  additionalServices?: OrderAdditionalService[];
  invoices?: Invoice[]; // Накладные по заказу для подсчета доставленного объема
  createdAt: string;
  updatedAt: string;
}

export const PaymentType = {
  CASH: 'CASH',
  CASHLESS: 'CASHLESS',
} as const;

export type PaymentType = typeof PaymentType[keyof typeof PaymentType];

export const OrderStatus = {
  DRAFT: 'DRAFT',
  PENDING_DIRECTOR: 'PENDING_DIRECTOR',
  WAITING_CREATOR_APPROVAL: 'WAITING_CREATOR_APPROVAL',
  APPROVED_BY_DIRECTOR: 'APPROVED_BY_DIRECTOR',
  PENDING_DISPATCHER: 'PENDING_DISPATCHER',
  DISPATCHED: 'DISPATCHED',
  IN_DELIVERY: 'IN_DELIVERY',
  DELIVERED: 'DELIVERED',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
  CANCELED: 'CANCELED',
} as const;

export type OrderStatus = typeof OrderStatus[keyof typeof OrderStatus];

// Типы накладных
export interface Invoice {
  id: number;
  invoiceNumber: string;
  type: InvoiceType;
  date: string;
  orderId?: number;
  companyId?: number;
  warehouseId?: number;
  customerId?: number;
  supplierId?: number;
  createdById: number;
  concreteMarkId?: number;
  quantityM3?: number;
  slumpValue?: number;
  sealNumbers: string[];
  departureAddress?: string;
  latitudeFrom?: number;
  longitudeFrom?: number;
  latitudeTo?: number;
  longitudeTo?: number;
  distanceKm?: number;
  vehicleId?: number;
  driverId?: number;
  dispatcherId?: number;
  releasedByFio?: string;
  receivedByFio?: string;
  basePricePerM3?: number;
  salePricePerM3?: number;
  managerProfit?: number;
  materialId?: number;
  grossWeightKg?: number;
  tareWeightKg?: number;
  netWeightKg?: number;
  grossWeightAt?: string;
  tareWeightAt?: string;
  moisturePercent?: number;
  correctedWeightKg?: number;
  status?: string;
  order?: Order;
  company?: Company;
  warehouse?: Warehouse;
  customer?: Counterparty;
  supplier?: Counterparty;
  createdBy: User;
  concreteMark?: ConcreteMark;
  vehicle?: Vehicle;
  driver?: Driver;
  dispatcher?: User;
  material?: Material;
  items?: InvoiceItem[];
  // Поля времени для водителей
  arrivedSiteAt?: string;
  departedSiteAt?: string;
  arrivedSiteLatitude?: number;
  arrivedSiteLongitude?: number;
  departedSiteLatitude?: number;
  departedSiteLongitude?: number;
  createdAt: string;
  updatedAt: string;
}

export const InvoiceType = {
  EXPENSE: 'EXPENSE',
  INCOME: 'INCOME',
} as const;

export type InvoiceType = typeof InvoiceType[keyof typeof InvoiceType];

export interface InvoiceItem {
  id: number;
  invoiceId: number;
  materialId: number;
  quantity: number;
  unit: string;
  isManualEdit: boolean;
  material: Material;
}

// Общие типы для API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

// Внутренние заявки
export const RequestStatus = {
  NEW: 'NEW',
  UNDER_REVIEW: 'UNDER_REVIEW',
  WAITING_DIRECTOR: 'WAITING_DIRECTOR',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  WAITING_ACCOUNTANT: 'WAITING_ACCOUNTANT',
  FUNDED: 'FUNDED',
  PURCHASED: 'PURCHASED',
  DELIVERED: 'DELIVERED',
} as const;

export type RequestStatus = typeof RequestStatus[keyof typeof RequestStatus];

export interface RequestHistoryItem {
  step: string;
  user: string;
  date: string;
}

export interface InternalRequest {
  id: number;
  requestNumber: string;
  employeeId: number;
  itemName: string;
  quantity: number;
  unit: string;
  reason?: string;
  supplier?: string;
  price?: number;
  totalAmount?: number;
  warehouseId?: number;
  status: RequestStatus;
  directorDecision?: string;
  accountantApproved: boolean;
  receiverConfirmed: boolean;
  currentStep?: string;
  history?: RequestHistoryItem[];
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: number;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  warehouse?: {
    id: number;
    name: string;
  };
}

// Дополнительные услуги
export interface AdditionalService {
  id: number;
  name: string;
  description?: string;
  price: number;
  unit?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderAdditionalService {
  id: number;
  orderId: number;
  additionalServiceId: number;
  quantity: number;
  price: number;
  totalAmount: number;
  createdAt: string;
  additionalService: AdditionalService;
}