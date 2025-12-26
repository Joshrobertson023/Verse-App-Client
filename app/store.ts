    import { create } from 'zustand';
import Status from './Enums';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface ErrorMessage {
    type: string;
    message: string;
}

export interface CollectionNote {
    id: string;
    collectionId: number;
    text: string;
}

export interface Collection {
    collectionId?: number;
    title: string;
    authorUsername?: string;
    username?: string;
    visibility?: string;
    dateCreated?: Date;
    verseOrder?: string;
    userVerses: UserVerse[];
    notes?: CollectionNote[];
    favorites: boolean;
    averageProgressPercent?: number;
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
    accountFlagged?: number;
    profileVisibility?: number;
    subscribedVerseOfDay?: boolean;
    pushNotificationsEnabled?: boolean;
    activityNotificationsEnabled?: boolean;
    notifyMemorizedVerse?: boolean;
    notifyPublishedCollection?: boolean;
    notifyCollectionSaved?: boolean;
    notifyNoteLiked?: boolean;
    badgeNotificationsEnabled?: boolean;
    badgeOverdueEnabled?: boolean;
    pushNotificationToken?: string;
    isAdmin?: boolean;
    isPaid?: boolean;
    streak?: Streak[];
    streakLength: number;
    versesMemorized: number;
    versesOverdue: number;
    numberPublishedCollections: number;
    points: number;
    bibleVersion?: number;
    hasShownBibleHelp?: boolean;
    profilePictureUrl?: string;
    banned?: boolean;
    themePreference?: number;
    typeOutReference: boolean;
    practiceNotificationsEnabled?: boolean;
    friendsActivityNotificationsEnabled?: boolean;
    streakRemindersEnabled?: boolean;
}

export interface UserVerse {
    clientId?: string;
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
    dueDate?: Date;
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
    verse_Number?: string | number;
}

export interface Activity {
    id: number;
    text: string;
    dateCreated: string;
    username: string;
}

