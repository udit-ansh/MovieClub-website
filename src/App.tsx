import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Film, Sparkles, MapPin, Users, Clapperboard 
} from 'lucide-react';

import { Screening, PastMovie, Recommendation, User, UserReview } from './types';
import { initialScreenings, initialPastMovies, initialRecommendations } from './initialData';

import Navbar from './components/Navbar';
import ScreeningSchedule from './components/ScreeningSchedule';
import PastScreenings from './components/PastScreenings';
import Recommendations from './components/Recommendations';
import TriviaGame from './components/TriviaGame';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('schedule');
  const [adminMode, setAdminMode] = useState<boolean>(false);

  // Core schedules, past screenings, recommendations pools
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [pastMovies, setPastMovies] = useState<PastMovie[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  // Load state from local storage on bootstrap
  useEffect(() => {
    // 1. Session Auth
    const savedUser = localStorage.getItem('iiser_movie_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser) as User;
      setCurrentUser(parsed);
      if (parsed.role === 'admin') {
        setAdminMode(true);
      }
    }

    // 2. Upcoming Schedule pool
    const savedScreenings = localStorage.getItem('iiser_movie_screenings');
    if (savedScreenings) {
      setScreenings(JSON.parse(savedScreenings));
    } else {
      setScreenings(initialScreenings);
      localStorage.setItem('iiser_movie_screenings', JSON.stringify(initialScreenings));
    }

    // 3. Past List pool
    const savedPast = localStorage.getItem('iiser_movie_past');
    if (savedPast) {
      setPastMovies(JSON.parse(savedPast));
    } else {
      setPastMovies(initialPastMovies);
      localStorage.setItem('iiser_movie_past', JSON.stringify(initialPastMovies));
    }

    // 4. Recommendations Pool
    const savedRecs = localStorage.getItem('iiser_movie_recs');
    if (savedRecs) {
      setRecommendations(JSON.parse(savedRecs));
    } else {
      setRecommendations(initialRecommendations);
      localStorage.setItem('iiser_movie_recs', JSON.stringify(initialRecommendations));
    }
  }, []);

  // Sync methods
  const saveScreenings = (newScreenings: Screening[]) => {
    setScreenings(newScreenings);
    localStorage.setItem('iiser_movie_screenings', JSON.stringify(newScreenings));
  };

  const savePastMovies = (newPast: PastMovie[]) => {
    setPastMovies(newPast);
    localStorage.setItem('iiser_movie_past', JSON.stringify(newPast));
  };

  const saveRecs = (newRecs: Recommendation[]) => {
    setRecommendations(newRecs);
    localStorage.setItem('iiser_movie_recs', JSON.stringify(newRecs));
  };

  // Auth Callbacks
  const handleLogin = (email: string, name: string, role: 'admin' | 'student') => {
    const userObj: User = { email, name, role };
    setCurrentUser(userObj);
    localStorage.setItem('iiser_movie_user', JSON.stringify(userObj));
    if (role === 'admin') {
      setAdminMode(true);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('iiser_movie_user');
    setAdminMode(false);
  };

  // Admin Actions for Schedule
  const handleAddScreening = (data: Omit<Screening, 'id'>) => {
    const newEntry: Screening = {
      ...data,
      id: `s-${Date.now()}`
    };
    const updated = [newEntry, ...screenings];
    saveScreenings(updated);
  };

  const handleUpdateScreening = (updatedItem: Screening) => {
    const updated = screenings.map(s => s.id === updatedItem.id ? updatedItem : s);
    saveScreenings(updated);
  };

  const handleDeleteScreening = (id: string) => {
    const updated = screenings.filter(s => s.id !== id);
    saveScreenings(updated);
  };

  // Past Screenings Student Reviews Action
  const handleAddReview = (movieId: string, reviewData: Omit<UserReview, 'id' | 'createdAt'>) => {
    const newReview: UserReview = {
      ...reviewData,
      id: `r-${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    const updated = pastMovies.map(movie => {
      if (movie.id === movieId) {
        return {
          ...movie,
          reviews: [newReview, ...movie.reviews]
        };
      }
      return movie;
    });

    savePastMovies(updated);
  };

  // Student Recommendation Submission Action
  const handleAddRecommendation = (recData: Omit<Recommendation, 'id' | 'suggestedBy' | 'suggestedByName' | 'suggestedAt' | 'votes'>) => {
    if (!currentUser) return;
    
    const newRec: Recommendation = {
      ...recData,
      id: `rec-${Date.now()}`,
      suggestedBy: currentUser.email,
      suggestedByName: currentUser.name,
      suggestedAt: new Date().toISOString(),
      votes: [currentUser.email] // core authors auto-upvote their entries
    };

    const updated = [newRec, ...recommendations];
    saveRecs(updated);
  };

  const handleVoteRecommendation = (id: string, userEmail: string) => {
    const updated = recommendations.map(rec => {
      if (rec.id === id) {
        const hasVoted = rec.votes.includes(userEmail);
        const newVotes = hasVoted 
          ? rec.votes.filter(email => email !== userEmail) // revoke upvote
          : [...rec.votes, userEmail]; // add upvote

        return {
          ...rec,
          votes: newVotes
        };
      }
      return rec;
    });

    saveRecs(updated);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-amber-400 selection:text-zinc-950">
      {/* Upper Navigation Row */}
      <Navbar
        currentUser={currentUser}
        onLogin={handleLogin}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        adminMode={adminMode}
        setAdminMode={setAdminMode}
      />

      {/* Main Feature Cinematic Hero Segment */}
      <div className="relative border-b border-zinc-900 bg-zinc-950 py-16 sm:py-24 overflow-hidden">
        {/* Decorative backdrop gradients representing theatrical lighting effects */}
        <div className="absolute top-0 left-1/4 h-72 w-96 bg-amber-500/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 h-72 w-96 bg-zinc-800/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center space-x-1.5 bg-zinc-900/80 border border-zinc-800 px-3 py-1 rounded-full text-xs font-mono text-amber-500 mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping"></span>
              <span>IISER KOLKATA • CINEMATIC ARTS SOCIETY</span>
            </div>

            <h2 className="font-serif text-4xl sm:text-6xl font-extrabold text-zinc-100 tracking-tight leading-[1.1] animate-glow">
              Explore the Language of Cinema.
            </h2>
            
            <p className="mt-4 text-sm sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
              We look beyond blockbuster boundaries to discover avant-garde scripts, acoustic masterpieces, and historic movements. Cinephilia brings the best index of international world cinema directly to the LHC G-06 auditorium.
            </p>

            {/* Quick stats board */}
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-4 text-xs font-mono text-zinc-500">
              <div className="flex items-center space-x-2">
                <Clapperboard className="h-4.5 w-4.5 text-amber-500/70" />
                <span>Screened: <b className="text-zinc-300">142+ Films</b></span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="h-4.5 w-4.5 text-amber-500/70" />
                <span>Patrons: <b className="text-zinc-300">450+ IISER Students</b></span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4.5 w-4.5 text-amber-500/70" />
                <span>Regular Base: <b className="text-zinc-300">LHC G-06 Auditorium</b></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main tab panel layout */}
      <main className="flex-grow mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {activeTab === 'schedule' && (
              <ScreeningSchedule
                screenings={screenings}
                adminMode={adminMode}
                onAddScreening={handleAddScreening}
                onUpdateScreening={handleUpdateScreening}
                onDeleteScreening={handleDeleteScreening}
                currentUserEmail={currentUser?.email}
              />
            )}

            {activeTab === 'past' && (
              <PastScreenings
                pastMovies={pastMovies}
                onAddReview={handleAddReview}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'recommendations' && (
              <Recommendations
                recommendations={recommendations}
                currentUser={currentUser}
                onAddRecommendation={handleAddRecommendation}
                onVoteRecommendation={handleVoteRecommendation}
              />
            )}

            {activeTab === 'trivia' && (
              <TriviaGame />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Primary Footer Section adhering to strict branding limits */}
      <footer className="border-t border-zinc-900 bg-zinc-980 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left space-y-1">
            <h3 className="font-serif text-sm font-semibold tracking-wide text-zinc-300">
              CINEPHILIA
            </h3>
            <p className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
              The Film Studies Society • IISER Kolkata
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-mono text-zinc-500">
            <a href="https://letterboxd.com" target="_blank" rel="noreferrer" className="hover:text-amber-400 transition-colors">Letterboxd Diary</a>
            <span className="text-zinc-800">•</span>
            <a href="https://iiserkol.ac.in" target="_blank" rel="noreferrer" className="hover:text-amber-400 transition-colors">IISER Kolkata Main</a>
            <span className="text-zinc-800">•</span>
            <span className="text-zinc-600">LHC G-06, Mohanpur, West Bengal 741246</span>
          </div>

          <div className="text-center md:text-right">
            <p className="text-[10px] text-zinc-600">
              © 2026 Cinephilia Club. Created for cinema lovers of Indian Institute of Science Education and Research, Kolkata.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
