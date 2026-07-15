/**
 * Mock dataset configuration.
 *
 * The property structures, staff accounts, room numbering and starter expense
 * categories are ported 1:1 from the backend seed (triya-manager/prisma/seed.ts)
 * so the mobile demo matches the real system. Occupancy, tenants and activity
 * are generated on top (the real seed starts empty; a demo should not).
 */

// ---------------------------------------------------------------------------
// Property structure (ported from the backend seed)
// ---------------------------------------------------------------------------

export interface FloorDef {
  number: number;
  name?: string;
}

export interface BlockDef {
  name: string;
  /** Sharing type (bed count) per room, in floor order. */
  rooms: number[];
  floors: FloorDef[];
  /** Display flavour used by the dashboard for flat properties. */
  flavour?: string;
}

export type PropertyDef = {
  name: string;
  slug: string;
  address: string;
  city: string;
  phone: string;
  isFlat?: boolean;
  account: { name: string; email: string; password: string };
  /** Fraction of beds occupied in the generated dataset. */
  occupancyRate: number;
  /** Monthly rent in PAISE by sharing type ('block:<name>' overrides for flats). */
  rentTable: Record<string, number>;
  rulesText: string | null;
} & (
  | { hasBlocks: false; rooms: number[]; floors: FloorDef[] }
  | { hasBlocks: true; blocks: BlockDef[] }
);

const floorsNamed = (numbers: number[]): FloorDef[] =>
  numbers.map((number) => ({ number, name: `Floor ${number}` }));

export const PROPERTY_DEFS: PropertyDef[] = [
  {
    name: 'Joystayz',
    slug: 'joystayz',
    address: 'Plot 42, Gachibowli',
    city: 'Hyderabad',
    phone: '+91 98490 22110',
    account: { name: 'Joystayz', email: 'joystayz@triya.local', password: 'joystayz@12345' },
    occupancyRate: 0.86,
    rentTable: { '2': 1_050_000, '3': 850_000 },
    rulesText:
      'Gate closes at 11:00 PM. Visitors allowed only in the common area. ' +
      'Rent due by the 5th of every month. Keep the kitchen clean after use. ' +
      'No smoking inside rooms.',
    hasBlocks: false,
    rooms: [3, 3, 2, 2, 3, 2, 3, 3, 3, 2, 2, 3, 3, 2],
    floors: floorsNamed([3, 4, 5, 6, 7]),
  },
  {
    name: 'Frieden Co-Living',
    slug: 'frieden',
    address: 'Road No. 12, Banjara Hills',
    city: 'Hyderabad',
    phone: '+91 98668 47320',
    account: { name: 'Frieden Co-Living', email: 'frieden@triya.local', password: 'frieden@12345' },
    occupancyRate: 0.78,
    rentTable: { '2': 1_200_000, '3': 950_000 },
    rulesText:
      'Quiet hours after 10:30 PM. Laundry slots by floor — check the notice board. ' +
      'Rent due by the 5th. 15-day notice required before vacating.',
    hasBlocks: true,
    blocks: [
      {
        name: 'A',
        rooms: [2, 2, 2, 3, 2, 2, 3, 2, 3, 3],
        floors: floorsNamed([1, 2, 3, 4, 5, 6]),
      },
      {
        name: 'B',
        rooms: [2, 2, 2, 3, 3, 3, 3, 2, 3, 2],
        floors: floorsNamed([1, 2, 3, 4, 5, 6]),
      },
    ],
  },
  {
    name: 'Cozy Gowlidoddy',
    slug: 'cozy-gowlidoddy',
    address: 'Survey 88, Gowlidoddy',
    city: 'Hyderabad',
    phone: '+91 97015 63488',
    account: { name: 'Cozy Gowlidoddy', email: 'cozy@triya.local', password: 'cozy@12345' },
    isFlat: true,
    occupancyRate: 0.64,
    rentTable: { 'block:A': 1_800_000, 'block:B': 2_200_000, 'block:C': 2_600_000 },
    rulesText: null,
    hasBlocks: true,
    blocks: [
      { name: 'A', flavour: 'STUDIO', rooms: [1, 1, 1, 1, 1], floors: floorsNamed([1, 2, 3, 4, 5]) },
      { name: 'B', flavour: 'Premium', rooms: [1, 1, 1, 1, 1], floors: floorsNamed([1, 2, 3, 4, 5]) },
      { name: 'C', flavour: 'Hotel', rooms: [1, 1, 1, 1, 1], floors: floorsNamed([1, 2, 3, 4, 5]) },
    ],
  },
];