export interface loginInfo {
    firstName: string;
    lastName: string;
    username: string;
    password: string;
    confirmPassword: string;
    email: string;
    bibleVersion?: number;
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

export interface Notification {
    id: number;
    username: string;
    senderUsername: string;
    message: string;
    createdDate: string;
    expirationDate?: string;
    isRead: boolean;
    notificationType: string;
}

export interface SiteBannerState {
    message: string | null;
}

export interface VerseOfDay {
    id: number;
    readableReference: string;
    isSent: boolean;
    sentDate: string | null;
    createdDate: string;
}

export interface CollectionSheetControls {
    openSettingsSheet: () => void;
    collection: Collection | undefined;
}

const cloneVerse = (verse: Verse): Verse => ({
    ...verse,
});

const cloneUserVerse = (userVerse: UserVerse): UserVerse => ({
    ...userVerse,
    lastPracticed: userVerse.lastPracticed ? new Date(userVerse.lastPracticed) : undefined,
    dateMemorized: userVerse.dateMemorized ? new Date(userVerse.dateMemorized) : undefined,
    dateAdded: userVerse.dateAdded ? new Date(userVerse.dateAdded) : undefined,
    dueDate: userVerse.dueDate ? new Date(userVerse.dueDate) : undefined,
    verses: (userVerse.verses ?? []).map(cloneVerse),
});

const cloneCollection = (collection: Collection): Collection => ({
    ...collection,
    dateCreated: collection.dateCreated ? new Date(collection.dateCreated) : undefined,
    userVerses: (collection.userVerses ?? []).map(cloneUserVerse),
});

const defaultCollectionsSheetControls = {
    openSettingsSheet: () => console.log('Collection settings sheet not yet registered or component unmounted.'),
    collection: undefined,
}

const defaultCollection: Collection = {
    title: 'Favorites',
    authorUsername: 'Default User',
    username: 'Default User',
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

const defaultSiteBanner: SiteBannerState = {
    message: null,
};

const emptyLoginInfo: loginInfo = {
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    bibleVersion: 0,
};

const emptyNewCollection: Collection = {
    title: 'New Collection',
    authorUsername: undefined,
    username: undefined,
    userVerses: [],
    favorites: false,
}

export interface ProfileCache {
    memorizedCount: number;
    activity: Activity[];
    isLoaded: boolean;
    isLoading: boolean;
    lastFetchedAt?: number;
    username?: string;
    error?: string | null;
}

export interface ProfileDrawerControls {
    openDrawer: () => void;
    closeDrawer: () => void;
    toggleDrawer: () => void;
}

const defaultProfileCache: ProfileCache = {
    memorizedCount: 0,
    activity: [],
    isLoaded: false,
    isLoading: false,
    lastFetchedAt: undefined,
    username: undefined,
    error: null,
};

export const defaultProfileDrawerControls: ProfileDrawerControls = {
    openDrawer: () => console.log('Profile drawer control not yet registered or component unmounted.'),
    closeDrawer: () => console.log('Profile drawer control not yet registered or component unmounted.'),
    toggleDrawer: () => console.log('Profile drawer control not yet registered or component unmounted.'),
};

export const loggedOutUser: User = {
    username: 'Default User',
    firstName: 'L',
    lastName: 'O',
    streak: [],
    versesMemorized: 0,
    versesOverdue: 0,
    numberPublishedCollections: 0,
    streakLength: 0,
    subscribedVerseOfDay: true,
    pushNotificationsEnabled: true,
    points: 0,
    typeOutReference: false,
}

interface AppState {
  user: User;
  collections: Collection[];
  loginInfo: loginInfo;
  homePageStats: homePageStats;
  showStreakOnHomepage: boolean;
  sendStreakNotifications: boolean;
  sendVerseOfDayNotifications: boolean;
  shouldReloadPracticeList: boolean;
  newCollection: Collection;
  editingCollection: Collection | undefined;
  publishingCollection: Collection | undefined;
  editingUserVerse: UserVerse | undefined;
  selectedUserVerse: UserVerse | undefined;
  numNotifications: number;
  collectionsSheetControls: CollectionSheetControls;
  popularSearches: string[];
  profileCache: ProfileCache;
  profileDrawerControls: ProfileDrawerControls;
  themePreference: ThemePreference;
  verseSaveAdjustments: Record<string, number>;
  siteBanner: SiteBannerState;
  collectionReviewMessage: string | null;
  reviewReference: boolean;
  verseOfDay: UserVerse | null;

  getHomePageStats: (user: User) => void;
  setUser: (user: User) => void;
  addCollection: (newCollection: Collection) => void;
  removeCollection: (id: number) => void;
  updateCollection: (updated: Collection) => void;
  setLoginInfo: (info: loginInfo) => void;
  setShowStreakOnHomepage?: (show: boolean) => void;
  setSendStreakNotifications?: (send: boolean) => void;
  setSendVerseOfDayNotifications?: (send: boolean) => void;
  setShouldReloadPracticeList: (should: boolean) => void;
  setNewCollection: (collection: Collection) => void;
  addUserVerseToCollection: (userVerse: UserVerse) => void;
  resetNewCollection: () => void;
  setCollections: (collections: Collection[]) => void;
  setCollectionsSheetControls: (controls: CollectionSheetControls) => void;
  setEditingCollection: (collection: Collection | undefined) => void;
  setPublishingCollection: (collection: Collection | undefined) => void;
  setEditingUserVerse: (userVerse: UserVerse | undefined) => void;
  setSelectedUserVerse: (userVerse: UserVerse | undefined) => void;
  setNumNotifications?: (count: number) => void;
  setPopularSearches: (searches: string[]) => void;
  setProfileCache: (patch: Partial<ProfileCache>) => void;
  resetProfileCache: () => void;
  setProfileDrawerControls: (controls: ProfileDrawerControls) => void;
  setThemePreference: (preference: ThemePreference) => void;
  incrementVerseSaveAdjustment: (reference: string, amount?: number) => void;
  resetVerseSaveAdjustment: (reference?: string) => void;
  setSiteBanner: (banner: SiteBannerState) => void;
  setCollectionReviewMessage: (message: string | null) => void;
  setVerseOfDay: (verseOfDay: UserVerse | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
    user: loggedOutUser,
    collections: defaultCollections,
    loginInfo: emptyLoginInfo,
    homePageStats: { totalMemorized: 0, overdue: 0, published: 0 },
    showStreakOnHomepage: true,
    sendStreakNotifications: true,
    sendVerseOfDayNotifications: true,
    shouldReloadPracticeList: false,
    newCollection: cloneCollection(emptyNewCollection),
    editingCollection: undefined,
    publishingCollection: undefined,
    editingUserVerse: undefined,
    selectedUserVerse: undefined,
    numNotifications: 0,
    collectionsSheetControls: defaultCollectionsSheetControls,
    popularSearches: [],
    profileCache: { ...defaultProfileCache, activity: [] },
    profileDrawerControls: defaultProfileDrawerControls,
    themePreference: 'system',
    verseSaveAdjustments: {},
    siteBanner: defaultSiteBanner,
    collectionReviewMessage: null,
    reviewReference: true,
    verseOfDay: null,

    getHomePageStats: async (user: User) => {
        // Get from API verses memorized, overdue, and published
    },
    setUser: (newUser: User) => set((state) => ({
        user: newUser
    })),
    addCollection: (newCollection: Collection) => set((state: { collections: Collection[] }) => ({collections: [...state.collections, newCollection]})),
    removeCollection: (id: number) => set((state: { collections: Collection[] }) => ({collections: state.collections.filter((c) => c.collectionId !== id)})),
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
    setNewCollection: (collection: Collection) => set({newCollection: cloneCollection(collection)}),
    addUserVerseToCollection: (userVerse: UserVerse) =>
    set((state) => {
        const existingUserVerses = state.newCollection?.userVerses || [];
        const updatedUserVerses = [...existingUserVerses, userVerse];
        const verseOrder = updatedUserVerses
            .map((uv) => uv.readableReference?.trim())
            .filter((ref): ref is string => Boolean(ref && ref.length > 0))
            .join(',');

        return {
            newCollection: {
                ...state.newCollection!,
                userVerses: updatedUserVerses,
                verseOrder,
            },
        };
    }),
    resetNewCollection: () =>
        set(() => ({
            newCollection: cloneCollection(emptyNewCollection)
        })),
    setCollections: (collections) => {
        set((state) => ({
            collections: collections
        }))
    },
    setCollectionsSheetControls: (controls: CollectionSheetControls) => set({collectionsSheetControls: controls}),
    setEditingCollection: (collection: Collection | undefined) => set({editingCollection: collection ? cloneCollection(collection) : undefined}),
    setPublishingCollection: (collection: Collection | undefined) => set({publishingCollection: collection ? cloneCollection(collection) : undefined}),
    setEditingUserVerse: (userVerse: UserVerse | undefined) => set({editingUserVerse: userVerse}),
    setSelectedUserVerse: (userVerse: UserVerse | undefined) => set({selectedUserVerse: userVerse}),
    setNumNotifications: (count: number) => set({numNotifications: count}),
    setShouldReloadPracticeList: (should: boolean) => set({shouldReloadPracticeList: should}),
    setPopularSearches: (searches: string[]) => set({popularSearches: searches}),
    setProfileCache: (patch: Partial<ProfileCache>) => set((state) => ({
        profileCache: {
            ...state.profileCache,
            ...patch,
        },
    })),
    resetProfileCache: () => set({
        profileCache: { ...defaultProfileCache, activity: [] },
    }),
    setProfileDrawerControls: (controls: ProfileDrawerControls) => set({ profileDrawerControls: controls }),
    setThemePreference: (preference: ThemePreference) => set({ themePreference: preference }),
    incrementVerseSaveAdjustment: (reference: string, amount = 1) => set((state) => {
        if (!reference) {
            return {};
        }
        const current = state.verseSaveAdjustments[reference] ?? 0;
        return {
            verseSaveAdjustments: {
                ...state.verseSaveAdjustments,
                [reference]: current + amount,
            },
        };
    }),
    resetVerseSaveAdjustment: (reference?: string) => {
        if (!reference) {
            set({ verseSaveAdjustments: {} });
            return;
        }

        set((state) => {
            if (!(reference in state.verseSaveAdjustments)) {
                return {};
            }
            const next = { ...state.verseSaveAdjustments };
            delete next[reference];
            return { verseSaveAdjustments: next };
        });
    },
    setSiteBanner: (banner: SiteBannerState) => set({ siteBanner: banner }),
    setCollectionReviewMessage: (message: string | null) => set({ collectionReviewMessage: message }),
    setReviewReference: (shouldReview: boolean) => set({reviewReference: shouldReview}),
    setVerseOfDay: (verseOfDay: UserVerse | null) => set({ verseOfDay }),
}))