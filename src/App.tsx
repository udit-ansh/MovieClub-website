import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Film, Sparkles, MapPin, Users, Clapperboard 
} from 'lucide-react';

import { Screening, PastMovie, Recommendation, User, UserReview, ClubDiscussion, Poll } from './types';
import { initialScreenings, initialPastMovies, initialRecommendations, initialDiscussions } from './initialData';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  writeBatch
} from 'firebase/firestore';

import Navbar from './components/Navbar';
import ScreeningSchedule from './components/ScreeningSchedule';
import PastScreenings from './components/PastScreenings';
import Recommendations from './components/Recommendations';
import ClubDiscussions from './components/ClubDiscussions';
import UserProfile from './components/UserProfile';
import PollsSection from './components/PollsSection';
import { letterboxdMovies } from './letterboxdDb';

// Prevents reactive re-seeding triggers when an admin empties the database collections manually
let screeningsSeedAttempted = false;
let pastMoviesSeedAttempted = false;
let recommendationsSeedAttempted = false;
let discussionsSeedAttempted = false;

const sanitizeDoc = <T extends object>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

const isScreeningFullyPast = (dateStr: string, timeStr: string): boolean => {
  try {
    const [yr, mo, dy] = dateStr.split('-').map(Number);
    const [hr, mn] = (timeStr || '18:30').split(':').map(Number);
    if (isNaN(yr) || isNaN(mo) || isNaN(dy)) return false;
    // Create local timezone date for the screening start
    const screeningDateTime = new Date(yr, mo - 1, dy, hr, mn, 0);
    // Screening is fully past 3 hours after start
    const archiveThreshold = screeningDateTime.getTime() + (3 * 60 * 60 * 1000);
    return Date.now() > archiveThreshold;
  } catch {
    return false;
  }
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('schedule');
  const [focusedDiscussionId, setFocusedDiscussionId] = useState<string | null>(null);
  const [adminMode, setAdminMode] = useState<boolean>(false);

  // Core schedules, past screenings, recommendations pools with initial local fallback
  const [screenings, setScreenings] = useState<Screening[]>(initialScreenings);
  const [pastMovies, setPastMovies] = useState<PastMovie[]>(initialPastMovies);
  const [recommendations, setRecommendations] = useState<Recommendation[]>(initialRecommendations);
  const [discussions, setDiscussions] = useState<ClubDiscussion[]>(initialDiscussions);
  const [polls, setPolls] = useState<Poll[]>([]);

  // Filter active/upcoming screenings vs past movies client-side
  const upcomingScreenings = screenings.filter(s => !isScreeningFullyPast(s.date, s.time));

  // Merge any past screenings into pastMovies client-side
  const computedPastMovies = [...pastMovies];
  screenings.forEach(s => {
    if (isScreeningFullyPast(s.date, s.time)) {
      const alreadyExists = pastMovies.some(
        pm => pm.title.toLowerCase() === s.title.toLowerCase() || pm.id === `pm-${s.id}`
      );
      if (!alreadyExists) {
        computedPastMovies.push({
          id: `pm-${s.id}`,
          title: s.title,
          director: s.director || 'Unknown',
          year: s.year || 2026,
          screenedDate: s.date,
          rating: 4.5,
          letterboxdUrl: `https://letterboxd.com/film/${s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/`,
          posterUrl: s.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=300',
          synopsis: s.description || '',
          genre: s.genre || ['Cinema'],
          reviews: []
        });
      }
    }
  });

  // Sort past movies descending by screening date
  computedPastMovies.sort((a, b) => b.screenedDate.localeCompare(a.screenedDate));

  // Automatic database auto-archive for past screenings when an administrative user is logged in
  useEffect(() => {
    if (!adminMode || screenings.length === 0) return;

    const archiveJob = async () => {
      for (const s of screenings) {
        if (isScreeningFullyPast(s.date, s.time)) {
          console.log(`[Auto-Archive] Archive threshold met for "${s.title}". Triggering migration...`);
          const pastId = `pm-${s.id}`;
          const newPastMovie: PastMovie = {
            id: pastId,
            title: s.title,
            director: s.director || 'Unknown',
            year: s.year || 2026,
            screenedDate: s.date,
            rating: 4.5,
            letterboxdUrl: `https://letterboxd.com/film/${s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/`,
            posterUrl: s.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=300',
            synopsis: s.description || '',
            genre: s.genre || ['Cinema'],
            reviews: []
          };

          try {
            await setDoc(doc(db, 'pastMovies', pastId), sanitizeDoc(newPastMovie));
            await deleteDoc(doc(db, 'screenings', s.id));
            console.log(`[Auto-Archive] Successfully moved "${s.title}" to database pastMovies.`);
          } catch (err) {
            console.warn(`[Auto-Archive] Failed to write past movie / delete screening:`, err);
          }
        }
      }
    };

    archiveJob();
  }, [screenings, adminMode]);

  // Load session auth from local storage on bootstrap
  useEffect(() => {
    const savedUser = localStorage.getItem('iiser_movie_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser) as User;
      setCurrentUser(parsed);
      if (parsed.role === 'admin') {
        setAdminMode(true);
      }
      // Guarantee a real Firebase Auth session is active
      if (!auth.currentUser) {
        signInAnonymously(auth).catch(err => {
          console.warn("[Firebase] Anonymous session auto-init failed:", err);
        });
      }
    }
  }, []);

  // Sync / screen datasets in real-time with Firestore onsnapshot
  // 1. Subscribe to Screenings
  useEffect(() => {
    const screeningsCol = collection(db, 'screenings');
    const unsubscribe = onSnapshot(screeningsCol, async (snapshot) => {
      if (snapshot.empty) {
        if (!screeningsSeedAttempted) {
          screeningsSeedAttempted = true;
          console.log('[Firebase] Screenings database is newly provisioned. Performing atomic batch seed...');
          setScreenings(initialScreenings);
          try {
            const batch = writeBatch(db);
            initialScreenings.forEach((s) => {
              batch.set(doc(db, 'screenings', s.id), s);
            });
            await batch.commit();
            console.log('[Firebase] Screenings successfully seeded atomically.');
          } catch (e) {
            console.warn('[Firebase] Atomic seeding of screenings failed:', e);
          }
        } else {
          // If the admin purposely deleted all screenings, just render an empty list instead of re-importing defaults!
          console.log('[Firebase] Screenings collection manually emptied by administrator.');
          setScreenings([]);
        }
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
      const errInfo = {
        error: error instanceof Error ? error.message : String(error),
        authInfo: {
          userId: auth.currentUser?.uid,
          email: auth.currentUser?.email,
          emailVerified: auth.currentUser?.emailVerified,
          isAnonymous: auth.currentUser?.isAnonymous,
          tenantId: auth.currentUser?.tenantId,
          providerInfo: auth.currentUser?.providerData?.map(provider => ({
            providerId: provider.providerId,
            email: provider.email,
          })) || []
        },
        operationType: OperationType.LIST,
        path: 'screenings'
      };
      console.error('Firestore Error: ', JSON.stringify(errInfo));
      console.warn('[Firebase] screenings onSnapshot error (handled gracefully):', error);
    });

    return () => unsubscribe();
  }, []);

  // 2. Subscribe to Past Movies
  useEffect(() => {
    const pastCol = collection(db, 'pastMovies');
    const unsubscribe = onSnapshot(pastCol, async (snapshot) => {
      if (snapshot.empty) {
        if (!pastMoviesSeedAttempted) {
          pastMoviesSeedAttempted = true;
          console.log('[Firebase] Past movies database is newly provisioned. Performing atomic batch seed...');
          setPastMovies(initialPastMovies);
          try {
            const batch = writeBatch(db);
            initialPastMovies.forEach((m) => {
              batch.set(doc(db, 'pastMovies', m.id), m);
            });
            await batch.commit();
            console.log('[Firebase] Past movies successfully seeded atomically.');
          } catch (e) {
            console.warn('[Firebase] Atomic seeding of past movies failed:', e);
          }
        } else {
          console.log('[Firebase] Past Movies collection manually emptied.');
          setPastMovies([]);
        }
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
      const errInfo = {
        error: error instanceof Error ? error.message : String(error),
        authInfo: {
          userId: auth.currentUser?.uid,
          email: auth.currentUser?.email,
          emailVerified: auth.currentUser?.emailVerified,
          isAnonymous: auth.currentUser?.isAnonymous,
          tenantId: auth.currentUser?.tenantId,
          providerInfo: auth.currentUser?.providerData?.map(provider => ({
            providerId: provider.providerId,
            email: provider.email,
          })) || []
        },
        operationType: OperationType.LIST,
        path: 'pastMovies'
      };
      console.error('Firestore Error: ', JSON.stringify(errInfo));
      console.warn('[Firebase] pastMovies onSnapshot error (handled gracefully):', error);
    });

    return () => unsubscribe();
  }, []);

  // 3. Subscribe to Recommendations
  useEffect(() => {
    const recsCol = collection(db, 'recommendations');
    const unsubscribe = onSnapshot(recsCol, async (snapshot) => {
      if (snapshot.empty) {
        if (!recommendationsSeedAttempted) {
          recommendationsSeedAttempted = true;
          console.log('[Firebase] Recommendations database is newly provisioned. Performing atomic batch seed...');
          setRecommendations(initialRecommendations);
          try {
            const batch = writeBatch(db);
            initialRecommendations.forEach((r) => {
              batch.set(doc(db, 'recommendations', r.id), r);
            });
            await batch.commit();
            console.log('[Firebase] Recommendations successfully seeded atomically.');
          } catch (e) {
            console.warn('[Firebase] Atomic seeding of recommendations failed:', e);
          }
        } else {
          console.log('[Firebase] Recommendations collection manually emptied.');
          setRecommendations([]);
        }
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
      const errInfo = {
        error: error instanceof Error ? error.message : String(error),
        authInfo: {
          userId: auth.currentUser?.uid,
          email: auth.currentUser?.email,
          emailVerified: auth.currentUser?.emailVerified,
          isAnonymous: auth.currentUser?.isAnonymous,
          tenantId: auth.currentUser?.tenantId,
          providerInfo: auth.currentUser?.providerData?.map(provider => ({
            providerId: provider.providerId,
            email: provider.email,
          })) || []
        },
        operationType: OperationType.LIST,
        path: 'recommendations'
      };
      console.error('Firestore Error: ', JSON.stringify(errInfo));
      console.warn('[Firebase] recommendations onSnapshot error (handled gracefully):', error);
    });

    return () => unsubscribe();
  }, []);

  // 4. Subscribe to Discussions & Reviews
  useEffect(() => {
    const discussionsCol = collection(db, 'discussions');
    const unsubscribe = onSnapshot(discussionsCol, async (snapshot) => {
      if (snapshot.empty) {
        if (!discussionsSeedAttempted) {
          discussionsSeedAttempted = true;
          console.log('[Firebase] Discussions database is newly provisioned. Setting up initial entries...');
          setDiscussions(initialDiscussions);
          try {
            const batch = writeBatch(db);
            initialDiscussions.forEach((d) => {
              batch.set(doc(db, 'discussions', d.id), d);
            });
            await batch.commit();
            console.log('[Firebase] Discussions successfully seeded atomically.');
          } catch (e) {
            console.warn('[Firebase] Atomic seeding of discussions failed:', e);
          }
        } else {
          console.log('[Firebase] Discussions collection manually emptied.');
          setDiscussions([]);
        }
      } else {
        const list: ClubDiscussion[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as ClubDiscussion);
        });
        // Sort by createdAt descending
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setDiscussions(list);
      }
    }, (error) => {
      console.warn('[Firebase] Discussions onSnapshot error (handled gracefully):', error);
    });

    return () => unsubscribe();
  }, []);

  // 5. Subscribe to Selection Polls
  useEffect(() => {
    const pollsCol = collection(db, 'polls');
    const unsubscribe = onSnapshot(pollsCol, (snapshot) => {
      const list: Poll[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Poll);
      });
      // Sort by createdAt descending
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setPolls(list);
    }, (error) => {
      console.warn('[Firebase] Polls onSnapshot error (handled gracefully):', error);
    });

    return () => unsubscribe();
  }, []);

  // Helper to sync local user state with Firestore 'users' directory
  const syncUserToFirestore = async (userObj: User) => {
    const activeUid = userObj.uid || auth.currentUser?.uid;
    if (!userObj.email || !activeUid) return;
    try {
      await setDoc(doc(db, 'users', activeUid), {
        uid: activeUid,
        email: userObj.email,
        name: userObj.name,
        role: userObj.role,
        photoURL: userObj.photoURL || '',
        lastActive: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn('[Firebase] Failed to write user registration to Firestore:', e);
    }
  };

  // Listen to real Firebase auth status changes and auto-login if authenticated
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const email = firebaseUser.email ? firebaseUser.email.toLowerCase() : '';
        const extMatch = email.endsWith('@iiserkol.ac.in');
        const isDevUser = email === 'uditansh2507@gmail.com' || email === 'uditansh2007@gmail.com';

        if (extMatch || isDevUser) {
          const name = firebaseUser.displayName || 'IISER-K Member';
          const photoURL = firebaseUser.photoURL || undefined;
          let role: 'admin' | 'student' = 'student';
          if (
            email === 'movie.activity@iiserkol.ac.in' || 
            email === 'uditansh2007@gmail.com' || 
            email === 'uditansh2507@gmail.com' || 
            email.startsWith('admin.')
          ) {
            role = 'admin';
          }
          const userObj: User = { uid: firebaseUser.uid, email, name, role, photoURL, lastActive: new Date().toISOString() };
          setCurrentUser(userObj);
          localStorage.setItem('iiser_movie_user', JSON.stringify(userObj));
          if (role === 'admin') {
            setAdminMode(true);
          }
          // Sync to database
          syncUserToFirestore(userObj);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Auth Callbacks
  const handleLogin = (email: string, name: string, role: 'admin' | 'student', photoURL?: string) => {
    const userObj: User = { uid: auth.currentUser?.uid, email, name, role, photoURL, lastActive: new Date().toISOString() };
    setCurrentUser(userObj);
    localStorage.setItem('iiser_movie_user', JSON.stringify(userObj));
    if (role === 'admin') {
      setAdminMode(true);
    }
    syncUserToFirestore(userObj);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('iiser_movie_user');
    setAdminMode(false);
  };

  const handleUpdateProfile = (updatedFields: Partial<User>) => {
    if (!currentUser) return;
    const userObj: User = {
      ...currentUser,
      ...updatedFields,
      lastActive: new Date().toISOString()
    };
    setCurrentUser(userObj);
    localStorage.setItem('iiser_movie_user', JSON.stringify(userObj));
    syncUserToFirestore(userObj);
  };

  // Admin Actions for Schedule (Real-time synced updates to database)
  const handleAddScreening = async (data: Omit<Screening, 'id'>) => {
    const id = `s-${Date.now()}`;
    const newEntry: Screening = {
      ...data,
      id
    };
    try {
      await setDoc(doc(db, 'screenings', id), sanitizeDoc(newEntry));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `screenings/${id}`);
    }
  };

  const handleUpdateScreening = async (updatedItem: Screening) => {
    try {
      await setDoc(doc(db, 'screenings', updatedItem.id), sanitizeDoc(updatedItem));
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
      await updateDoc(doc(db, 'pastMovies', movieId), sanitizeDoc({
        reviews: updatedReviews
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `pastMovies/${movieId}`);
    }
  };

  const handleUpdateReview = async (movieId: string, reviewId: string, updatedComment: string, updatedRating: number) => {
    const targetMovie = pastMovies.find(m => m.id === movieId);
    if (!targetMovie) return;

    try {
      const updatedReviews = targetMovie.reviews.map(r => {
        if (r.id === reviewId) {
          return {
            ...r,
            comment: updatedComment.trim(),
            rating: updatedRating,
            createdAt: new Date().toISOString()
          };
        }
        return r;
      });

      await updateDoc(doc(db, 'pastMovies', movieId), sanitizeDoc({
        reviews: updatedReviews
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `pastMovies/${movieId}`);
    }
  };

  const handleDeleteReview = async (movieId: string, reviewId: string) => {
    const targetMovie = pastMovies.find(m => m.id === movieId);
    if (!targetMovie) return;

    try {
      const updatedReviews = targetMovie.reviews.filter(r => r.id !== reviewId);
      await updateDoc(doc(db, 'pastMovies', movieId), sanitizeDoc({
        reviews: updatedReviews
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `pastMovies/${movieId}`);
    }
  };

  // Student Recommendation Submission Action
  const handleAddRecommendation = async (recData: Omit<Recommendation, 'id' | 'suggestedBy' | 'suggestedByName' | 'suggestedAt' | 'votes'>): Promise<'added' | 'voted' | 'already_voted'> => {
    if (!currentUser) return 'added';
    
    const cleanTitle = recData.title.trim().toLowerCase();
    const existing = recommendations.find(r => r.title.trim().toLowerCase() === cleanTitle);

    if (existing) {
      if (!existing.votes.includes(currentUser.email)) {
        try {
          const updatedVotes = [...existing.votes, currentUser.email];
          await updateDoc(doc(db, 'recommendations', existing.id), {
            votes: updatedVotes
          });
          return 'voted';
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `recommendations/${existing.id}`);
          return 'voted';
        }
      } else {
        return 'already_voted';
      }
    }
    
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
      await setDoc(doc(db, 'recommendations', id), sanitizeDoc(newRec));
      return 'added';
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `recommendations/${id}`);
      return 'added';
    }
  };

  const handleUpdateRecommendation = async (id: string, updatedFields: Partial<Recommendation>) => {
    try {
      await updateDoc(doc(db, 'recommendations', id), sanitizeDoc(updatedFields));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `recommendations/${id}`);
    }
  };

  const handleMarkScreened = async (rec: Recommendation, date: string, rating: number) => {
    const pastId = `pm-${Date.now()}`;
    const genreArray = rec.genre
      ? rec.genre.split(',').map((g: string) => g.trim()).filter(Boolean)
      : ['Cinema'];

    const newPastMovie: PastMovie = {
      id: pastId,
      title: rec.title,
      director: rec.director,
      year: rec.year,
      screenedDate: date || new Date().toISOString().split('T')[0],
      rating: rating || 4.5,
      letterboxdUrl: `https://letterboxd.com/film/${rec.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/`,
      posterUrl: rec.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=300',
      synopsis: rec.notes || '',
      genre: genreArray,
      reviews: []
    };

    try {
      // 1. Add to pastMovies collection
      await setDoc(doc(db, 'pastMovies', pastId), sanitizeDoc(newPastMovie));
      // 2. Delete from recommendations collection
      await deleteDoc(doc(db, 'recommendations', rec.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `pastMovies/${pastId}`);
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

  const handleAddDiscussion = async (data: Omit<ClubDiscussion, 'id' | 'createdAt' | 'authorEmail' | 'authorName' | 'votes' | 'comments'>) => {
    if (!currentUser) return;
    const id = `disc-${Date.now()}`;
    const newEntry: ClubDiscussion = {
      ...data,
      id,
      authorEmail: currentUser.email,
      authorName: currentUser.name,
      createdAt: new Date().toISOString(),
      votes: [currentUser.email],
      comments: []
    };
    try {
      await setDoc(doc(db, 'discussions', id), sanitizeDoc(newEntry));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `discussions/${id}`);
    }
  };

  const handleAddComment = async (discussionId: string, content: string) => {
    if (!currentUser) return;
    const target = discussions.find(d => d.id === discussionId);
    if (!target) return;

    const newComment = {
      id: `comm-${Date.now()}`,
      authorEmail: currentUser.email,
      authorName: currentUser.name,
      content,
      createdAt: new Date().toISOString()
    };

    try {
      const updatedComments = [...target.comments, newComment];
      await updateDoc(doc(db, 'discussions', discussionId), {
        comments: updatedComments
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `discussions/${discussionId}`);
    }
  };

  const handleVoteDiscussion = async (discussionId: string) => {
    if (!currentUser) return;
    const target = discussions.find(d => d.id === discussionId);
    if (!target) return;

    const hasVoted = target.votes.includes(currentUser.email);
    const newVotes = hasVoted
      ? target.votes.filter(email => email !== currentUser.email)
      : [...target.votes, currentUser.email];

    try {
      await updateDoc(doc(db, 'discussions', discussionId), {
        votes: newVotes
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `discussions/${discussionId}`);
    }
  };

  const handleDeleteDiscussion = async (discussionId: string) => {
    try {
      await deleteDoc(doc(db, 'discussions', discussionId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `discussions/${discussionId}`);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-amber-400 selection:text-zinc-950">
      {/* Upper Navigation Row */}
      <Navbar
        currentUser={currentUser}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onUpdateProfile={handleUpdateProfile}
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
              <span>MOVIE CLUB • IISER KOLKATA</span>
            </div>

            <h2 className="font-serif text-4xl sm:text-6xl font-extrabold text-zinc-100 tracking-tight leading-[1.1] animate-glow">
              Explore the Language of Cinema.
            </h2>
            
            <p className="mt-4 text-sm sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
              We look beyond blockbuster boundaries to discover avant-garde scripts, acoustic masterpieces, and historic movements. The Movie Club brings the best index of international world cinema directly to the M.N. Saha Auditorium, Ground Floor, TRC building.
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
                screenings={upcomingScreenings}
                adminMode={adminMode}
                onAddScreening={handleAddScreening}
                onUpdateScreening={handleUpdateScreening}
                onDeleteScreening={handleDeleteScreening}
                currentUserEmail={currentUser?.email}
              />
            )}

            {activeTab === 'past' && (
              <PastScreenings
                pastMovies={computedPastMovies}
                onAddReview={handleAddReview}
                currentUser={currentUser}
                onUpdateReview={handleUpdateReview}
                onDeleteReview={handleDeleteReview}
              />
            )}

            {activeTab === 'discussions' && (
              <ClubDiscussions
                discussions={discussions}
                onAddDiscussion={handleAddDiscussion}
                onAddComment={handleAddComment}
                onVoteDiscussion={handleVoteDiscussion}
                onDeleteDiscussion={handleDeleteDiscussion}
                currentUser={currentUser}
                adminMode={adminMode}
                focusedDiscussionId={focusedDiscussionId}
                onSelectDiscussion={setFocusedDiscussionId}
              />
            )}

            {activeTab === 'recommendations' && (
              <Recommendations
                recommendations={recommendations}
                currentUser={currentUser}
                adminMode={adminMode}
                onAddRecommendation={handleAddRecommendation}
                onVoteRecommendation={handleVoteRecommendation}
                onUpdateRecommendation={handleUpdateRecommendation}
                onMarkScreened={handleMarkScreened}
              />
            )}

            {activeTab === 'polls' && (
              <PollsSection
                polls={polls}
                currentUser={currentUser}
                adminMode={adminMode}
              />
            )}

            {activeTab === 'profile' && (
              <UserProfile
                currentUser={currentUser}
                pastMovies={computedPastMovies}
                discussions={discussions}
                recommendations={recommendations}
                polls={polls}
                setActiveTab={setActiveTab}
                setFocusedDiscussionId={setFocusedDiscussionId}
                onUpdateReview={handleUpdateReview}
                onDeleteReview={handleDeleteReview}
              />
            )}


          </motion.div>
        </AnimatePresence>
      </main>

      {/* Primary Footer Section adhering to strict branding limits */}
      <footer className="border-t border-zinc-900 bg-zinc-980 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left space-y-1">
            <h3 className="font-serif text-sm font-semibold tracking-wide text-zinc-300 uppercase">
              Movie Club IISER Kolkata
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
              © 2026 Movie Club IISER Kolkata. Created for cinema lovers of Indian Institute of Science Education and Research, Kolkata.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
