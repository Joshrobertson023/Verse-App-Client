    import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Status from './Enums';

    export interface Collection {
    id: number;
    title: string;
    author?: string;
    visibility?: string;
    isPublished?: boolean;
    numSaves?: number;
    dateCreated?: Date;
    verseOrder?: string;
    userVerses: UserVerse[];
    }

    export interface User {
        username: string;
        firstName: string;
        lastName: string;
        email?: string;
        authToken?: string;
        collectionsSort?: number;
        status?: Status;
        collectionsOrder?: string;
        collectionsSortBy?: number;
        hashedPassword?: string;
        dateRegistered?: Date;
        lastSeen?: Date;
        description?: string;
        profileVisibility?: number;
        subscribedVerseOfDay?: boolean;
    }

    export interface UserVerse {
        id: number;
        username: string;
        collectionId: number;
        readableReference: string;
        lastPracticed?: Date;
        dateMemorized?: Date;
        dateAdded?: Date;
        progressPercent?: number;
        timesMemorized?: number;
        verses: Verse[];
    }

    export interface Streak {
        date: string;
        count: number;
    }

    export class Verse {
        id: number;
        reference: string;
        text: string;
        usersSaved?: number;
        usersMemorized?: number;

        get verseNumber(): number {
            return 0; 
        }

        constructor(id: number, reference: string, text: string) {
            this.id = id;
            this.reference = reference;
            this.text = text;
        }
    }

    interface AppState {
    user: User | null;
    collections: Collection[];
    streak: Streak[];

    setUser: (user: User | null) => void;
    addCollection: (collection: Collection) => void;
    removeCollection: (id: number) => void;

    // Future SQLite integration
    loadFromSQLite: () => Promise<void>;
    saveToSQLite: () => Promise<void>;
    }

    const defaultCollection: Collection = {
        id: 0,
        title: 'Favorites',
        userVerses: [],
        visibility: 'public',
        author: 'JoshRobertson023',
        dateCreated: new Date(),
    }

    const collections: Collection[] = [
        {
            id: 0,
            title: 'Favorites',
            userVerses: [],
            visibility: 'public',
            author: 'JoshRobertson023',
            dateCreated: new Date(),
        },
        {
            id: 1,
            title: 'Faith',
            userVerses: [],
            visibility: 'private',
            author: 'JoshRobertson023',
            dateCreated: new Date(),
        },
        {
            id: 2,
            title: 'Love',
            userVerses: [],
            visibility: 'private',
            author: 'JoshRobertson023',
            dateCreated: new Date(),
        },
        {
            id: 3,
            title: 'Hope',
            userVerses: [],
            visibility: 'private',
            author: 'JoshRobertson023',
            dateCreated: new Date(),
        },
    ];

    export const useAppStore = create<AppState>()(
    persist(
        (set, get) => ({
        user: null,
        collections: collections,
        streak: [ 
            {
            date: '2025-10-02',
            count: 0,
            },
            {
            date: '2025-10-03',
            count: 5,
            },
            {
            date: '2025-10-04',
            count: 5,
            },
            {
            date: '2025-10-05',
            count: 5,
            },
        ],

        setUser: (user) => set({ user }),

        addCollection: (collection) =>
            set({ collections: [...get().collections, collection] }),

        removeCollection: (id) =>
            set({
            collections: get().collections.filter((c) => c.id !== id),
            }),

        // 🧩 Placeholder for SQLite later
        loadFromSQLite: async () => {
            // TODO: Load collections from SQLite
            // Example:
            // const data = await db.getAllAsync();
            // set({ collections: data });
        },

        saveToSQLite: async () => {
            // TODO: Write collections to SQLite
        },
        }),
        {
        name: 'verseapp-store',
        storage: {
            getItem: async (name) => {
            const value = await AsyncStorage.getItem(name);
            return value ? JSON.parse(value) : null;
            },
            setItem: async (name, value) => {
            await AsyncStorage.setItem(name, JSON.stringify(value));
            },
            removeItem: async (name) => {
            await AsyncStorage.removeItem(name);
            },
        },
        }
    )
    );