export const ADMIN_ACCOUNT = {
  name: 'Triya Admin',
  email: 'admin@triya.local',
  password: 'Admin@12345',
};

/**
 * Dashboard display names for Cozy's blocks (mirrors the web dashboard's
 * block naming: A → STUDIO, B → Premium, C → Hotel).
 */
export const FLAT_BLOCK_FLAVOURS: Record<string, string> = {
  A: 'STUDIO',
  B: 'Premium',
  C: 'Hotel',
};

// ---------------------------------------------------------------------------
// Starter expense categories (ported from the backend seed)
// ---------------------------------------------------------------------------

export const STARTER_CATEGORIES: { name: string; subs: string[] }[] = [
  { name: 'Utilities', subs: ['Electricity', 'Water', 'Internet'] },
  { name: 'Maintenance', subs: ['Plumbing', 'Electrical', 'Carpentry', 'Painting'] },
  { name: 'Food & Groceries', subs: ['Rice', 'Vegetables', 'Milk', 'Groceries'] },
  { name: 'Staff Salary', subs: [] },
  { name: 'Cleaning', subs: [] },
  { name: 'Miscellaneous', subs: [] },
];

// ---------------------------------------------------------------------------
// People pools
// ---------------------------------------------------------------------------

export const FIRST_NAMES = [
  'Aarav', 'Aditya', 'Akhil', 'Ananya', 'Anjali', 'Arjun', 'Bhavana', 'Charan',
  'Deepika', 'Divya', 'Farhan', 'Gautham', 'Harini', 'Harsha', 'Ishaan', 'Kavya',
  'Keerthi', 'Kiran', 'Lakshmi', 'Madhav', 'Manasa', 'Meghana', 'Mohan', 'Naveen',
  'Neha', 'Nikhil', 'Pallavi', 'Pranav', 'Praveen', 'Priya', 'Rahul', 'Rajesh',
  'Ramya', 'Ravi', 'Rohit', 'Sahithi', 'Sai Kumar', 'Sandeep', 'Shreya', 'Sneha',
  'Srinivas', 'Suresh', 'Swathi', 'Tejas', 'Uday', 'Varun', 'Vikram', 'Vishnu',
];

export const LAST_NAMES = [
  'Reddy', 'Sharma', 'Kumar', 'Rao', 'Naidu', 'Verma', 'Gupta', 'Patel',
  'Iyer', 'Chowdary', 'Goud', 'Nair', 'Prasad', 'Yadav', 'Singh', 'Das',
  'Kulkarni', 'Menon', 'Pillai', 'Joshi', 'Mishra', 'Bose', 'Sen', 'Agarwal',
];

export const OCCUPATIONS: { label: string; kind: 'student' | 'professional' }[] = [
  { label: 'Software Engineer', kind: 'professional' },
  { label: 'Data Analyst', kind: 'professional' },
  { label: 'UI Designer', kind: 'professional' },
  { label: 'Chartered Accountant', kind: 'professional' },
  { label: 'Bank Associate', kind: 'professional' },
  { label: 'Marketing Executive', kind: 'professional' },
  { label: 'Civil Engineer', kind: 'professional' },
  { label: 'Pharmacist', kind: 'professional' },
  { label: 'B.Tech Student', kind: 'student' },
  { label: 'MBA Student', kind: 'student' },
  { label: 'CA Aspirant', kind: 'student' },
  { label: 'Medical Student', kind: 'student' },
];

