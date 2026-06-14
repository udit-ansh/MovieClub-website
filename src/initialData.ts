import { Screening, PastMovie, Recommendation, TriviaQuestion } from './types';

// Let's populate with realistic cinematic entries fit for an institute of scientific and creative minds (IISER Kolkata)
export const initialScreenings: Screening[] = [
  {
    id: 's-1',
    title: '2001: A Space Odyssey',
    director: 'Stanley Kubrick',
    year: 1968,
    date: '2026-06-19',
    time: '18:30',
    venue: 'MND Auditorium',
    description: 'After discovering a mysterious artifact buried beneath the Lunar surface, mankind sets off on a quest to find its origins with the help of H.A.L. 9000, a sentient supercomputer.',
    posterUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600&auto=format&fit=crop', // sci-fi galaxy landscape
    backdropUrl: 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?q=80&w=1200&auto=format&fit=crop',
    runtime: '149 min',
    genre: ['Sci-Fi', 'Adventure', 'Mystery'],
    language: 'English (with Subs)',
    trailerUrl: 'https://www.youtube.com/watch?v=oR_e9y-bka0'
  },
  {
    id: 's-2',
    title: 'Tumbbad',
    director: 'Rahi Anil Barve',
    year: 2018,
    date: '2026-06-26',
    time: '19:00',
    venue: 'M.N. Saha Auditorium, Ground Floor, TRC building',
    description: 'A mythological story about a goddess who created the entire universe and her first-born son, Hastar, a monster who wants to consume all the gold and grain. A family built a shrine for Hastar, which brings about a terrible curse.',
    posterUrl: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?q=80&w=600&auto=format&fit=crop', // dark textured shadow
    backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
    runtime: '104 min',
    genre: ['Horror', 'Fantasy', 'Drama'],
    language: 'Hindi (with English Subs)',
    trailerUrl: 'https://www.youtube.com/watch?v=sN7AtarS24E'
  },
  {
    id: 's-3',
    title: 'Perfect Days',
    director: 'Wim Wenders',
    year: 2023,
    date: '2026-07-03',
    time: '18:00',
    venue: 'LHC G-02 Lecture Room',
    description: 'Hirayama seems utterly content with his simple life as a cleaner of toilets in Tokyo. Outside of his very structured everyday routine he enjoys his passion for music and for books. And he loves trees and takes photos of them.',
    posterUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=600&auto=format&fit=crop', // calm tokyo streets
    backdropUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?q=80&w=1200&auto=format&fit=crop',
    runtime: '124 min',
    genre: ['Drama'],
    language: 'Japanese (with English Subs)',
    trailerUrl: 'https://www.youtube.com/watch?v=48S43cE0Kz8'
  }
];

export const initialPastMovies: PastMovie[] = [
  {
    id: 'p-1',
    title: 'Oppenheimer',
    director: 'Christopher Nolan',
    year: 2023,
    screenedDate: '2026-05-18',
    rating: 4.8,
    letterboxdUrl: 'https://letterboxd.com/film/oppenheimer-2023/',
    posterUrl: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?q=80&w=600&auto=format&fit=crop', // moody explosive/city/vintage scale
    synopsis: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb during World War II.',
    genre: ['Biography', 'Drama', 'History'],
    reviews: [
      {
        id: 'r-1',
        userEmail: 'arindam.phys@iiserkol.ac.in',
        userName: 'Arindam Ghosh',
        rating: 5,
        comment: 'As a physics student, this is a spectacular piece of historical realism. The sound design during the Trinity test absolute silence, then the shockwave was stunning.',
        createdAt: '2026-05-18T22:15:00Z'
      },
      {
        id: 'r-2',
        userEmail: 'soham.bio@iiserkol.ac.in',
        userName: 'Soham Mukherjee',
        rating: 4,
        comment: 'Brilliant editing. Nolan somehow made three hours of men talking in chalky rooms feel like an edge-of-your-seat thriller.',
        createdAt: '2026-05-19T09:30:00Z'
      }
    ]
  },
  {
    id: 'p-2',
    title: 'Stalker',
    director: 'Andrei Tarkovsky',
    year: 1979,
    screenedDate: '2026-04-24',
    rating: 4.7,
    letterboxdUrl: 'https://letterboxd.com/film/stalker/',
    posterUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=600&auto=format&fit=crop', // mysterious deep forest/sepia feel
    synopsis: 'An expedition led by a "Stalker" guides a writer and a scientist through a mysterious, post-apocalyptic wasteland known as the "Zone" to find a Room that grants your deepest desires.',
    genre: ['Sci-Fi', 'Drama', 'Art-House'],
    reviews: [
      {
        id: 'r-3',
        userEmail: 'aditi.chem@iiserkol.ac.in',
        userName: 'Aditi Sharma',
        rating: 5,
        comment: 'Philosophical masterpiece! The long shots let us sit with the characters’ existential dread. Unforgettable soundscape.',
        createdAt: '2026-04-24T23:05:00Z'
      }
    ]
  },
  {
    id: 'p-3',
    title: 'In the Mood for Love',
    director: 'Wong Kar-wai',
    year: 2000,
    screenedDate: '2026-03-12',
    rating: 4.9,
    letterboxdUrl: 'https://letterboxd.com/film/in-the-mood-for-love/',
    posterUrl: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=600&auto=format&fit=crop', // glowing melancholic tones
    synopsis: 'Two neighbors, a woman and a man, form a strong bond after both suspect extramarital activities of their respective spouses. However, they agree to keep things platonic.',
    genre: ['Drama', 'Romance'],
    reviews: [
      {
        id: 'r-4',
        userEmail: 'poulami.chem@iiserkol.ac.in',
        userName: 'Poulami Das',
        rating: 5,
        comment: 'The color grading, the cheongsams, the melancholic Yumeji’s Theme on loop! Absolute poetry in frame.',
        createdAt: '2026-03-12T22:30:00Z'
      }
    ]
  },
  {
    id: 'p-4',
    title: 'Spider-Man: Into the Spider-Verse',
    director: 'B. Persichetti, P. Ramsey',
    year: 2018,
    screenedDate: '2026-02-14',
    rating: 4.6,
    letterboxdUrl: 'https://letterboxd.com/film/spider-man-into-the-spider-verse/',
    posterUrl: 'https://images.unsplash.com/photo-1635811390994-14d7445e99be?q=80&w=600&auto=format&fit=crop', // futuristic neon comic vibe
    synopsis: 'Teen Miles Morales becomes the Spider-Man of his universe, and must join with five spider-powered individuals from other dimensions to stop a threat for all realities.',
    genre: ['Animation', 'Action', 'Sci-Fi'],
    reviews: [
      {
        id: 'r-5',
        userEmail: 'rohit.math@iiserkol.ac.in',
        userName: 'Rohit Sen',
        rating: 5,
        comment: 'Revolutionary animation design. Feels like stepping inside a living comic book. The framing, frame rates, and halftone mapping are genius.',
        createdAt: '2026-02-14T21:10:00Z'
      }
    ]
  }
];

