import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User, Screening, PastMovie, Recommendation, ClubDiscussion } from '../types';
import { 
  Users, Search, Shield, GraduationCap, Clock, Award, 
  MessageSquare, Star, Film, Trash2, Heart, HelpCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PeopleSectionProps {
  currentUser: User | null;
  adminMode: boolean;
  screenings: Screening[];
  pastMovies: PastMovie[];
  recommendations: Recommendation[];
  discussions: ClubDiscussion[];
}

export default function PeopleSection({
  currentUser,
  adminMode,
  screenings,
  pastMovies,
  recommendations,
  discussions
}: PeopleSectionProps) {
  const [members, setMembers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'student'>('all');
  const [loading, setLoading] = useState(true);

  // Subscribe to the real-time 'users' collection in Firestore
  useEffect(() => {
    const usersCol = collection(db, 'users');
    const unsubscribe = onSnapshot(usersCol, (snapshot) => {
      const list: User[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as User);
      });
      // Sort members: primary admins first, then by last active timestamp descending
      list.sort((a, b) => {
        if (a.role !== b.role) {
          return a.role === 'admin' ? -1 : 1;
        }
        const activeA = a.lastActive || '';
        const activeB = b.lastActive || '';
        return activeB.localeCompare(activeA);
      });
      setMembers(list);
      setLoading(false);
    }, (err) => {
      console.warn('[Firebase] Members list onSnapshot error:', err);
      // Fallback list featuring basic self and some mock contributors if offline
      setMembers(currentUser ? [currentUser] : []);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Handle admin action to delete a user profile record from the list
  const handleDeleteMember = async (targetUid: string, email: string) => {
    if (!window.confirm(`Are you sure you want to remove ${email}'s profile registration?`)) return;
    try {
      await deleteDoc(doc(db, 'users', targetUid));
    } catch (e) {
      console.error('Failed to remote user record:', e);
    }
  };

  // Compute contribution metrics
  const getUserStats = (email: string) => {
    const recsCount = recommendations.filter(r => r.suggestedBy === email).length;
    const discussionsCount = discussions.filter(d => d.authorEmail === email).length;
    // Count reviews submitted
    let reviewsCount = 0;
    pastMovies.forEach(m => {
      reviewsCount += m.reviews?.filter(r => r.userEmail === email).length || 0;
    });

    const totalVotesOnRecs = recommendations
      .filter(r => r.suggestedBy === email)
      .reduce((sum, r) => sum + (r.votes?.length || 0), 0);

    const totalPoints = (recsCount * 10) + (discussionsCount * 15) + (reviewsCount * 12) + (totalVotesOnRecs * 2);

    return {
      recs: recsCount,
      discussions: discussionsCount,
      reviews: reviewsCount,
      points: totalPoints
    };
  };

  // Friendly relative time formatter
  const getRelativeActiveTime = (isoString?: string) => {
    if (!isoString) return 'Inactive';
    const now = new Date();
    const past = new Date(isoString);
    const diffMs = now.getTime() - past.getTime();
    
    // Safety check for NTP clock drift
    if (diffMs < 0) return 'Online';

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Online';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  // Filter members list based on user search query
  const filteredMembers = members.filter(m => {
    const matchesSearch = 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = filterRole === 'all' || m.role === filterRole;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-8 animate-fadeIn" id="members-list-container">
      {/* Visual Header Grid Panel */}
      <div className="relative border border-zinc-900 rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900/60 p-6 sm:p-8">
        <div className="absolute top-0 right-0 h-48 w-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-500 font-mono text-xs rounded-full border border-amber-500/20">
              <Users className="h-3.5 w-3.5" />
              <span>IISER KOLKATA CINEMA COMMUNITY</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-100">
              Club Luminaries & Members
            </h1>
            <p className="text-sm text-zinc-400 max-w-xl">
              Meet the directors, reviews, critics, and cinephiles driving discussions and scheduling the finest screenings at IISER Kolkata. 
            </p>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-805 rounded-xl p-4 flex gap-4 items-center shrink-0">
            <Award className="h-8 w-8 text-amber-500" />
            <div className="text-left font-mono">
              <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Active Roll Call</div>
              <div className="text-xl font-bold text-zinc-100">{members.length} members</div>
              <div className="text-[9px] text-zinc-400">synced via active logins</div>
            </div>
          </div>
        </div>
      </div>

      {/* Control panel: Filtering & Search Input */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch justify-between">
        <div className="relative flex-grow max-w-md">
          <span className="absolute left-3.5 top-3.5 text-zinc-500">
            <Search className="h-4.5 w-4.5" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search members by name or email ID..."
            className="w-full rounded-xl border border-zinc-850 bg-zinc-950 py-3 pl-11 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none transition-all shadow-inner"
          />
        </div>

        <div className="flex bg-zinc-950 p-1 border border-zinc-850 rounded-xl max-w-xs self-start sm:self-center">
          <button
            onClick={() => setFilterRole('all')}
            className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-colors cursor-pointer ${
              filterRole === 'all' 
                ? 'bg-zinc-900 text-amber-400 font-bold' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterRole('admin')}
            className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-colors cursor-pointer ${
              filterRole === 'admin' 
                ? 'bg-zinc-900 text-amber-400 font-bold' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Coordinators
          </button>
          <button
            onClick={() => setFilterRole('student')}
            className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-colors cursor-pointer ${
              filterRole === 'student' 
                ? 'bg-zinc-900 text-amber-400 font-bold' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Students
          </button>
        </div>
      </div>

      {/* Grid listing of community members */}
      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500 mx-auto"></div>
          <p className="text-sm font-mono text-zinc-500 mt-4 leading-normal">Retrieving community roll call...</p>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="border border-zinc-900 rounded-2xl bg-zinc-950 p-16 text-center">
          <Users className="h-10 w-10 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-zinc-300 font-serif font-bold text-lg">No members found</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto leading-normal">
            We couldn't find any movie club members matching "{searchQuery}". Try refining your typing criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredMembers.map((member) => {
              const stats = getUserStats(member.email);
              const isCurrentUser = currentUser?.email === member.email;
              const formattedActive = getRelativeActiveTime(member.lastActive);
              const isActiveNow = formattedActive === 'Online';
              
              return (
                <motion.div
                  key={member.email}
                  id={`member-card-${member.email.replace(/[@.]/g, '-')}`}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="rounded-2xl border border-zinc-900 bg-zinc-950/85 p-5 relative overflow-hidden flex flex-col justify-between hover:border-zinc-800 transition-all hover:shadow-xl group"
                >
                  {/* Decorative badge background indicating online state */}
                  {isActiveNow && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 via-amber-505 to-emerald-500"></div>
                  )}

                  {/* Top line with picture, name & permissions */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {member.photoURL ? (
                        <div className="relative shrink-0">
                          <img 
                            src={member.photoURL} 
                            className="w-12 h-12 object-cover rounded-full border border-zinc-800 shadow bg-zinc-900" 
                            alt={member.name}
                            referrerPolicy="no-referrer"
                          />
                          {isActiveNow && (
                            <span className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-emerald-500 border-2 border-zinc-950 rounded-full"></span>
                          )}
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full border border-zinc-805 bg-zinc-900 shrink-0 flex items-center justify-center text-zinc-400 font-serif font-bold text-lg relative uppercase shadow">
                          {member.name.charAt(0)}
                          {isActiveNow && (
                            <span className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-emerald-500 border-2 border-zinc-950 rounded-full"></span>
                          )}
                        </div>
                      )}

                      <div className="min-w-0 text-left">
                        <div className="flex items-center gap-1.5">
                          <span className="font-serif font-bold text-zinc-100 group-hover:text-amber-400 transition-colors truncate text-sm">
                            {member.name}
                          </span>
                          {isCurrentUser && (
                            <span className="text-[9px] px-1 bg-zinc-800 text-zinc-400 font-mono rounded">You</span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-zinc-500 truncate mt-0.5">{member.email}</div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {member.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full border border-amber-500/20 uppercase tracking-wider">
                          <Shield className="h-2 w-2" />
                          <span>COORDINATOR</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[9px] font-mono font-semibold bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded-full border border-zinc-800 uppercase tracking-wider">
                          <GraduationCap className="h-2 w-2" />
                          <span>MEMBER</span>
                        </span>
                      )}

                      <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono">
                        <Clock className="h-3 w-3 inline shrink-0" />
                        <span className={isActiveNow ? 'text-emerald-450 font-bold' : ''}>{formattedActive}</span>
                      </div>
                    </div>
                  </div>

                  {/* Mid block showing Contribution point counter */}
                  <div className="mt-5 bg-zinc-900/40 border border-zinc-900 p-3 rounded-xl flex items-center justify-between">
                    <div className="text-left font-mono">
                      <div className="text-[9px] text-zinc-500 uppercase tracking-wider">Cinematic Score</div>
                      <div className="text-lg font-extrabold text-amber-400">
                        {stats.points} <span className="text-[10px] text-zinc-500 font-normal">pts</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-x-4 divide-x divide-zinc-850 text-center text-xs font-mono text-zinc-400">
                      <div className="px-1 flex flex-col items-center">
                        <Film className="h-3.5 w-3.5 text-zinc-550 mb-0.5" />
                        <span className="font-bold text-zinc-205">{stats.recs}</span>
                        <span className="text-[8px] text-zinc-500 uppercase">Recs</span>
                      </div>
                      <div className="pl-4 flex flex-col items-center">
                        <MessageSquare className="h-3.5 w-3.5 text-zinc-550 mb-0.5" />
                        <span className="font-bold text-zinc-205">{stats.discussions}</span>
                        <span className="text-[8px] text-zinc-500 uppercase">Posts</span>
                      </div>
                      <div className="pl-4 flex flex-col items-center">
                        <Star className="h-3.5 w-3.5 text-zinc-550 mb-0.5" />
                        <span className="font-bold text-zinc-205">{stats.reviews}</span>
                        <span className="text-[8px] text-zinc-500 uppercase">Revs</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  {adminMode && !isCurrentUser && member.uid && (
                    <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-zinc-900">
                      <button
                        onClick={() => handleDeleteMember(member.uid!, member.email)}
                        className="text-[10px] font-mono text-zinc-550 hover:text-red-400 py-1 px-2 rounded hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all flex items-center gap-1 cursor-pointer"
                        title="Remove member listing"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Delete Ledger</span>
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