export const COLLEGES = [
  'IIIT Hyderabad',
  'JNTU Hyderabad',
  'Osmania University',
  'CBIT',
  'VNR VJIET',
  'ISB Hyderabad',
];

export const COMPANIES = [
  'Infosys',
  'TCS',
  'Deloitte',
  'Amazon Development Centre',
  'Wipro',
  'Tech Mahindra',
  'HDFC Bank',
  'Accenture',
];

// ---------------------------------------------------------------------------
// Complaints pool
// ---------------------------------------------------------------------------

export const COMPLAINT_POOL: { title: string; description: string }[] = [
  { title: 'Wi-Fi not working', description: 'Internet has been down since last night on the entire floor.' },
  { title: 'Geyser not heating', description: 'Hot water is not coming in the bathroom, geyser indicator stays off.' },
  { title: 'Water leakage in bathroom', description: 'Continuous leakage from the flush tank, floor stays wet.' },
  { title: 'AC not cooling', description: 'The AC is running but not cooling. Might need a gas refill.' },
  { title: 'Washing machine broken', description: 'The washing machine on this floor stops mid-cycle.' },
  { title: 'Cot repair needed', description: 'One leg of the cot is broken and it wobbles badly.' },
  { title: 'Power socket sparking', description: 'The socket near the study table sparks when plugging in.' },
  { title: 'Food quality issue', description: 'Dinner has been cold and undercooked for the past few days.' },
  { title: 'Pest control required', description: 'Cockroaches spotted in the kitchen and corridor.' },
  { title: 'Room cleaning not done', description: 'Housekeeping skipped our room twice this week.' },
  { title: 'Lift not working', description: 'The lift has been stuck on the ground floor since morning.' },
  { title: 'Water purifier issue', description: 'RO water tastes odd and the filter light is blinking.' },
  { title: 'Cupboard lock jammed', description: 'Unable to open the wardrobe locker, key does not turn.' },
  { title: 'Street dogs at gate', description: 'Dogs near the entrance at night make it unsafe to enter.' },
  { title: 'Mattress replacement', description: 'The mattress is worn out and causing back pain.' },
  { title: 'Fan making noise', description: 'Ceiling fan wobbles and makes a loud humming noise at speed 3+.' },
  { title: 'Bathroom light fused', description: 'The bulb in the common bathroom fused two days ago.' },
  { title: 'Parking space blocked', description: 'Bikes are parked haphazardly, no space to take mine out.' },
];

// ---------------------------------------------------------------------------
// Expense pools (vendor + rupee range by category)
// ---------------------------------------------------------------------------

export const EXPENSE_POOL: Record<
  string,
  { vendors: (string | null)[]; minRupees: number; maxRupees: number; notes?: string[] }
> = {
  Utilities: {
    vendors: ['TSSPDCL', 'HMWSSB', 'ACT Fibernet', 'Airtel Business'],
    minRupees: 1800,
    maxRupees: 42000,
  },
  Maintenance: {
    vendors: ['Kumar Plumbing Works', 'Sri Sai Electricals', 'Modern Carpentry', 'Colour Craft Painters'],
    minRupees: 400,
    maxRupees: 9500,
  },
  'Food & Groceries': {
    vendors: ['More Supermarket', 'Heritage Fresh', 'Rythu Bazar', 'Amul Distributor'],
    minRupees: 900,
    maxRupees: 28000,
  },
  'Staff Salary': {
    vendors: [null],
    minRupees: 8000,
    maxRupees: 18000,
    notes: ['Cook salary', 'Watchman salary', 'Housekeeping salary', 'Warden salary'],
  },
  Cleaning: {
    vendors: ['Sparkle Housekeeping', 'UrbanPro Deep Clean'],
    minRupees: 1200,
    maxRupees: 6000,
  },
  Miscellaneous: {
    vendors: ['Amazon', 'Local Hardware Store', 'D-Mart'],
    minRupees: 150,
    maxRupees: 5200,
  },
};
