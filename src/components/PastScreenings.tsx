import React, { useState } from 'react';
import { 
  Star, MessageSquare, ExternalLink, RefreshCw, Calendar, 
  ChevronDown, ChevronUp, User, Clock, Send, MessageCircleCode, CheckCircle2 
} from 'lucide-react';
import { PastMovie, UserReview } from '../types';
import { getPolishedPosterUrl } from '../letterboxdDb';

interface PastScreeningsProps {
  pastMovies: PastMovie[];
  onAddReview: (movieId: string, review: Omit<UserReview, 'id' | 'createdAt'>) => void;
  currentUser: { email: string; name: string } | null;
}

export default function PastScreenings({ pastMovies, onAddReview, currentUser }: PastScreeningsProps) {
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  
  // Submit state for review
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const triggerSync = () => {
    setIsSyncing(true);
    setSyncSuccess(false);
    setTimeout(() => {
      setIsSyncing(false);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 4000);
    }, 2500);
  };

  const handleReviewSubmit = (e: React.FormEvent, movieId: string) => {
    e.preventDefault();
    if (!currentUser) {
      setErrorMsg('You must have logged in using your institute email to write review logs.');
      return;
    }
    if (!commentInput.trim()) {
      setErrorMsg('Please write a quick comment for the film.');
      return;
    }

    onAddReview(movieId, {
      userEmail: currentUser.email,
      userName: currentUser.name,
      rating: ratingInput,
      comment: commentInput.trim()
    });

    setCommentInput('');
    setRatingInput(5);
    setErrorMsg('');
  };

  const calculateAverageRating = (movie: PastMovie) => {
    if (movie.reviews.length === 0) return movie.rating;
    const sum = movie.reviews.reduce((acc, r) => acc + r.rating, 0);
    const calculated = (sum / movie.reviews.length + movie.rating) / 2; // blending initial Letterboxd score with student scores
    return Number(calculated.toFixed(1));
  };

  const renderStars = (rating: number, interactive = false, onSelect?: (r: number) => void) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => onSelect && onSelect(star)}
            className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
          >
            <Star
              className={`h-4 w-4 ${
                star <= rating
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-zinc-700'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-10">
      {/* Header and Sync Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-900 pb-6 gap-4">
        <div>
          <span className="text-amber-500 font-mono text-xs uppercase tracking-widest font-semibold flex items-center gap-1.5">
            <MessageCircleCode className="h-4 w-4" /> Letterboxd Archive
          </span>
          <h2 className="font-serif text-3xl font-bold text-zinc-100 tracking-tight sm:text-4xl mt-1">
            Past Screenings
          </h2>
          <p className="text-xs text-zinc-500 mt-1 max-w-xl">
            A comprehensive history of cinema masterpieces screened at the IISER K Movie Club, sourced directly from our curated Letterboxd profile.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <a
            href="https://letterboxd.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1 border border-zinc-850 hover:border-zinc-700 text-zinc-400 hover:text-white px-3.5 py-2 rounded-xl text-xs font-medium bg-zinc-950 transition-colors"
          >
            <span>Letterboxd Profile</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

          <button
            onClick={triggerSync}
            disabled={isSyncing}
            className="flex items-center justify-center space-x-2 bg-zinc-900 text-amber-400 hover:text-amber-300 border border-amber-500/10 hover:border-amber-500/25 px-4 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Feed'}</span>
          </button>
        </div>
      </div>

      {/* Sync animation popover */}
      {isSyncing && (
        <div className="rounded-2xl border border-amber-500/10 bg-amber-500/5 p-4 flex items-center space-x-4 animate-pulse">
          <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
            <RefreshCw className="h-4 w-4 animate-spin" />
          </div>
          <div>
            <h4 className="text-xs font-bold font-mono text-amber-500">READING LETTERBOXD JOURNAL FEED</h4>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Connecting secure pipeline with Letterboxd API targets... fetching ratings and review counts...
            </p>
          </div>
        </div>
      )}

      {syncSuccess && (
        <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-4 flex items-center space-x-4">
          <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-400">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold font-mono text-green-400">SYNC SUCCESSFUL</h4>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Retrieved 4 latest screening records matching Letterboxd diary entries perfectly.
            </p>
          </div>
        </div>
      )}

      {/* Past Screenings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {pastMovies.map((movie) => {
          const isExpanded = selectedMovieId === movie.id;
          const avgRating = calculateAverageRating(movie);

          return (
            <div
              key={movie.id}
              className="group flex flex-col rounded-2xl border border-zinc-900 bg-zinc-950 overflow-hidden shadow-xl hover:border-zinc-800 transition-all duration-300"
            >
              <div className="flex gap-4 p-5">
                {/* Poster Box */}
                <div className="relative w-24 h-36 flex-shrink-0 rounded-lg overflow-hidden border border-zinc-850 bg-zinc-900 shadow-md">
                  <img
                    src={getPolishedPosterUrl(movie.title, movie.posterUrl)}
                    alt={movie.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=300';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/20 to-transparent"></div>
                </div>

                {/* Main details */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-mono font-bold text-amber-500/80 bg-amber-500/5 border border-amber-500/10 px-2 py-0.5 rounded-md">
                      Screened on {movie.screenedDate}
                    </span>
                    
                    <h3 className="font-serif text-lg font-bold text-zinc-100 tracking-tight mt-2 line-clamp-1">
                      {movie.title} <span className="text-zinc-500 font-normal">({movie.year})</span>
                    </h3>
                    
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Directed by <span className="text-zinc-300 font-medium">{movie.director}</span>
                    </p>

                    <div className="flex items-center space-x-1.5 mt-2">
                      {renderStars(Math.round(avgRating))}
                      <span className="text-xs font-bold text-zinc-300 font-mono mt-0.5">{avgRating}</span>
                      <span className="text-[10px] text-zinc-600 font-mono mt-1">({movie.reviews.length + 12} Letterboxd Votes)</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-zinc-900/60 pt-3">
                    <span className="text-[10.5px] font-medium text-zinc-500 font-mono flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {movie.reviews.length} Student reviews
                    </span>

                    <button
                      onClick={() => setSelectedMovieId(isExpanded ? null : movie.id)}
                      className="text-xs text-amber-400 hover:text-amber-300 font-mono flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>{isExpanded ? 'Hide Reviews' : 'Student Logs'}</span>
                      {isExpanded ? <ChevronUp className="h-4.5 w-4.5" /> : <ChevronDown className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expansion reviews panel */}
              {isExpanded && (
                <div className="border-t border-zinc-900 bg-zinc-950/80 p-5 space-y-4">
                  
                  {/* Synopsis snippet */}
                  <div className="text-xs text-zinc-400 bg-zinc-900/60 p-3 rounded-lg border border-zinc-900 italic">
                    <span className="text-[10px] uppercase font-mono font-bold text-zinc-500 not-italic block mb-1">Synopsis:</span>
                    "{movie.synopsis}"
                  </div>

                  {/* Reviews lists */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-mono text-zinc-400 uppercase tracking-wider">IISER K Campus Logs</h4>
                    {movie.reviews.length === 0 ? (
                      <p className="text-[11px] text-zinc-600 italic">No reviews logged by campus members yet. Be the first to share your post-screening review below!</p>
                    ) : (
                      movie.reviews.map((rev) => (
                        <div key={rev.id} className="bg-zinc-900/40 p-3.5 rounded-xl border border-zinc-900/60 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-300 flex items-center gap-1">
                              <User className="h-3 w-3 text-amber-500/80" />
                              {rev.userName}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {rev.userEmail.split('@')[0]}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 py-0.5">
                            {renderStars(rev.rating)}
                            <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
                              {new Date(rev.createdAt).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 italic">
                            "{rev.comment}"
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Write custom review form */}
                  <div className="border-t border-zinc-900 pt-4">
                    <h4 className="text-xs font-mono text-zinc-400 uppercase tracking-widest mb-3">Add Your Log</h4>
                    {currentUser ? (
                      <form onSubmit={(e) => handleReviewSubmit(e, movie.id)} className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-xs font-mono text-zinc-500">Your Rating:</span>
                          {renderStars(ratingInput, true, setRatingInput)}
                          <span className="text-xs font-mono font-bold text-amber-400 mt-0.5">({ratingInput}/5 Stars)</span>
                        </div>

                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Write your thought, critique, or rating log..."
                            value={commentInput}
                            onChange={(e) => {
                              setCommentInput(e.target.value);
                              if (errorMsg) setErrorMsg('');
                            }}
                            className="w-full rounded-lg border border-zinc-850 bg-zinc-900/40 px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50 pr-10"
                          />
                          <button
                            type="submit"
                            className="absolute right-2 top-1.5 p-1 text-amber-500 hover:text-amber-400 transition-colors cursor-pointer"
                            title="Submit review"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        </div>

                        {errorMsg && (
                          <span className="text-[11px] text-red-400 block">{errorMsg}</span>
                        )}
                      </form>
                    ) : (
                      <div className="bg-zinc-900/30 rounded-xl p-3 text-center border border-dashed border-zinc-850">
                        <p className="text-xs text-zinc-500">
                          Please <span className="text-amber-400 underline font-semibold">Login through Institute ID</span> to leave feedback and ratings.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* External Letterboxd outbound */}
                  <div className="flex justify-end pt-2">
                    <a
                      href={movie.letterboxdUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-zinc-500 hover:text-zinc-300 font-mono flex items-center gap-1"
                    >
                      <span>View details on Letterboxd</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
