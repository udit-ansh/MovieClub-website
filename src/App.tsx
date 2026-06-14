import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Film, Sparkles, MapPin, Users, Clapperboard 
} from 'lucide-react';

import { Screening, PastMovie, Recommendation, User, UserReview } from './types';
import { initialScreenings, initialPastMovies, initialRecommendations } from './initialData';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';

import Navbar from './components/Navbar';
import ScreeningSchedule from './components/ScreeningSchedule';
import PastScreenings from './components/PastScreenings';
import Recommendations from './components/Recommendations';
import TriviaGame from './components/TriviaGame';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('schedule');
  const [adminMode, setAdminMode] = useState<boolean>(false);

  // Core schedules, past screenings, recommendations pools with initial local fallback
  const [screenings, setScreenings] = useState<Screening[]>(initialScreenings);
  const [pastMovies, setPastMovies] = useState<PastMovie[]>(initialPastMovies);
  const [recommendations, setRecommendations] = useState<Recommendation[]>(initialRecommendations);

  // Load session auth from local storage on bootstrap
  useEffect(() => {
    const savedUser = localStorage.getItem('iiser_movie_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser) as User;
      setCurrentUser(parsed);
      if (parsed.role === 'admin') {
        setAdminMode(true);
      }
    }
  }, []);

  // Sync / screen datasets in real-time with Firestore onsnapshot
  // 1. Subscribe to Screenings
  useEffect(() => {
    const screeningsCol = collection(db, 'screenings');
    const unsubscribe = onSnapshot(screeningsCol, (snapshot) => {
      if (snapshot.empty) {
        console.log('[Firebase] Screenings collection is empty. Attempting seed...');
        setScreenings(initialScreenings);
        initialScreenings.forEach(async (s) => {
          try {
            await setDoc(doc(db, 'screenings', s.id), s);
          } catch (e) {
            console.warn(`[Firebase] Seeding screening ${s.id} failed:`, e);
          }
        });
      } else {
        const list: Screening[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as Screening);
        });
        // Sort by date/time order
        list.sort((a, b) => {
          const dateTimeA = `${a.date}T${a.time}`;
          const dateTimeB = `${b.date}T${b.time}`;
          return dateTimeA.localeCompare(dateTimeB);
        });
        setScreenings(list);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'screenings');
    });

    return () => unsubscribe();
  }, []);

  // 2. Subscribe to Past Movies
  useEffect(() => {
    const pastCol = collection(db, 'pastMovies');
    const unsubscribe = onSnapshot(pastCol, (snapshot) => {
      if (snapshot.empty) {
        console.log('[Firebase] Past movies collection is empty. Attempting seed...');
        setPastMovies(initialPastMovies);
        initialPastMovies.forEach(async (m) => {
          try {
            await setDoc(doc(db, 'pastMovies', m.id), m);
          } catch (e) {
            console.warn(`[Firebase] Seeding past movie ${m.id} failed:`, e);
          }
        });
      } else {
        const list: PastMovie[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as PastMovie);
        });
        // Sort past movies descending by screening date
        list.sort((a, b) => b.screenedDate.localeCompare(a.screenedDate));
        setPastMovies(list);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'pastMovies');
    });

    return () => unsubscribe();
  }, []);

  // 3. Subscribe to Recommendations
  useEffect(() => {
    const recsCol = collection(db, 'recommendations');
    const unsubscribe = onSnapshot(recsCol, (snapshot) => {
      if (snapshot.empty) {
        console.log('[Firebase] Recommendations collection is empty. Attempting seed...');
        setRecommendations(initialRecommendations);
        initialRecommendations.forEach(async (r) => {
          try {
            await setDoc(doc(db, 'recommendations', r.id), r);
          } catch (e) {
            console.warn(`[Firebase] Seeding recommendation ${r.id} failed:`, e);
          }
        });
      } else {
        const list: Recommendation[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as Recommendation);
        });
        // Sort by proposed date descending
        list.sort((a, b) => b.suggestedAt.localeCompare(a.suggestedAt));
        setRecommendations(list);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'recommendations');
    });

    return () => unsubscribe();
  }, []);

  // Listen to real Firebase auth status changes and auto-login if authenticated
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const email = firebaseUser.email ? firebaseUser.email.toLowerCase() : '';
        const extMatch = email.endsWith('@iiserkol.ac.in');
        const isDevUser = email === 'uditansh2507@gmail.com' || email === 'uditansh2007@gmail.com';

        if (extMatch || isDevUser) {
          const name = firebaseUser.displayName || 'IISER-K Member';
          let role: 'admin' | 'student' = 'student';
          if (
            email === 'movie.activity@iiserkol.ac.in' || 
            email === 'uditansh2007@gmail.com' || 
            email === 'uditansh2507@gmail.com' || 
            email.startsWith('admin.')
          ) {
            role = 'admin';
          }
          const userObj: User = { email, name, role };
          setCurrentUser(userObj);
          localStorage.setItem('iiser_movie_user', JSON.stringify(userObj));
          if (role === 'admin') {
            setAdminMode(true);
          }
        }
      }
    });

    return () => unsubscribe();
  }, []);

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

  // Admin Actions for Schedule (Real-time synced updates to database)
  const handleAddScreening = async (data: Omit<Screening, 'id'>) => {
    const id = `s-${Date.now()}`;
    const newEntry: Screening = {
      ...data,
      id
    };
    try {
      await setDoc(doc(db, 'screenings', id), newEntry);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `screenings/${id}`);
    }
  };

  const handleUpdateScreening = async (updatedItem: Screening) => {
    try {
      await setDoc(doc(db, 'screenings', updatedItem.id), updatedItem);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `screenings/${updatedItem.id}`);
    }
  };

  const handleDeleteScreening = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'screenings', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `screenings/${id}`);
    }
  };

  // Past Screenings Student Reviews Action
  const handleAddReview = async (movieId: string, reviewData: Omit<UserReview, 'id' | 'createdAt'>) => {
    const newReview: UserReview = {
      ...reviewData,
      id: `r-${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    const targetMovie = pastMovies.find(m => m.id === movieId);
    if (!targetMovie) return;

    try {
      const updatedReviews = [newReview, ...targetMovie.reviews];
      await updateDoc(doc(db, 'pastMovies', movieId), {
        reviews: updatedReviews
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `pastMovies/${movieId}`);
    }
  };

  // Student Recommendation Submission Action
  const handleAddRecommendation = async (recData: Omit<Recommendation, 'id' | 'suggestedBy' | 'suggestedByName' | 'suggestedAt' | 'votes'>) => {
    if (!currentUser) return;
    
    const id = `rec-${Date.now()}`;
    const newRec: Recommendation = {
      ...recData,
      id,
      suggestedBy: currentUser.email,
      suggestedByName: currentUser.name,
      suggestedAt: new Date().toISOString(),
      votes: [currentUser.email] // core authors auto-upvote their entries
    };

    try {
      await setDoc(doc(db, 'recommendations', id), newRec);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `recommendations/${id}`);
    }
  };

  const handleVoteRecommendation = async (id: string, userEmail: string) => {
    const rec = recommendations.find(r => r.id === id);
    if (!rec) return;

    const hasVoted = rec.votes.includes(userEmail);
    const newVotes = hasVoted 
      ? rec.votes.filter(email => email !== userEmail) // revoke upvote
      : [...rec.votes, userEmail]; // add upvote

    try {
      await updateDoc(doc(db, 'recommendations', id), {
        votes: newVotes
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `recommendations/${id}`);
    }
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
              We look beyond blockbuster boundaries to discover avant-garde scripts, acoustic masterpieces, and historic movements. Cinephilia brings the best index of international world cinema directly to the M.N. Saha Auditorium, Ground Floor, TRC building.
            </p>

            {/* Quick stats board */}
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-4 text-xs font-mono text-zinc-500">
              <div className="flex items-center space-x-2">
                <Clapperboard className="h-4.5 w-4.5 text-amber-500/70" />
                <span>Screened: <b className="text-zinc-300">142+ Films</b></span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="h-4.5 w-4.5 text-amber-500/70" />
                <span>Patrons: <b className="text-zinc-300">2000+ Students</b></span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4.5 w-4.5 text-amber-500/70" />
                <span>Regular Base: <b className="text-zinc-300">M.N. Saha Auditorium, Ground Floor, TRC building</b></span>
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
            <span className="text-zinc-600">M.N. Saha Auditorium, Ground Floor, TRC building, Mohanpur, West Bengal 741246</span>
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
