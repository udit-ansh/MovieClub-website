import React, { useState } from 'react';
import { 
  Plus, MessageSquareHeart, Search, ArrowUp, ThumbsUp, Calendar, 
  Filter, Sparkles, User, HelpCircle, Film, BookOpen, AlertCircle
} from 'lucide-react';
import { Recommendation } from '../types';

interface RecommendationsProps {
  recommendations: Recommendation[];
  currentUser: { email: string; name: string } | null;
  onAddRecommendation: (rec: Omit<Recommendation, 'id' | 'suggestedBy' | 'suggestedByName' | 'suggestedAt' | 'votes'>) => void;
  onVoteRecommendation: (id: string, userEmail: string) => void;
}

export default function Recommendations({
  recommendations,
  currentUser,
  onAddRecommendation,
  onVoteRecommendation
}: RecommendationsProps) {
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'votes' | 'newest'>('votes');

  // Submit Form States
  const [title, setTitle] = useState('');
  const [director, setDirector] = useState('');
  const [year, setYear] = useState<number>(2024);
  const [genre, setGenre] = useState('Sci-Fi/Drama');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleVote = (id: string) => {
    if (!currentUser) {
      alert('You must authenticate using your IISER Kolkata email ID before upvoting movies.');
      return;
    }
    onVoteRecommendation(id, currentUser.email);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setErrorMsg('Unauthorized context! Please sign in with your email first.');
      return;
    }

    if (!title.trim() || !director.trim() || !notes.trim()) {
      setErrorMsg('Please fill out all required fields: Title, Director, and Screening Reason.');
      return;
    }

    onAddRecommendation({
      title: title.trim(),
      director: director.trim(),
      year: Number(year),
      genre: genre.trim(),
      notes: notes.trim()
    });

    setTitle('');
    setDirector('');
    setYear(2024);
    setGenre('Sci-Fi/Drama');
    setNotes('');
    setErrorMsg('');
    setSuccessMsg('Film recommendation logged successfully!');
    setTimeout(() => setSuccessMsg(''), 4000);
    setShowSubmitModal(false);
  };

  // Filter & Search Recommendations
  const filteredRecs = recommendations
    .filter(rec => {
      const q = searchQuery.toLowerCase();
      return (
        rec.title.toLowerCase().includes(q) ||
        rec.director.toLowerCase().includes(q) ||
        rec.genre.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'votes') {
        return b.votes.length - a.votes.length;
      } else {
        return new Date(b.suggestedAt).getTime() - new Date(a.suggestedAt).getTime();
      }
    });

  return (
    <div className="space-y-8">
      {/* Header and Action Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-900 pb-6 gap-4">
        <div>
          <span className="text-amber-500 font-mono text-xs uppercase tracking-widest font-semibold flex items-center gap-1.5">
            <MessageSquareHeart className="h-4 w-4" /> Member Voice
          </span>
          <h2 className="font-serif text-3xl font-bold text-zinc-100 tracking-tight sm:text-4xl mt-1">
            Student Wishlist
          </h2>
          <p className="text-xs text-zinc-500 mt-1 max-w-xl">
            Recommend specialized masterpieces, indie gems, or local features you want the club to screen next. Upvote submissions with high peer potential.
          </p>
        </div>

        <div>
          {currentUser ? (
            <button
              onClick={() => setShowSubmitModal(true)}
              id="btn-recommend-trigger"
              className="flex items-center space-x-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 px-5 py-2.5 rounded-xl font-bold text-sm transition-transform hover:scale-102 shadow-lg shadow-amber-500/10 cursor-pointer"
            >
              <Plus className="h-4.5 w-4.5 font-bold" />
              <span>Recommend a Movie</span>
            </button>
          ) : (
            <div className="text-amber-500/80 bg-amber-500/5 px-4 py-2.5 rounded-xl border border-amber-500/10 text-xs font-mono">
              🔑 Login to submit recommendations
            </div>
          )}
        </div>
      </div>

      {/* Control panel: search, sort */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-950/60 p-4 rounded-xl border border-zinc-900">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by title, genre, director..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-zinc-900 bg-zinc-900/40 py-2 pl-9 pr-4 text-xs text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
          <span className="text-zinc-500 text-xs font-mono flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" /> Sort:
          </span>
          <button
            onClick={() => setSortBy('votes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono border transition-all cursor-pointer ${
              sortBy === 'votes'
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Highest Voted
          </button>
          <button
            onClick={() => setSortBy('newest')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono border transition-all cursor-pointer ${
              sortBy === 'newest'
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Newest Submitted
          </button>
        </div>
      </div>

      {/* Custom temporary messages */}
      {successMsg && (
        <div className="rounded-xl border border-green-500/25 bg-green-500/5 p-4 text-xs text-green-400 font-mono">
          ✅ {successMsg}
        </div>
      )}

      {/* Grid List representation */}
      {filteredRecs.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-zinc-900 rounded-xl">
          <BookOpen className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
          <h4 className="text-zinc-400 font-serif text-base font-semibold">No requests meet your filter</h4>
          <p className="text-xs text-zinc-650 mt-1 max-w-xs mx-auto">
            Try revising your search terms or be the first to recommend a masterpiece.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredRecs.map((rec) => {
            const hasUpvoted = currentUser ? rec.votes.includes(currentUser.email) : false;

            return (
              <div
                key={rec.id}
                className="group flex flex-col justify-between rounded-xl border border-zinc-900 bg-zinc-950 p-5 shadow-lg hover:border-zinc-800 transition-all duration-300"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <span className="text-[9.5px] uppercase font-mono font-bold text-amber-500/80 bg-amber-500/5 border border-amber-500/10 px-2 py-0.5 rounded">
                        {rec.genre}
                      </span>
                      <h3 className="font-serif text-lg font-bold text-zinc-100 tracking-tight mt-1.5">
                        {rec.title} <span className="text-zinc-500 font-normal">({rec.year})</span>
                      </h3>
                      <p className="text-xs text-zinc-400">
                        Director: <span className="text-zinc-300 font-medium">{rec.director}</span>
                      </p>
                    </div>

                    {/* Voting lever column */}
                    <button
                      onClick={() => handleVote(rec.id)}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all border shrink-0 scale-95 cursor-pointer ${
                        hasUpvoted
                          ? 'bg-amber-500 border-amber-400 text-zinc-950'
                          : 'bg-zinc-900/60 border-zinc-800 hover:border-amber-500/30 text-zinc-400 hover:text-amber-400'
                      }`}
                    >
                      <ArrowUp className={`h-4.5 w-4.5 ${hasUpvoted ? 'stroke-[3]' : 'animate-bounce'}`} />
                      <span className="text-xs font-extrabold font-mono mt-0.5">{rec.votes.length}</span>
                    </button>
                  </div>

                  {/* Submission note explaining reason */}
                  <div className="mt-4 bg-zinc-900/50 p-3.5 rounded-xl border border-zinc-900/60 text-xs italic text-zinc-300 relative">
                    <span className="absolute -top-1.5 left-3 bg-zinc-950 px-1 font-mono text-[9px] text-zinc-500 uppercase not-italic font-bold tracking-wider">
                      Why Screen This?
                    </span>
                    "{rec.notes}"
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-zinc-900/80 flex items-center justify-between text-[11px] text-zinc-500">
                  <span className="flex items-center gap-1 font-mono">
                    <User className="h-3 w-3 text-zinc-600" />
                    Suggested by <span className="text-zinc-300 font-semibold">{rec.suggestedByName}</span>
                  </span>

                  <span className="flex items-center gap-1 font-mono text-[10px]">
                    <Calendar className="h-3 w-3 text-zinc-600" />
                    {new Date(rec.suggestedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Informative Tip Box on film screening selection criteria */}
      <div className="rounded-xl border border-zinc-900 bg-zinc-950/20 p-5 flex gap-3.5">
        <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <h4 className="font-semibold text-zinc-300">How is a film selected from requests?</h4>
          <p className="text-zinc-500 leading-relaxed">
            The Movie Club panel checks the wishlist weekly. Higher votes guarantee serious consideration on screen feasibility (such as licensing requirements, subtitles Availability, and length limitations). Make sure your rationale highlights academic or philosophical resonance!
          </p>
        </div>
      </div>

      {/* Submit Recommendation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-850 bg-zinc-950 p-6 shadow-2xl relative my-8">
            <button
              onClick={() => {
                setShowSubmitModal(false);
                setErrorMsg('');
              }}
              className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-zinc-200 rounded-lg cursor-pointer"
            >
              <Plus className="h-5 w-5 rotate-45" />
            </button>

            <div className="mb-4">
              <span className="text-xs font-mono text-amber-500 uppercase tracking-widest font-semibold flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" /> Share Cinema
              </span>
              <h2 className="font-serif text-xl font-bold text-zinc-100 mt-0.5">
                Suggest Screening Nomination
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Recommend movies you want to screen to your fellow peers on campus.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm text-zinc-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">MOVIE TITLE *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Arrival"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-550 focus:border-amber-500/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">DIRECTOR *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Denis Villeneuve"
                    value={director}
                    onChange={(e) => setDirector(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-550 focus:border-amber-500/50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">RELEASE YEAR</label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3.5 py-2 text-sm text-zinc-100 focus:border-amber-500/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">GENRES / TAGS</label>
                  <input
                    type="text"
                    placeholder="e.g. Sci-Fi / Thriller"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1.5">SCREENING ESSAY / MOTIVATION *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="In 2 to 3 lines, motivate why the film carries merit (concept, sound design, academic themes, philosophical depth or cinematic mastery) and why the IISER Kolkata student club must screen it..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none resize-none"
                />
              </div>

              {errorMsg && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
                  {errorMsg}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-3 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => {
                    setShowSubmitModal(false);
                    setErrorMsg('');
                  }}
                  className="px-4 py-2 text-sm font-semibold text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 text-zinc-950 px-5 py-2 rounded-lg text-sm font-semibold transition-colors font-mono cursor-pointer"
                >
                  SUBMIT RECOMMENDATION
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
