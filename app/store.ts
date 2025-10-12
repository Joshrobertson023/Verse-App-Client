    import { create } from 'zustand';
import Status from './Enums';

export interface ErrorMessage {
    type: string;
    message: string;
}

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
    firstName?: string;
    lastName?: string;
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
    streakLength?: number;
    streak: Streak[];
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
    verses?: Verse[];
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

export interface homePageStats {
    totalMemorized: number;
    overdue: number;
    published: number;
}

const defaultCollection: Collection = {
    title: 'Favorites',
    visibility: 'private',
    userVerses: [],
    dateCreated: new Date(),
    id: 0,
};

const emptyLoginInfo: loginInfo = {
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
};

export const loggedOutUser: User = {
    username: '',
    streak: [],
}

interface AppState {
  user: User;
  collections: Collection[];
  loginInfo: loginInfo;
  homePageStats: homePageStats;
  showStreakOnHomepage: boolean;
  sendStreakNotifications: boolean;
  sendVerseOfDayNotifications: boolean;

  getHomePageStats: (user: User) => void;
  setUser: (user: User) => void;
  addCollection: (newCollection: Collection) => void;
  removeCollection: (id: number) => void;
  updateCollection: (updated: Collection) => void;
  setLoginInfo: (info: loginInfo) => void;
  setShowStreakOnHomepage?: (show: boolean) => void;
    setSendStreakNotifications?: (send: boolean) => void;
    setSendVerseOfDayNotifications?: (send: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
    user: loggedOutUser,
    collections: [defaultCollection],
    loginInfo: emptyLoginInfo,
    homePageStats: { totalMemorized: 0, overdue: 0, published: 0 },
    showStreakOnHomepage: true,
    sendStreakNotifications: true,
    sendVerseOfDayNotifications: true,

    getHomePageStats: async (user: User) => {
        // Get from API verses memorized, overdue, and published
    },
    setUser: (user: User) => set({ user }),
    addCollection: (newCollection: Collection) => set((state: { collections: Collection[] }) => ({collections: [...state.collections, newCollection]})),
    removeCollection: (id: number) => set((state: { collections: Collection[] }) => ({collections: state.collections.filter((c) => c.id !== id)})),
    updateCollection: (updated: Collection) => set((state: { collections: Collection[] }) => ({
    collections: state.collections.map((c) =>
        c.id === updated.id ? updated : c
    ),})), // const updateCollection = useAppStore((s) => s.updateCollection);
    setLoginInfo: (info: loginInfo) => set({ loginInfo: info }),
    setStreak: (streak: Streak[]) => set((state) => ({ user: { ...state.user, streak } })),
    setStreakLength: (length: number) => set((state) => ({ user: { ...state.user, streakLength: length }})),
    setSendStreakNotifications: (send: boolean) => set({ sendStreakNotifications: send }),
    setShowStreakOnHomepage: (show: boolean) => set({ showStreakOnHomepage: show }),
    setSendVerseOfDayNotifications: (send: boolean) => set({ sendVerseOfDayNotifications: send }),
}))