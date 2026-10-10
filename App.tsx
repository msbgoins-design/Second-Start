/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  auth, db 
} from './firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  getDocFromServer
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Calendar, 
  Briefcase, 
  ClipboardCheck, 
  Settings, 
  LogOut, 
  Plus, 
  Clock, 
  MapPin, 
  AlertCircle,
  ChevronRight,
  CheckCircle2,
  Circle,
  Loader2,
  Sparkles,
  FileText,
  Send,
  Copy,
  Check,
  Search,
  MessageSquare,
  BookOpen,
  ExternalLink,
  Map as MapIcon,
  Heart,
  Scale,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isAfter, parseISO, differenceInMinutes, addDays, startOfDay } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { UserProfile, ChecklistItem, Appointment, JobLead, CheckIn, Benefit } from './types';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Button = ({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger', size?: 'sm' | 'md' | 'lg' }) => {
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm',
    secondary: 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 shadow-sm',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg font-medium'
  };
  return (
    <button 
      className={cn('inline-flex items-center justify-center rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed', variants[variant], sizes[size], className)} 
      {...props} 
    />
  );
};

const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn('bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden', className)}>
    {children}
  </div>
);

const Badge = ({ children, variant = 'default' }: { children: React.ReactNode, variant?: 'default' | 'success' | 'warning' | 'info' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    info: 'bg-blue-100 text-blue-700'
  };
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', variants[variant])}>
      {children}
    </span>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [error, setError] = useState<string | null>(null);
  
  // Data State
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [jobLeads, setJobLeads] = useState<JobLead[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [benefits, setBenefits] = useState<Benefit[]>([]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Fetch/Create Profile
        const profileRef = doc(db, 'users', u.uid);
        onSnapshot(profileRef, (snap) => {
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          } else {
            const newProfile: UserProfile = {
              uid: u.uid,
              displayName: u.displayName,
              email: u.email,
              role: 'user'
            };
            setDoc(profileRef, newProfile);
          }
        });

        // Listen to subcollections
        const checklistQuery = query(collection(db, 'users', u.uid, 'checklist'), orderBy('status', 'asc'));
        onSnapshot(checklistQuery, (snap) => {
          setChecklist(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChecklistItem)));
        });

        const appointmentsQuery = query(collection(db, 'users', u.uid, 'appointments'), orderBy('startTime', 'asc'));
        onSnapshot(appointmentsQuery, (snap) => {
          setAppointments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment)));
        });

        const jobLeadsQuery = query(collection(db, 'users', u.uid, 'jobLeads'), orderBy('status', 'asc'));
        onSnapshot(jobLeadsQuery, (snap) => {
          setJobLeads(snap.docs.map(d => ({ id: d.id, ...d.data() } as JobLead)));
        });

        const checkinsQuery = query(collection(db, 'users', u.uid, 'checkins'), orderBy('timestamp', 'desc'));
        onSnapshot(checkinsQuery, (snap) => {
          setCheckins(snap.docs.map(d => ({ id: d.id, ...d.data() } as CheckIn)));
        });

        const benefitsQuery = query(collection(db, 'users', u.uid, 'benefits'), orderBy('name', 'asc'));
        onSnapshot(benefitsQuery, (snap) => {
          setBenefits(snap.docs.map(d => ({ id: d.id, ...d.data() } as Benefit)));
        });
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Connection Test
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('client is offline')) {
          console.error("Firebase connection error: Client is offline or config is invalid.");
        }
      }
    };
    testConnection();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    setError(null);
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Login failed", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError("The login window was closed. Please try again and complete the sign-in process.");
      } else if (err.code === 'auth/popup-blocked') {
        setError("The login window was blocked. Please allow popups for this site and try again.");
      } else {
        setError("An unexpected error occurred during login. Please try again.");
      }
    }
  };

  const handleLogout = () => signOut(auth);

  // Curfew Logic
  const curfewStatus = useMemo(() => {
    if (!profile?.curfewTime) return null;
    const now = new Date();
    const [hours, minutes] = profile.curfewTime.split(':').map(Number);
    let curfewDate = new Date();
    curfewDate.setHours(hours, minutes, 0, 0);
    
    // If curfew has passed today, it's for tomorrow
    if (isAfter(now, curfewDate)) {
      curfewDate = addDays(curfewDate, 1);
    }
    
    const diff = differenceInMinutes(curfewDate, now);
    return {
      time: profile.curfewTime,
      minutesLeft: diff,
      isUrgent: diff < 60 && diff > 0,
      isOver: diff <= 0
    };
  }, [profile?.curfewTime]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-indigo-900 flex flex-col items-center justify-center p-6 text-white text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-8 backdrop-blur-sm border border-white/20">
            <LayoutDashboard className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-4 tracking-tight">Second Start</h1>
          <p className="text-indigo-100 mb-10 text-lg leading-relaxed">
            Your personal reentry companion. Manage ID documents, appointments, and job leads in one safe place.
          </p>
          <Button 
            onClick={handleLogin} 
            size="lg" 
            className="w-full bg-white text-indigo-900 hover:bg-indigo-50 font-semibold py-4"
          >
            Get Started with Google
          </Button>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-100 text-sm flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-left leading-tight">{error}</p>
            </motion.div>
          )}

          <p className="mt-8 text-indigo-300 text-sm">
            Designed for successful reentry and long-term stability.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20 md:pb-0 md:pl-64">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 fixed inset-y-0 left-0 z-50">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">Second Start</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard />} label="Dashboard" />
          <NavButton active={activeTab === 'checklist'} onClick={() => setActiveTab('checklist')} icon={<CheckSquare />} label="Checklist" />
          <NavButton active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={<Calendar />} label="Calendar" />
          <NavButton active={activeTab === 'benefits'} onClick={() => setActiveTab('benefits')} icon={<ClipboardCheck />} label="Benefits" />
          <NavButton active={activeTab === 'jobs'} onClick={() => setActiveTab('jobs')} icon={<Briefcase />} label="Job Search" />
          <NavButton active={activeTab === 'career-ai'} onClick={() => setActiveTab('career-ai')} icon={<Sparkles />} label="Career AI" />
          <NavButton active={activeTab === 'resources'} onClick={() => setActiveTab('resources')} icon={<BookOpen />} label="Resources" />
          <NavButton active={activeTab === 'checkin'} onClick={() => setActiveTab('checkin')} icon={<ClipboardCheck />} label="Check-In" />
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-1">
          <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings />} label="Settings" />
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 z-50">
        <MobileNavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard />} label="Home" />
        <MobileNavButton active={activeTab === 'checklist'} onClick={() => setActiveTab('checklist')} icon={<CheckSquare />} label="Tasks" />
        <MobileNavButton active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={<Calendar />} label="Events" />
        <MobileNavButton active={activeTab === 'benefits'} onClick={() => setActiveTab('benefits')} icon={<ClipboardCheck />} label="Benefits" />
        <MobileNavButton active={activeTab === 'resources'} onClick={() => setActiveTab('resources')} icon={<BookOpen />} label="Help" />
        <MobileNavButton active={activeTab === 'checkin'} onClick={() => setActiveTab('checkin')} icon={<ClipboardCheck />} label="Log" />
      </nav>

      {/* Header */}
      <header className="bg-white border-b border-gray-200 p-4 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 capitalize">
            {activeTab.replace('-', ' ')}
          </h2>
          <div className="flex items-center gap-3">
            {curfewStatus && (
              <div className={cn(
                "hidden sm:flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium",
                curfewStatus.isUrgent ? "bg-red-100 text-red-700 animate-pulse" : "bg-indigo-100 text-indigo-700"
              )}>
                <Clock className="w-4 h-4" />
                <span>Curfew: {curfewStatus.time} ({curfewStatus.minutesLeft}m)</span>
              </div>
            )}
            <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center overflow-hidden">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-xs font-bold text-indigo-700">{user.displayName?.[0]}</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Curfew Alert (Mobile/Small) */}
              {curfewStatus && curfewStatus.isUrgent && (
                <div className="sm:hidden bg-red-600 text-white p-4 rounded-xl shadow-lg flex items-center gap-4">
                  <AlertCircle className="w-8 h-8 flex-shrink-0" />
                  <div>
                    <p className="font-bold">Curfew Approaching</p>
                    <p className="text-sm opacity-90">You have {curfewStatus.minutesLeft} minutes to reach home by {curfewStatus.time}.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Next Appointment */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-indigo-600" />
                      Next Appointment
                    </h3>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('calendar')}>View All</Button>
                  </div>
                  {appointments.length > 0 ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                        <p className="font-bold text-indigo-900">{appointments[0].title}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-indigo-700">
                          <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {format(parseISO(appointments[0].startTime), 'MMM d, h:mm a')}</span>
                          {appointments[0].location && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {appointments[0].location}</span>}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm py-4 text-center">No upcoming appointments.</p>
                  )}
                </Card>

                {/* Follow-up Reminders */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-orange-500" />
                      Follow-up Needed
                    </h3>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('jobs')}>Jobs</Button>
                  </div>
                  <div className="space-y-3">
                    {jobLeads.filter(l => l.status === 'applied' && !l.followUpDate).length > 0 ? (
                      jobLeads.filter(l => l.status === 'applied' && !l.followUpDate).slice(0, 2).map(lead => (
                        <div key={lead.id} className="p-3 bg-orange-50 rounded-lg border border-orange-100 flex justify-between items-center">
                          <div className="overflow-hidden">
                            <p className="font-bold text-orange-900 truncate">{lead.company}</p>
                            <p className="text-xs text-orange-700 truncate">{lead.position}</p>
                          </div>
                          <Button size="sm" variant="secondary" onClick={() => setActiveTab('jobs')}>Schedule</Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm py-4 text-center">All follow-ups scheduled!</p>
                    )}
                  </div>
                </Card>

                {/* Curfew & Routing */}
                <Card className="p-0 border-none shadow-none bg-transparent">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2 px-1">
                      <Clock className="w-5 h-5 text-indigo-600" />
                      Safe Path & Curfew
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <div className={cn(
                      "relative overflow-hidden rounded-2xl p-6 border transition-all",
                      curfewStatus?.isUrgent 
                        ? "bg-red-600 border-red-500 text-white shadow-lg shadow-red-200" 
                        : "bg-white border-gray-200 text-gray-900 shadow-sm"
                    )}>
                      {curfewStatus?.isUrgent && (
                        <motion.div 
                          animate={{ opacity: [0.1, 0.3, 0.1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute inset-0 bg-white"
                        />
                      )}
                      
                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <p className={cn("text-xs font-bold uppercase tracking-widest opacity-70", curfewStatus?.isUrgent ? "text-white" : "text-gray-500")}>
                              Curfew Status
                            </p>
                            <p className="text-3xl font-black mt-1">
                              {curfewStatus ? `${curfewStatus.minutesLeft}m` : '--'}
                            </p>
                          </div>
                          <div className={cn(
                            "p-2 rounded-xl",
                            curfewStatus?.isUrgent ? "bg-white/20" : "bg-indigo-50"
                          )}>
                            <Clock className={cn("w-6 h-6", curfewStatus?.isUrgent ? "text-white" : "text-indigo-600")} />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between text-sm font-medium">
                            <span>Progress to Curfew</span>
                            <span>{curfewStatus?.time || 'Not Set'}</span>
                          </div>
                          <div className={cn("w-full h-3 rounded-full overflow-hidden", curfewStatus?.isUrgent ? "bg-white/20" : "bg-gray-100")}>
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.max(0, Math.min(100, (curfewStatus?.minutesLeft || 0) / 14.4))}%` }}
                              className={cn("h-full", curfewStatus?.isUrgent ? "bg-white" : "bg-indigo-600")}
                            />
                          </div>
                        </div>

                        {profile?.homeLocation && (
                          <Button 
                            variant={curfewStatus?.isUrgent ? 'secondary' : 'primary'} 
                            className="w-full mt-6 gap-2 py-3 font-bold"
                            onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${profile.homeLocation?.lat},${profile.homeLocation?.lng}`, '_blank')}
                          >
                            <MapPin className="w-4 h-4" />
                            Start Safe Route Home
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Job Leads & Check-ins */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 md:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-indigo-600" />
                      Recent Job Leads
                    </h3>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('jobs')}>Job Search</Button>
                  </div>
                  <div className="space-y-3">
                    {jobLeads.slice(0, 3).map(lead => (
                      <div key={lead.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg border border-gray-100 transition-colors">
                        <div>
                          <p className="font-semibold text-gray-900">{lead.position}</p>
                          <p className="text-sm text-gray-500">{lead.company}</p>
                        </div>
                        <Badge variant={lead.status === 'hired' ? 'success' : lead.status === 'rejected' ? 'default' : 'info'}>
                          {lead.status}
                        </Badge>
                      </div>
                    ))}
                    {jobLeads.length === 0 && <p className="text-gray-500 text-sm py-4 text-center">No job leads yet.</p>}
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <ClipboardCheck className="w-5 h-5 text-indigo-600" />
                      Check-In
                    </h3>
                  </div>
                  <div className="text-center space-y-4">
                    <p className="text-sm text-gray-500">Last check-in: {checkins[0] ? format(parseISO(checkins[0].timestamp), 'MMM d') : 'Never'}</p>
                    <Button className="w-full" onClick={() => setActiveTab('checkin')}>
                      Log Progress
                    </Button>
                  </div>
                </Card>
              </div>
            </motion.div>
          )}

          {activeTab === 'checklist' && (
            <ChecklistTab checklist={checklist} userId={user.uid} />
          )}

          {activeTab === 'calendar' && (
            <CalendarTab appointments={appointments} userId={user.uid} />
          )}

          {activeTab === 'benefits' && (
            <BenefitsTab benefits={benefits} userId={user.uid} />
          )}

          {activeTab === 'jobs' && (
            <JobsTab jobLeads={jobLeads} userId={user.uid} />
          )}

          {activeTab === 'career-ai' && (
            <CareerAITab />
          )}

          {activeTab === 'resources' && (
            <ResourcesTab />
          )}

          {activeTab === 'checkin' && (
            <CheckinTab checkins={checkins} userId={user.uid} profile={profile} />
          )}

          {activeTab === 'settings' && (
            <SettingsTab profile={profile} userId={user.uid} />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- Sub-Tabs ---

function ChecklistTab({ checklist, userId }: { checklist: ChecklistItem[], userId: string }) {
  const [newItem, setNewItem] = useState('');
  const [category, setCategory] = useState<ChecklistItem['category']>('ID');

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    await addDoc(collection(db, 'users', userId, 'checklist'), {
      userId,
      title: newItem,
      status: 'pending',
      category,
      notes: ''
    });
    setNewItem('');
  };

  const toggleStatus = async (item: ChecklistItem) => {
    const nextStatus: ChecklistItem['status'] = item.status === 'pending' ? 'in-progress' : item.status === 'in-progress' ? 'completed' : 'pending';
    await updateDoc(doc(db, 'users', userId, 'checklist', item.id), { status: nextStatus });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <Card className="p-6">
        <form onSubmit={addItem} className="flex flex-col sm:flex-row gap-3">
          <input 
            type="text" 
            value={newItem} 
            onChange={e => setNewItem(e.target.value)}
            placeholder="Add document or task (e.g. Birth Certificate)"
            className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          />
          <select 
            value={category} 
            onChange={e => setCategory(e.target.value as any)}
            className="px-4 py-2 rounded-lg border border-gray-200 bg-white"
          >
            <option value="ID">ID Documents</option>
            <option value="Benefits">Benefits</option>
            <option value="Legal">Legal</option>
            <option value="Other">Other</option>
          </select>
          <Button type="submit"><Plus className="w-5 h-5 mr-1" /> Add</Button>
        </form>
      </Card>

      <div className="space-y-3">
        {checklist.map(item => (
          <Card key={item.id} className="p-4 flex items-center gap-4">
            <button 
              onClick={() => toggleStatus(item)}
              className={cn(
                "flex-shrink-0 transition-colors",
                item.status === 'completed' ? "text-green-600" : "text-gray-300 hover:text-indigo-400"
              )}
            >
              {item.status === 'completed' ? <CheckCircle2 className="w-8 h-8" /> : <Circle className="w-8 h-8" />}
            </button>
            <div className="flex-1">
              <p className={cn("font-semibold", item.status === 'completed' && "text-gray-400 line-through")}>
                {item.title}
              </p>
              <div className="flex gap-2 mt-1">
                <Badge variant={item.category === 'ID' ? 'info' : item.category === 'Benefits' ? 'success' : 'default'}>
                  {item.category}
                </Badge>
                <span className="text-xs text-gray-400 capitalize">{item.status.replace('-', ' ')}</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => deleteDoc(doc(db, 'users', userId, 'checklist', item.id))}>
              Delete
            </Button>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}

function CalendarTab({ appointments, userId }: { appointments: Appointment[], userId: string }) {
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({ title: '', startTime: '', location: '', type: 'PO' as Appointment['type'] });

  const addAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, 'users', userId, 'appointments'), {
      ...formData,
      userId,
      startTime: new Date(formData.startTime).toISOString()
    });
    setShowAdd(false);
    setFormData({ title: '', startTime: '', location: '', type: 'PO' });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-900">Your Schedule</h3>
        <Button onClick={() => setShowAdd(!showAdd)}><Plus className="w-5 h-5 mr-1" /> New Appointment</Button>
      </div>

      {showAdd && (
        <Card className="p-6">
          <form onSubmit={addAppointment} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input 
                required
                type="text" 
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})}
                className="w-full px-4 py-2 rounded-lg border border-gray-200"
                placeholder="e.g. Meeting with PO"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
              <input 
                required
                type="datetime-local" 
                value={formData.startTime} 
                onChange={e => setFormData({...formData, startTime: e.target.value})}
                className="w-full px-4 py-2 rounded-lg border border-gray-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select 
                value={formData.type} 
                onChange={e => setFormData({...formData, type: e.target.value as any})}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-white"
              >
                <option value="PO">Parole Officer</option>
                <option value="Job">Job Interview</option>
                <option value="Medical">Medical</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input 
                type="text" 
                value={formData.location} 
                onChange={e => setFormData({...formData, location: e.target.value})}
                className="w-full px-4 py-2 rounded-lg border border-gray-200"
                placeholder="Address or Online"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-3">
              <Button variant="secondary" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit">Save Appointment</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-4">
        {appointments.map(app => (
          <Card key={app.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-16 h-16 bg-indigo-50 rounded-xl flex flex-col items-center justify-center text-indigo-600 border border-indigo-100 flex-shrink-0">
              <span className="text-xs font-bold uppercase">{format(parseISO(app.startTime), 'MMM')}</span>
              <span className="text-xl font-bold">{format(parseISO(app.startTime), 'd')}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-bold text-gray-900">{app.title}</p>
                <Badge variant={app.type === 'PO' ? 'warning' : app.type === 'Job' ? 'success' : 'default'}>{app.type}</Badge>
              </div>
              <div className="flex flex-wrap gap-4 mt-1 text-sm text-gray-500">
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {format(parseISO(app.startTime), 'h:mm a')}</span>
                {app.location && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {app.location}</span>}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => deleteDoc(doc(db, 'users', userId, 'appointments', app.id))}>
              Remove
            </Button>
          </Card>
        ))}
        {appointments.length === 0 && <p className="text-center py-10 text-gray-500">No appointments scheduled.</p>}
      </div>
    </motion.div>
  );
}

