export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  curfewTime?: string;
  homeLocation?: { lat: number; lng: number };
  sponsorEmail?: string;
  caseworkerEmail?: string;
  role: 'user' | 'admin';
}

export interface ChecklistItem {
  id: string;
  userId: string;
  title: string;
  status: 'pending' | 'in-progress' | 'completed';
  category: 'ID' | 'Benefits' | 'Legal' | 'Other';
  notes?: string;
}

export interface Appointment {
  id: string;
  userId: string;
  title: string;
  startTime: string;
  endTime?: string;
  location?: string;
  type: 'PO' | 'Job' | 'Medical' | 'Other';
  notes?: string;
}

export interface JobLead {
  id: string;
  userId: string;
  company: string;
  position: string;
  status: 'new' | 'applied' | 'interviewing' | 'hired' | 'rejected';
  source?: string;
  notes?: string;
  followUpDate?: string;
}

export interface CheckIn {
  id: string;
  userId: string;
  timestamp: string;
  mood: string;
  challenges?: string;
  successes?: string;
  location?: { lat: number; lng: number };
}

export interface Benefit {
  id: string;
  userId: string;
  name: string;
  status: 'eligible' | 'applied' | 'active' | 'denied' | 'expired';
  renewalDate?: string;
  notes?: string;
}
