    import { create } from 'zustand';
import Status from './Enums';

export interface ErrorMessage {
    type: string;
    message: string;
}

export interface Collection {
id?: number;
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

export interface Verse {
    id: number;
    reference: string;
    text: string;
    usersSaved?: number;
    usersMemorized?: number;
    verseNumber?: number;
}

export interface loginInfo {
    firstName: string;
    lastName: string;
    username: string;
    password: string;
    confirmPassword: string;
    email: string;
}

interface AppState {
    user: User | null;
    collections: Collection[];
    streak: Streak[] | null;
    loginInfo: loginInfo;

    setLoginInfo: (info: loginInfo) => void;
    setUser: (user: User | null) => void;
    addCollection: (newCollection: Collection) => Promise<void>;
    removeCollection: (id: number) => void;
}

const defaultCollection: Collection = {
    title: 'Favorites',
    visibility: 'private',
    userVerses: [],
    dateCreated: new Date(),
};

const emptyLoginInfo: loginInfo = {
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
};

export const useAppStore = create<AppState>()((set, get) => ({
    user: null,
    collections: [defaultCollection],
    streak: null,
    loginInfo: emptyLoginInfo,

    setLoginInfo: (info) => set({ loginInfo: info }),

    setUser: (user) => set({ user }),

    addCollection: async (newCollectiondata) => {
        const state = get();
        const author = state.user?.username || 'You';
        const currentDate = new Date();
        const newCollection: Collection = {
            title: newCollectiondata.title,
            author: author,
            dateCreated: currentDate,
            userVerses: [],
            visibility: newCollectiondata.visibility || 'private',
        };

        try {
            const dateString = currentDate.toISOString();

            await 

            set((state) => ({
                collections: [...(state.collections || []), newCollection],
            }));
        }
        catch (error) {
            console.error(error);
            throw error;
        }
    },

    removeCollection: (id) =>
        set({
            collections: get().collections?.filter((c) => c.id !== id) || null,
        }),
    }),
);
