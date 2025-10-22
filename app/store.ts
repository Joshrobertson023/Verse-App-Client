    import { create } from 'zustand';
import Status from './Enums';

export interface ErrorMessage {
    type: string;
    message: string;
}

export interface Collection {
    collectionId?: number;
    title: string;
    authorUsername?: string;
    visibility?: string;
    isPublished?: boolean;
    numSaves?: number;
    dateCreated?: Date;
    verseOrder?: string;
    userVerses: UserVerse[];
    favorites: boolean;
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
    streak?: Streak[];
    streakLength: number;
    versesMemorized: number;
    versesOverdue: number;
    numberPublishedCollections: number;
}

export interface UserVerse {
    id?: number;
    username: string;
    collectionId?: number;
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
    verse_reference: string;
    text: string;
    users_Saved_Verse?: number;
    users_Memorized?: number;
    verse_Number?: number;
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

export interface SearchData {
    searched_By_Passage: boolean;
    readable_Reference: string;
    verses: Verse[];
}

export interface CollectionSheetControls {
    openSettingsSheet: () => void;
    collection: Collection | undefined;
}

const defaultCollectionsSheetControls = {
    openSettingsSheet: () => console.log('Collection settings sheet not yet registered or component unmounted.'),
    collection: undefined,
}

const defaultCollection: Collection = {
    title: 'Favorites',
    visibility: 'Private',
    userVerses: [],
    dateCreated: new Date(),
    collectionId: 0,
    favorites: true,
};

const defaultNewUserVerse: UserVerse = {
    username: '',
    readableReference: '',
    verses: [],
}

const defaultCollections: Collection[] = []

const emptyLoginInfo: loginInfo = {
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
};

const emptyNewCollection: Collection = {
    title: 'New Collection',
    userVerses: [],
    favorites: false,
}

export const loggedOutUser: User = {
    username: 'Default User',
    firstName: 'L',
    lastName: 'O',
    streak: [],
    versesMemorized: 0,
    versesOverdue: 0,
    numberPublishedCollections: 0,
    streakLength: 0,
}

interface AppState {
  user: User;
  collections: Collection[];
  loginInfo: loginInfo;
  homePageStats: homePageStats;
  showStreakOnHomepage: boolean;
  sendStreakNotifications: boolean;
  sendVerseOfDayNotifications: boolean;
  newCollection: Collection;
  numNotifications: number;
  collectionsSheetControls: CollectionSheetControls;

  getHomePageStats: (user: User) => void;
  setUser: (user: User) => void;
  addCollection: (newCollection: Collection) => void;
  removeCollection: (id: number) => void;
  updateCollection: (updated: Collection) => void;
  setLoginInfo: (info: loginInfo) => void;
  setShowStreakOnHomepage?: (show: boolean) => void;
    setSendStreakNotifications?: (send: boolean) => void;
    setSendVerseOfDayNotifications?: (send: boolean) => void;
    setNewCollection: (collection: Collection) => void;
    addUserVerseToCollection: (userVerse: UserVerse) => void;
    resetNewCollection: () => void;
    setCollections: (collections: Collection[]) => void;
    setCollectionsSheetControls: (controls: CollectionSheetControls) => void;
}

export const useAppStore = create<AppState>((set) => ({
    user: loggedOutUser,
    collections: defaultCollections,
    loginInfo: emptyLoginInfo,
    homePageStats: { totalMemorized: 0, overdue: 0, published: 0 },
    showStreakOnHomepage: true,
    sendStreakNotifications: true,
    sendVerseOfDayNotifications: true,
    newCollection: emptyNewCollection,
    numNotifications: 0,
    collectionsSheetControls: defaultCollectionsSheetControls,

    getHomePageStats: async (user: User) => {
        // Get from API verses memorized, overdue, and published
    },
    setUser: (newUser: User) => set((state) => ({
        user: newUser
    })),
    addCollection: (newCollection: Collection) => set((state: { collections: Collection[] }) => ({collections: [...state.collections, newCollection]})),
    removeCollection: (id: number) => set((state: { collections: Collection[] }) => ({collections: state.collections.filter((c) => c.id !== id)})),
    updateCollection: (updated: Collection) => set((state: { collections: Collection[] }) => ({
    collections: state.collections.map((c) =>
        c.collectionId === updated.collectionId ? updated : c
    ),})), // const updateCollection = useAppStore((s) => s.updateCollection);
    setLoginInfo: (info: loginInfo) => set({ loginInfo: info }),
    setStreak: (streak: Streak[]) => set((state) => ({ user: { ...state.user, streak } })),
    setStreakLength: (length: number) => set((state) => ({ user: { ...state.user, streakLength: length }})),
    setSendStreakNotifications: (send: boolean) => set({ sendStreakNotifications: send }),
    setShowStreakOnHomepage: (show: boolean) => set({ showStreakOnHomepage: show }),
    setSendVerseOfDayNotifications: (send: boolean) => set({ sendVerseOfDayNotifications: send }),
    setNewCollection: (collection: Collection) => set({newCollection: collection}),
    addUserVerseToCollection: (userVerse: UserVerse) =>
    set((state) => ({
        newCollection: {
            ...state.newCollection!,
            userVerses: [...(state.newCollection?.userVerses || []), userVerse],
        },
    })),
    resetNewCollection: () =>
        set(() => ({
            newCollection: emptyNewCollection
        })),
    setCollections: (collections) => {
        set((state) => ({
            collections: collections
        }))
    },
    setCollectionsSheetControls: (controls: CollectionSheetControls) => set({collectionsSheetControls: controls}),
}))