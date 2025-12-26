import type { Tournament } from '../types';

const STORAGE_KEY = 'tournaments_data';

// Initial dummy data
const DUMMY_TOURNAMENTS: Tournament[] = [
    {
        id: '1',
        title: 'Kış Sezonu Açılış',
        startDate: '2025-01-15',
        endDate: '2025-01-15',
        country: 'Turkey',
        rounds: 5,
        type: 'standart'
    },
    {
        id: '2',
        title: 'Bahar Kupası',
        startDate: '2025-04-10',
        endDate: '2025-04-12',
        country: 'Turkey',
        rounds: 9,
        type: 'rapid'
    },
    {
        id: '3',
        title: 'Yaz Ligi Elemeleri',
        startDate: '2025-07-20',
        endDate: '2025-07-25',
        link: 'https://example.com'
    },
    {
        id: '4',
        title: 'Grand Final 2025',
        startDate: '2025-12-01',
        endDate: '2025-12-05'
    },
    {
        id: '5',
        title: 'Early 2026 Cup',
        startDate: '2026-02-14',
        endDate: '2026-02-16',
        country: 'Turkey',
        rounds: 11,
        type: 'blitz'
    }
];

export const fetchTournaments = async (): Promise<Tournament[]> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        // Return dummy data and initialize storage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DUMMY_TOURNAMENTS));
        return DUMMY_TOURNAMENTS;
    }
    return JSON.parse(stored);
};



export const updateTournament = async (tournament: Tournament) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const stored = localStorage.getItem(STORAGE_KEY);
    const tournaments: Tournament[] = stored ? JSON.parse(stored) : DUMMY_TOURNAMENTS;

    const index = tournaments.findIndex(t => t.id === tournament.id);
    if (index !== -1) {
        tournaments[index] = tournament;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tournaments));
    }
    return tournament;
};

export const deleteTournament = async (id: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const stored = localStorage.getItem(STORAGE_KEY);
    const tournaments: Tournament[] = stored ? JSON.parse(stored) : DUMMY_TOURNAMENTS;

    const filtered = tournaments.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
};

export const addTournament = async (tournament: Omit<Tournament, 'id'>): Promise<Tournament> => {
    await new Promise(resolve => setTimeout(resolve, 300));

    const newTournament: Tournament = {
        ...tournament,
        id: Math.random().toString(36).substr(2, 9)
    };

    const currentlist = await fetchTournaments();
    const updatedList = [...currentlist, newTournament];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));

    return newTournament;
};