export const initialRecommendations: Recommendation[] = [
  {
    id: 'rec-1',
    title: 'The Zone of Interest',
    director: 'Jonathan Glazer',
    year: 2023,
    genre: 'Drama/History',
    notes: 'The banality of evil shown through pristine sound design. A chilling look at human compartmentalization. Excellent discussion fuel for the club!',
    suggestedBy: 'ritoban.chem@iiserkol.ac.in',
    suggestedByName: 'Ritoban Roy',
    suggestedAt: '2026-06-12T14:24:00Z',
    votes: ['uditansh2007@gmail.com', 'arindam.phys@iiserkol.ac.in', 'soham.bio@iiserkol.ac.in']
  },
  {
    id: 'rec-2',
    title: 'Arrival',
    director: 'Denis Villeneuve',
    year: 2016,
    genre: 'Sci-Fi/Mystery',
    notes: 'Based on Ted Chiang’s Story of Your Life. Explores Sapir-Whorf hypothesis, linguistic relativity, and grand mathematical/geometric concepts of time. Perfect choice for IISER folks!',
    suggestedBy: 'priya.math@iiserkol.ac.in',
    suggestedByName: 'Priya Banerjee',
    suggestedAt: '2026-06-13T10:15:00Z',
    votes: ['arindam.phys@iiserkol.ac.in']
  }
];

export const triviaQuestions: TriviaQuestion[] = [
  {
    id: 'q-1',
    question: 'In Christopher Nolan’s Oppenheimer, who did Robert Oppenheimer poison with an injected apple, only to change his mind the next morning?',
    options: ['Patrick Blackett', 'Ernest Lawrence', 'Niels Bohr', 'Luis Alvarez'],
    answer: 0,
    explanation: 'Oppenheimer injected Patrick Blackett’s apple with potassium cyanide due to an academic dispute, before rushing in the next day to prevent Niels Bohr from eating it.'
  },
  {
    id: 'q-2',
    question: 'Which Andrei Tarkovsky movie was filmed near actual abandoned hydro-electric power plants in Estonia, giving it its iconic post-industrial septic green look?',
    options: ['Solaris', 'The Mirror', 'Stalker', 'Nostalghia'],
    answer: 2,
    explanation: 'Stalker’s exterior scenes in the "Zone" were filmed around several retired hydro-electric power plants in Tallinn, Estonia, giving the film its stark authentic texture.'
  },
  {
    id: 'q-3',
    question: 'In Stanley Kubrick’s 2001: A Space Odyssey, what is the designation/name of the spacecraft carrying Dr. David Bowman and Dr. Frank Poole to Jupiter?',
    options: ['Hermes II', 'Discovery One', 'Aries IB', 'Odyssey Prime'],
    answer: 1,
    explanation: 'The USSC Discovery One (XD-1) is the nuclear-powered interplanetary spacecraft that carries the crew and the HAL 9000 supercomputer to Jupiter.'
  }
];
