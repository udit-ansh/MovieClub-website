export interface Screening {
  id: string;
  title: string;
  director: string;
  year: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  venue: string; // e.g. "LHC G-06" or "Auditorium"
  description: string;
  posterUrl: string;
  backdropUrl?: string;
  runtime: string;
  genre: string[];
  language: string;
  trailerUrl?: string; // e.g. youtube link
  screenedByClub?: boolean;
}

export interface PastMovie {
  id: string;
  title: string;
  director: string;
  year: number;
  screenedDate: string; // YYYY-MM-DD
  rating: number; // 0-5
  letterboxdUrl: string;
  posterUrl: string;
  synopsis: string;
  genre: string[];
  reviews: UserReview[];
}

export interface UserReview {
  id: string;
  userEmail: string;
  userName: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
}

export interface Recommendation {
  id: string;
  title: string;
  director: string;
  year: number;
  genre: string;
  notes: string;
  suggestedBy: string; // email of student
  suggestedByName: string; // calculated from email
  suggestedAt: string;
  votes: string[]; // array of student emails who upvoted
  posterUrl?: string;
}

export interface User {
  email: string;
  name: string;
  role: 'admin' | 'student';
  photoURL?: string;
}

export interface TriviaQuestion {
  id: string;
  question: string;
  options: string[];
  answer: number; // Index of correct option
  explanation: string;
}