function JobsTab({ jobLeads, userId }: { jobLeads: JobLead[], userId: string }) {
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({ company: '', position: '', status: 'new' as JobLead['status'], notes: '' });
  
  const [filterStatus, setFilterStatus] = useState<JobLead['status'] | 'all'>('all');
  const [sortBy, setSortBy] = useState<'company' | 'position'>('company');

  const addLead = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, 'users', userId, 'jobLeads'), { ...formData, userId });
    setShowAdd(false);
    setFormData({ company: '', position: '', status: 'new', notes: '' });
  };

  const updateStatus = async (id: string, status: JobLead['status']) => {
    await updateDoc(doc(db, 'users', userId, 'jobLeads', id), { status });
  };

  const setFollowUp = async (id: string, date: string) => {
    await updateDoc(doc(db, 'users', userId, 'jobLeads', id), { followUpDate: date });
  };

  const filteredAndSortedLeads = useMemo(() => {
    let result = [...jobLeads];
    
    if (filterStatus !== 'all') {
      result = result.filter(lead => lead.status === filterStatus);
    }
    
    result.sort((a, b) => {
      const valA = (a[sortBy] || '').toLowerCase();
      const valB = (b[sortBy] || '').toLowerCase();
      if (valA < valB) return -1;
      if (valA > valB) return 1;
      return 0;
    });
    
    return result;
  }, [jobLeads, filterStatus, sortBy]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-xl font-bold text-gray-900">Job Search Tracker</h3>
        <Button onClick={() => setShowAdd(!showAdd)}><Plus className="w-5 h-5 mr-1" /> Add Job Lead</Button>
      </div>

      <Card className="p-4 bg-gray-50 border-dashed">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">Filter:</label>
            <select 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value as any)}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="applied">Applied</option>
              <option value="interviewing">Interviewing</option>
              <option value="hired">Hired</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">Sort by:</label>
            <select 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value as any)}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white"
            >
              <option value="company">Company</option>
              <option value="position">Position</option>
            </select>
          </div>
          <div className="text-xs text-gray-500 ml-auto">
            Showing {filteredAndSortedLeads.length} leads
          </div>
        </div>
      </Card>

      {showAdd && (
        <Card className="p-6">
          <form onSubmit={addLead} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <input required type="text" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-200" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
              <input required type="text" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-200" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-200" rows={2} />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-3">
              <Button variant="secondary" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit">Save Lead</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAndSortedLeads.map(lead => (
          <Card key={lead.id} className="p-5">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-bold text-gray-900 text-lg">{lead.position}</h4>
                <p className="text-gray-600">{lead.company}</p>
              </div>
              <Badge variant={lead.status === 'hired' ? 'success' : 'info'}>{lead.status}</Badge>
            </div>
            {lead.notes && <p className="text-sm text-gray-500 mb-4 italic">"{lead.notes}"</p>}
            <div className="flex flex-wrap gap-2">
              <select 
                value={lead.status} 
                onChange={e => updateStatus(lead.id, e.target.value as any)}
                className="text-xs px-2 py-1 rounded border border-gray-200 bg-white"
              >
                <option value="new">New</option>
                <option value="applied">Applied</option>
                <option value="interviewing">Interviewing</option>
                <option value="hired">Hired</option>
                <option value="rejected">Rejected</option>
              </select>
              {lead.status === 'applied' && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Follow-up:</span>
                  <input 
                    type="date" 
                    value={lead.followUpDate || ''} 
                    onChange={e => setFollowUp(lead.id, e.target.value)}
                    className="text-xs px-2 py-1 rounded border border-gray-200 bg-white"
                  />
                </div>
              )}
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => deleteDoc(doc(db, 'users', userId, 'jobLeads', lead.id))}>Delete</Button>
            </div>
            {lead.followUpDate && isAfter(new Date(), parseISO(lead.followUpDate)) && lead.status === 'applied' && (
              <div className="mt-3 p-2 bg-red-50 border border-red-100 rounded text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Follow-up was scheduled for {format(parseISO(lead.followUpDate), 'MMM d')}. Time to reach out!
              </div>
            )}
          </Card>
        ))}
        {filteredAndSortedLeads.length === 0 && (
          <div className="md:col-span-2 text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500">No job leads found matching your criteria.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function BenefitsTab({ benefits, userId }: { benefits: Benefit[], userId: string }) {
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({ name: '', status: 'eligible' as Benefit['status'], renewalDate: '', notes: '' });

  const addBenefit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, 'users', userId, 'benefits'), { ...formData, userId });
    setShowAdd(false);
    setFormData({ name: '', status: 'eligible', renewalDate: '', notes: '' });
  };

  const updateStatus = async (id: string, status: Benefit['status']) => {
    await updateDoc(doc(db, 'users', userId, 'benefits', id), { status });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-900">Benefits Tracking</h3>
        <Button onClick={() => setShowAdd(!showAdd)}><Plus className="w-5 h-5 mr-1" /> Add Benefit</Button>
      </div>

      {showAdd && (
        <Card className="p-6">
          <form onSubmit={addBenefit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Benefit Name</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-200" placeholder="e.g. SNAP, Medicaid" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select 
                value={formData.status} 
                onChange={e => setFormData({...formData, status: e.target.value as any})}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-white"
              >
                <option value="eligible">Eligible</option>
                <option value="applied">Applied</option>
                <option value="active">Active</option>
                <option value="denied">Denied</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Renewal Date</label>
              <input type="date" value={formData.renewalDate} onChange={e => setFormData({...formData, renewalDate: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-200" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-200" rows={2} />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-3">
              <Button variant="secondary" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit">Save Benefit</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {benefits.map(benefit => (
          <Card key={benefit.id} className="p-5">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-bold text-gray-900 text-lg">{benefit.name}</h4>
                {benefit.renewalDate && (
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Calendar className="w-4 h-4" /> Renewal: {format(parseISO(benefit.renewalDate), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
              <Badge variant={benefit.status === 'active' ? 'success' : benefit.status === 'denied' ? 'warning' : 'info'}>
                {benefit.status}
              </Badge>
            </div>
            {benefit.notes && <p className="text-sm text-gray-500 mb-4 italic">"{benefit.notes}"</p>}
            <div className="flex flex-wrap gap-2">
              <select 
                value={benefit.status} 
                onChange={e => updateStatus(benefit.id, e.target.value as any)}
                className="text-xs px-2 py-1 rounded border border-gray-200 bg-white"
              >
                <option value="eligible">Eligible</option>
                <option value="applied">Applied</option>
                <option value="active">Active</option>
                <option value="denied">Denied</option>
                <option value="expired">Expired</option>
              </select>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => deleteDoc(doc(db, 'users', userId, 'benefits', benefit.id))}>Delete</Button>
            </div>
          </Card>
        ))}
        {benefits.length === 0 && (
          <div className="md:col-span-2 text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500">No benefits tracked yet.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ResourcesTab() {
  const [subTab, setSubTab] = useState<'finder' | 'chat' | 'guides'>('guides');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState('');
  const [groundingChunks, setGroundingChunks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const findResources = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSearchResult('');
    setGroundingChunks([]);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      // Get user location if possible
      let location = null;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      } catch (e) {
        console.warn("Location access denied, using general search");
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Find local resources for: ${searchQuery}. Provide names, descriptions, and addresses if available.`,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: location
            }
          }
        }
      });

      setSearchResult(response.text || 'No resources found.');
      setGroundingChunks(response.candidates?.[0]?.groundingMetadata?.groundingChunks || []);
    } catch (err) {
      console.error("Resource search failed", err);
      setSearchResult("Failed to search for resources. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: "You are a supportive reentry assistant for the 'Second Start' app. Your goal is to provide practical, encouraging advice for people returning from incarceration. Help them with questions about jobs, housing, legal aid, and mental health. Keep responses concise and actionable."
        }
      });

      // Reconstruct history
      // Note: In a real app, we'd use the chat object's history, but for simplicity here:
      const response = await chat.sendMessage({ message: userMsg });
      setChatMessages(prev => [...prev, { role: 'model', text: response.text || 'I am not sure how to answer that.' }]);
    } catch (err) {
      console.error("Chat failed", err);
      setChatMessages(prev => [...prev, { role: 'model', text: "Sorry, I'm having trouble connecting right now." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const guides = [
    {
      title: "Financial Literacy 101",
      desc: "Learn how to open a bank account, build credit, and manage your first paychecks.",
      icon: <DollarSign className="w-5 h-5 text-green-600" />,
      category: "Finance"
    },
    {
      title: "Legal Aid Resources",
      desc: "Finding pro-bono lawyers and understanding your rights regarding background checks.",
      icon: <Scale className="w-5 h-5 text-blue-600" />,
      category: "Legal"
    },
    {
      title: "Mental Health Support",
      desc: "Coping with the transition, finding support groups, and accessing therapy.",
      icon: <Heart className="w-5 h-5 text-red-600" />,
      category: "Health"
    },
    {
      title: "Digital Skills for Work",
      desc: "Mastering email, online applications, and basic office software.",
      icon: <Briefcase className="w-5 h-5 text-indigo-600" />,
      category: "Skills"
    }
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Sub-Tabs */}
      <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
        <button 
          onClick={() => setSubTab('guides')}
          className={cn("flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2", subTab === 'guides' ? "bg-indigo-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50")}
        >
          <BookOpen className="w-4 h-4" /> Guides
        </button>
        <button 
          onClick={() => setSubTab('finder')}
          className={cn("flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2", subTab === 'finder' ? "bg-indigo-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50")}
        >
          <MapIcon className="w-4 h-4" /> Resource Finder
        </button>
        <button 
          onClick={() => setSubTab('chat')}
          className={cn("flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2", subTab === 'chat' ? "bg-indigo-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50")}
        >
          <MessageSquare className="w-4 h-4" /> AI Assistant
        </button>
      </div>

      {subTab === 'guides' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {guides.map((guide, idx) => (
            <Card key={idx} className="p-5 hover:border-indigo-300 transition-colors cursor-pointer group">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-indigo-50 transition-colors">
                  {guide.icon}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{guide.category}</span>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition-colors" />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">{guide.title}</h4>
                  <p className="text-sm text-gray-500 leading-relaxed">{guide.desc}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {subTab === 'finder' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Find Local Help</h3>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && findResources()}
                  placeholder="e.g. Legal aid, food banks, clinics..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <Button onClick={findResources} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
              </Button>
            </div>
          </Card>

          {searchResult && (
            <Card className="p-6">
              <div className="prose prose-indigo max-w-none text-sm text-gray-700">
                <ReactMarkdown>{searchResult}</ReactMarkdown>
              </div>
              
              {groundingChunks.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h5 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Verified Locations</h5>
                  <div className="space-y-2">
                    {groundingChunks.map((chunk, idx) => chunk.maps && (
                      <a 
                        key={idx} 
                        href={chunk.maps.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-indigo-50 transition-colors text-sm font-medium text-indigo-600"
                      >
                        <span className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {chunk.maps.title}
                        </span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {subTab === 'chat' && (
        <Card className="flex flex-col h-[600px]">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Reentry Assistant
            </h3>
            <p className="text-xs text-gray-500">Ask me anything about your transition.</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.length === 0 && (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-6 h-6 text-indigo-600" />
                </div>
                <p className="text-sm text-gray-500 max-w-[200px] mx-auto">
                  Hello! I'm here to help you navigate your reentry journey. How can I assist you today?
                </p>
              </div>
            )}
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[80%] p-3 rounded-2xl text-sm",
                  msg.role === 'user' ? "bg-indigo-600 text-white rounded-tr-none" : "bg-gray-100 text-gray-800 rounded-tl-none"
                )}>
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 p-3 rounded-2xl rounded-tl-none">
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-100">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <Button onClick={sendChatMessage} disabled={chatLoading || !chatInput.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </motion.div>
  );
}

function CareerAITab() {
  const [prompt, setPrompt] = useState('');
  const [industry, setIndustry] = useState('Construction');
  const [type, setType] = useState<'resume' | 'cover-letter'>('resume');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateAid = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResult('');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const model = "gemini-3-flash-preview";
      
      const systemInstruction = `You are a career coach specializing in helping people with reentry after incarceration. 
      Your goal is to help them write professional, honest, and compelling content for their ${type}. 
      Focus on transferable skills, reliability, and a positive future outlook. 
      Tailor the language to the ${industry} industry. 
      Keep the tone professional yet encouraging. 
      Do not mention incarceration unless specifically asked to help explain a gap in a positive way.`;

      const userPrompt = type === 'resume' 
        ? `Help me write a professional job description for my resume. I worked as a ${prompt} in the ${industry} industry. Focus on my responsibilities and achievements.`
        : `Help me write a short, professional cover letter for a ${prompt} position in the ${industry} industry. Here are some details about my background: ${prompt}`;

      const response = await ai.models.generateContent({
        model,
        contents: userPrompt,
        config: { systemInstruction }
      });

      setResult(response.text || 'No response from AI.');
    } catch (err) {
      console.error("AI Generation failed", err);
      setResult("Sorry, I couldn't generate that right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Sparkles className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">AI Career Assistant</h3>
            <p className="text-sm text-gray-500">Get help with your resume and cover letters.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
              <select 
                value={industry} 
                onChange={e => setIndustry(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-white"
              >
                <option value="Construction">Construction</option>
                <option value="Hospitality">Hospitality / Food Service</option>
                <option value="Logistics">Logistics / Warehouse</option>
                <option value="Manufacturing">Manufacturing</option>
                <option value="Retail">Retail</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">What do you need?</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setType('resume')}
                  className={cn(
                    "flex-1 py-2 rounded-lg border text-sm font-medium transition-all",
                    type === 'resume' ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                  )}
                >
                  Resume Help
                </button>
                <button
                  onClick={() => setType('cover-letter')}
                  className={cn(
                    "flex-1 py-2 rounded-lg border text-sm font-medium transition-all",
                    type === 'cover-letter' ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                  )}
                >
                  Cover Letter
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {type === 'resume' ? 'Job Title or Skills' : 'Tell me about your experience'}
            </label>
            <textarea 
              value={prompt} 
              onChange={e => setPrompt(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" 
              rows={3}
              placeholder={type === 'resume' ? "e.g. Forklift Operator, Customer Service" : "e.g. I have 2 years of experience in landscaping and I am very reliable..."}
            />
          </div>

          <Button 
            onClick={generateAid} 
            disabled={loading || !prompt.trim()} 
            className="w-full py-3 gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {loading ? 'Generating...' : `Generate ${type === 'resume' ? 'Description' : 'Letter'}`}
          </Button>
        </div>
      </Card>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <Card className="p-6 bg-white border-indigo-100 shadow-md relative group">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  AI Suggestion
                </h4>
                <button 
                  onClick={copyToClipboard}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 flex items-center gap-1 text-xs"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="prose prose-indigo max-w-none text-gray-700 text-sm leading-relaxed">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-2 text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                <Sparkles className="w-3 h-3" />
                Powered by Gemini AI
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CheckinTab({ checkins, userId, profile }: { checkins: CheckIn[], userId: string, profile: UserProfile | null }) {
  const [mood, setMood] = useState('Good');
  const [challenges, setChallenges] = useState('');
  const [successes, setSuccesses] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'users', userId, 'checkins'), {
        userId,
        timestamp: new Date().toISOString(),
        mood,
        challenges,
        successes
      });
      setMood('Good');
      setChallenges('');
      setSuccesses('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const shareCheckin = (log: CheckIn, target: 'sponsor' | 'caseworker') => {
    const email = target === 'sponsor' ? profile?.sponsorEmail : profile?.caseworkerEmail;
    if (!email) {
      alert(`Please set your ${target} email in Settings first.`);
      return;
    }

    const subject = `Reentry Progress Update - ${format(parseISO(log.timestamp), 'MMM d')}`;
    const body = `Hello,\n\nHere is my check-in for ${format(parseISO(log.timestamp), 'MMMM d, yyyy')}:\n\nMood: ${log.mood}\nSuccesses: ${log.successes || 'None reported'}\nChallenges: ${log.challenges || 'None reported'}\n\nSent via Second Start App.`;
    
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <Card className="p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Daily Progress Log</h3>
        <form onSubmit={submitCheckin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">How are you feeling today?</label>
            <div className="flex flex-wrap gap-2">
              {['Great', 'Good', 'Okay', 'Struggling'].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood(m)}
                  className={cn(
                    "flex-1 min-w-[80px] py-2 rounded-lg border transition-all text-sm font-medium",
                    mood === m ? "bg-indigo-600 text-white border-indigo-600 shadow-md" : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">What went well today?</label>
            <textarea 
              value={successes} 
              onChange={e => setSuccesses(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" 
              rows={2}
              placeholder="e.g. Made it to my appointment on time"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Any challenges or needs?</label>
            <textarea 
              value={challenges} 
              onChange={e => setChallenges(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" 
              rows={2}
              placeholder="e.g. Need help with transport for tomorrow"
            />
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full py-3 text-lg font-bold">
            {isSubmitting ? 'Saving...' : 'Submit Check-In'}
          </Button>
        </form>
      </Card>

      <div className="space-y-4">
        <h4 className="font-bold text-gray-900 flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-indigo-600" />
          Previous Logs
        </h4>
        {checkins.map(log => (
          <Card key={log.id} className="p-5">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-bold text-indigo-600">{format(parseISO(log.timestamp), 'MMMM d, yyyy')}</span>
              <Badge variant={log.mood === 'Great' ? 'success' : log.mood === 'Struggling' ? 'warning' : 'default'}>
                {log.mood}
              </Badge>
            </div>
            <div className="space-y-2 mb-4">
              {log.successes && (
                <div className="p-2 bg-green-50 rounded border border-green-100 text-sm text-green-800">
                  <span className="font-bold">Success:</span> {log.successes}
                </div>
              )}
              {log.challenges && (
                <div className="p-2 bg-red-50 rounded border border-red-100 text-sm text-red-800">
                  <span className="font-bold">Challenge:</span> {log.challenges}
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs flex-1 gap-1"
                onClick={() => shareCheckin(log, 'sponsor')}
              >
                Send to Sponsor
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs flex-1 gap-1"
                onClick={() => shareCheckin(log, 'caseworker')}
              >
                Send to Caseworker
              </Button>
            </div>
          </Card>
        ))}
        {checkins.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500">No logs yet. Start your first check-in above.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function SettingsTab({ profile, userId }: { profile: UserProfile | null, userId: string }) {
  const [curfew, setCurfew] = useState(profile?.curfewTime || '');
  const [sponsor, setSponsor] = useState(profile?.sponsorEmail || '');
  const [caseworker, setCaseworker] = useState(profile?.caseworkerEmail || '');
  const [saving, setSaving] = useState(false);

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await updateDoc(doc(db, 'users', userId), {
      curfewTime: curfew,
      sponsorEmail: sponsor,
      caseworkerEmail: caseworker
    });
    setSaving(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <Card className="p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Account Settings</h3>
        <form onSubmit={saveSettings} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Curfew Time</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="time" 
                  value={curfew} 
                  onChange={e => setCurfew(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">We'll alert you 60 minutes before this time.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
              <input 
                disabled
                type="text" 
                value={profile?.displayName || ''} 
                className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sponsor Email</label>
              <input 
                type="email" 
                value={sponsor} 
                onChange={e => setSponsor(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200"
                placeholder="sponsor@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Caseworker Email</label>
              <input 
                type="email" 
                value={caseworker} 
                onChange={e => setCaseworker(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200"
                placeholder="caseworker@example.com"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Home Location</label>
              <div className="flex items-center gap-3">
                <div className="flex-1 p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-600">
                  {profile?.homeLocation ? `Saved: ${profile.homeLocation.lat.toFixed(4)}, ${profile.homeLocation.lng.toFixed(4)}` : 'No home location set'}
                </div>
                <Button 
                  type="button" 
                  variant="secondary"
                  onClick={() => {
                    navigator.geolocation.getCurrentPosition((pos) => {
                      updateDoc(doc(db, 'users', userId), {
                        homeLocation: { lat: pos.coords.latitude, lng: pos.coords.longitude }
                      });
                    });
                  }}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Set Current as Home
                </Button>
              </div>
              <p className="mt-1 text-xs text-gray-500">Used for curfew-safe routing directions.</p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6 border-red-100 bg-red-50">
        <h4 className="text-red-900 font-bold mb-2">Danger Zone</h4>
        <p className="text-red-700 text-sm mb-4">Once you sign out, you'll need to log back in to access your data.</p>
        <Button variant="danger" onClick={() => signOut(auth)}>Sign Out of Second Start</Button>
      </Card>
    </motion.div>
  );
}

// --- Helper Components ---

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all",
        active 
          ? "bg-indigo-50 text-indigo-700 font-semibold" 
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      )}
    >
      <span className={cn("w-5 h-5", active ? "text-indigo-600" : "text-gray-400")}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function MobileNavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 p-2 flex-1 transition-all",
        active ? "text-indigo-600" : "text-gray-400"
      )}
    >
      <span className="w-6 h-6">{icon}</span>
      <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
    </button>
  );
}
