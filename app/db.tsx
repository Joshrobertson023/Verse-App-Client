import { Collection, SearchData, User, UserVerse, Verse } from "./store";

const baseUrl = 'http://10.222.147.121:5160'

export default async function checkUsernameAvailable(username: string): Promise<boolean> {
    try {
        const response = await fetch(`${baseUrl}/users/${username}`);
        if (response.ok) {
            return false;
        }
        return true;
    } catch (error) {
        throw error;
    }
}

export async function createUser(newUser: User): Promise<void> {
    try {
        console.log('Creating user:', newUser);
        const response = await fetch(`${baseUrl}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newUser),
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to create user');
        }
    }
    catch (error) {
        throw error;
    }
}

export async function loginUser(user: User): Promise<User> {
    try {
        const response = await fetch(`${baseUrl}/users/${user.username}`);
        if (response.ok) {
            const loggedInUser: User = await response.json();
            return loggedInUser;
        } else {
            throw new Error('Login failed');
        }
    } catch (error) {
        throw error;
    }
}

export async function refreshUser(username: string): Promise<User> {
    try {
        const response = await fetch(`${baseUrl}/users/${username}`);
        if (response.ok) {
            const user: User = await response.json();
            return user;
        } else {
            throw new Error('Failed to refresh user');
        }
    } catch (error) {
        throw error;
    }
}

export async function loginUserWithToken(token: string): Promise<User> {
    try {
        const response = await fetch(`${baseUrl}/users/token/${token}`);
        if (response.ok) {
            const loggedInUser: User = await response.json();
            return loggedInUser;
        } else {
            const responseText = await response.text();
            throw new Error('Login with token failed' + responseText);
        }
    } catch (error) {
        throw error;
    }
}

export async function getUserPasswordHash(username: string): Promise<string | null> {
    try {
        const response = await fetch(`${baseUrl}/users/password/${username}`);
        if (response.ok) {
            const data = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to fetch password hash');
        }
    } catch (error) {
        throw error;
    }
}

export async function getVerseSearchResult(search: string): Promise<SearchData> {
    try {
        const response = await fetch(`${baseUrl}/verses/search/${search}`);
        if (response.ok) {
            const data: SearchData = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to fetch search results');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getMostRecentCollectionId(username: string): Promise<number> {
    try {
        const newCollectionReponse = await fetch(`${baseUrl}/collections/mostrecent/${username}`);
                if (newCollectionReponse.ok) {
            const data: number = await newCollectionReponse.json();
            console.log('\n\n\n' + data + '\n\n\n')
            return data;
        } else {
            const responseText = await newCollectionReponse.text();
            throw new Error(responseText || 'Failed to fetch search results');
        }
    } catch (error) {
        alert(error);
        throw error;
    }
}

export async function createCollectionDB(collection: Collection, username: string) {
    try {
        console.log('creating collection: ' + collection);
        const response = await fetch(`${baseUrl}/collections`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(collection),
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to create collection');
        }
    } catch (error) {
        alert(error);
        throw error;
    }
}

export async function addUserVersesToNewCollection(userVerses: UserVerse[], collectionId: number) {
    try {
        const response = await fetch(`${baseUrl}/userverses/newcollection/${collectionId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userVerses),
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to create user');
        }
    }
    catch (error) {
        throw error;
    }
}

export async function getUserVersesByCollectionWithVerses(collectionId: number): Promise<UserVerse[]> {
    try {
        const response = await fetch(`${baseUrl}/userverses/collection/${collectionId}`);
        if (response.ok) {
            const data: UserVerse[] = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to fetch user verses');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getCollectionById(collectionId: number): Promise<Collection> {
    try {
        const response = await fetch(`${baseUrl}/collections/byId/${collectionId}`);
        if (response.ok) {
            const data: Collection = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to fetch collection');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function incrementCollectionSaves(collectionId: number): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/collections/userSaved`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(collectionId),
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to increment collection saves');
        }
    } catch (error) {
        console.error('Failed to increment collection saves:', error);
        throw error;
    }
}

export async function getUserCollections(username: string): Promise<Collection[]> {
    try {
        const response = await fetch(`${baseUrl}/collections/all/${username}`);
        if (response.ok) {
            const data: Collection[] = await response.json();
            // Map the data and add the 'favorites' property based on title
            const mappedData = data.map(collection => ({
                ...collection,
                favorites: collection.title === 'Favorites',
                userVerses: collection.userVerses || [],
            }));
            return mappedData;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to fetch user collections');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getUserPublicCollections(username: string): Promise<Collection[]> {
    try {
        const response = await fetch(`${baseUrl}/collections/public/${username}`);
        if (response.ok) {
            const data: Collection[] = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to fetch public collections');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getUserFriendCollections(username: string, viewerUsername: string): Promise<Collection[]> {
    try {
        const response = await fetch(`${baseUrl}/collections/friend/${username}?viewerUsername=${viewerUsername}`);
        if (response.ok) {
            const data: Collection[] = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to fetch friend collections');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getPopularPublishedCollections(top: number = 20): Promise<Collection[]> {
    try {
        const response = await fetch(`${baseUrl}/collections/published/popular?top=${top}`);
        if (response.ok) {
            const data: Collection[] = await response.json();
            return data.map(c => ({ ...c, userVerses: c.userVerses || [] }));
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to fetch popular collections');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getRecentPublishedCollections(top: number = 20): Promise<Collection[]> {
    try {
        const response = await fetch(`${baseUrl}/collections/published/recent?top=${top}`);
        if (response.ok) {
            const data: Collection[] = await response.json();
            return data.map(c => ({ ...c, userVerses: c.userVerses || [] }));
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to fetch recent collections');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export interface Category { category_Id: number; name: string }

export async function getAllCategories(): Promise<Category[]> {
    try {
        const response = await fetch(`${baseUrl}/categories`);
        if (!response.ok) throw new Error(await response.text());
        const data: Category[] = await response.json();
        return data;
    } catch (e) {
        console.error(e);
        throw e;
    }
}

export async function createCategory(name: string): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/categories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        if (!response.ok) throw new Error(await response.text());
    } catch (e) {
        console.error(e);
        throw e;
    }
}

export async function deleteCategory(categoryId: number): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/categories/${categoryId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error(await response.text());
    } catch (e) {
        console.error(e);
        throw e;
    }
}

export async function getCollectionsByCategory(categoryId: number): Promise<Collection[]> {
    try {
        const response = await fetch(`${baseUrl}/categories/${categoryId}/collections`);
        if (!response.ok) throw new Error(await response.text());
        const data: Collection[] = await response.json();
        return data.map(c => ({ ...c, userVerses: c.userVerses || [] }));
    } catch (e) {
        console.error(e);
        throw e;
    }
}

export async function publishCollection(collectionId: number, description: string | undefined, categoryIds: number[]): Promise<void> {
    const body = { description: description || null, categoryIds };
    const response = await fetch(`${baseUrl}/collections/${collectionId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error(await response.text());
}

export async function unpublishCollection(collectionId: number): Promise<void> {
    const response = await fetch(`${baseUrl}/collections/${collectionId}/publish`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error(await response.text());
}

export async function getPublishedInfo(collectionId: number): Promise<{ collection_Id: number, description?: string, published_At: string } | null> {
    const response = await fetch(`${baseUrl}/collections/${collectionId}/publish`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(await response.text());
    return await response.json();
}

export async function getCategoryIdsForCollection(collectionId: number): Promise<number[]> {
    const response = await fetch(`${baseUrl}/collections/${collectionId}/categories`);
    if (!response.ok) throw new Error(await response.text());
    return await response.json();
}

export async function notifyAuthorCollectionSaved(saverUsername: string, collectionId: number): Promise<void> {
    const response = await fetch(`${baseUrl}/notifications/saved-published`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saverUsername, collectionId })
    });
    if (!response.ok) throw new Error(await response.text());
}

export async function getFriendCollectionWithVerses(collectionId: number): Promise<Collection> {
    try {
        const response = await fetch(`${baseUrl}/collections/friend/${collectionId}/verses`);
        if (response.ok) {
            const data: Collection = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to fetch friend collection verses');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getUserVersesPopulated(collection: Collection | undefined): Promise<Collection> {
    try {
        const response = await fetch(`${baseUrl}/collections/get`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(collection)});
        if (response.ok) {
            const data: Collection = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to fetch collection');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function deleteCollection(collection: Collection | undefined) {
    try {
        const response = await fetch(`${baseUrl}/collections/${collection?.collectionId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(collection),
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to delete collection');
        }
    }
    catch (error) {
        throw error;
    }
}

export async function updateCollectionsOrder(order: string, username: string) {
    try {
        const response = await fetch(`${baseUrl}/users/order/${username}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(order),
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to update collections order');
        }
    }
    catch (error) {
        throw error;
    }
}

export async function updateCollectionsSortBy(sortBy: number, username: string) {
    try {
        const response = await fetch(`${baseUrl}/users/sortby/${username}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(sortBy),
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to update collections sort by');
        }
    }
    catch (error) {
        throw error;
    }
}

export async function updateUserProfile(user: User) {
    try {
        const response = await fetch(`${baseUrl}/users`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(user),
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to update user profile');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function searchUsers(query: string): Promise<User[]> {
    try {
        const response = await fetch(`${baseUrl}/users/search/${encodeURIComponent(query)}`);
        if (response.ok) {
            const data: User[] = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to search users');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function sendFriendRequest(fromUsername: string, toUsername: string) {
    try {
        const response = await fetch(`${baseUrl}/relationships/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fromUsername, toUsername })
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to send friend request');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function checkRelationship(username1: string, username2: string): Promise<number> {
    try {
        const response = await fetch(`${baseUrl}/relationships/check/${username1}/${username2}`);
        if (response.ok) {
            const data = await response.json();
            return data.relationship || -1; // -1 means no relationship
        } else {
            return -1;
        }
    } catch (error) {
        console.error(error);
        return -1;
    }
}

export async function respondToFriendRequest(requesterUsername: string, recipientUsername: string, accept: boolean) {
    try {
        const response = await fetch(`${baseUrl}/relationships/respond`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ requesterUsername, recipientUsername, accept })
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to respond to friend request');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getFriends(username: string): Promise<User[]> {
    try {
        const response = await fetch(`${baseUrl}/relationships/friends/${username}`);
        if (response.ok) {
            const data: User[] = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to get friends');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getUserProfile(username: string): Promise<User> {
    try {
        const response = await fetch(`${baseUrl}/users/${username}`);
        if (response.ok) {
            const data: User = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to get user profile');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function removeFriend(username1: string, username2: string): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/relationships/${encodeURIComponent(username1)}/${encodeURIComponent(username2)}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to remove friend');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function submitUserReport(reporterUsername: string, reportedUsername: string, reason: string): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/reports`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reporterUsername, reportedUsername, reason })
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to submit report');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function submitBugReport(reporterUsername: string, reason: string): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/reports`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reporterUsername, reportedUsername: 'SYSTEM', reason })
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to submit bug report');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export interface ReportItem {
    report_Id: number;
    reporter_Username: string;
    reported_Username: string;
    reported_Email: string;
    reportReason: string;
    created_Date: string;
}

export async function getAllReports(): Promise<ReportItem[]> {
    try {
        const response = await fetch(`${baseUrl}/reports`);
        if (response.ok) {
            const data: ReportItem[] = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to fetch reports');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function deleteReport(reportId: number): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/reports/${reportId}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to delete report');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function updateCollectionDB(collection: Collection) {
    try {
        const response = await fetch(`${baseUrl}/collections`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(collection),
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to update collection');
        }
    } catch (error) {
        alert(error);
        throw error;
    }
}

export async function deleteUserVersesFromCollection(collectionId: number) {
    try {
        const response = await fetch(`${baseUrl}/userverses/collection/${collectionId}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to delete user verses');
        }
    } catch (error) {
        throw error;
    }
}

export async function updateUserVerse(userVerse: UserVerse) {
    try {
        const response = await fetch(`${baseUrl}/userverses`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userVerse),
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to update user verse');
        }
    } catch (error) {
        throw error;
    }
}

export async function getAllUserVerses(username: string): Promise<UserVerse[]> {
    try {
        const response = await fetch(`${baseUrl}/userverses/user/${username}`);
        if (response.ok) {
            const data: UserVerse[] = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to fetch all user verses');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

// Helper function to parse readableReference and extract book, chapter, and verse numbers
function parseReference(reference: string): { book: string; chapter: number; verses: number[] } | null {
    // Remove extra spaces and normalize
    reference = reference.trim().replace(/\s+/g, ' ');
    
    const match = reference.match(/^([\dA-Za-z\s]+)\s+(\d+):([\d\-\,\s]+)$/);
    if (!match) return null;
    
    const book = match[1].trim();
    const chapter = parseInt(match[2]);
    const versePart = match[3].trim();
    
    const verses: number[] = [];
    const segments = versePart.split(',');
    
    for (const seg of segments) {
        const part = seg.trim();
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(v => parseInt(v.trim()));
            if (!isNaN(start) && !isNaN(end)) {
                for (let v = start; v <= end; v++) {
                    verses.push(v);
                }
            }
        } else {
            const verse = parseInt(part);
            if (!isNaN(verse)) {
                verses.push(verse);
            }
        }
    }
    
    return { book, chapter, verses };
}

export async function populateVersesForUserVerses(userVerses: UserVerse[]): Promise<UserVerse[]> {
    try {
        const response = await fetch(`${baseUrl}/userverses/populate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userVerses)
        });
        if (response.ok) {
            const data: UserVerse[] = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to populate user verses');
        }
    } catch (error) {
        console.error('Failed to populate verses for user verses:', error);
        throw error;
    }
}

export async function incrementVerseMemorized(reference: string): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/verses/memorized/${encodeURIComponent(reference)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to increment verse memorized count');
        }
    } catch (error) {
        console.error('Failed to increment verse memorized:', error);
        throw error;
    }
}

export async function getChapterVerses(book: string, chapter: number): Promise<Verse[]> {
    try {
        const response = await fetch(`${baseUrl}/verses/chapter/${book}/${chapter}`);
        if (response.ok) {
            const data: Verse[] = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to fetch chapter verses');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getTopSavedVerses(top: number = 20): Promise<Verse[]> {
    try {
        const response = await fetch(`${baseUrl}/verses/top/saved?top=${top}`);
        if (response.ok) {
            const data: Verse[] = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to fetch top saved verses');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getTopMemorizedVerses(top: number = 20): Promise<Verse[]> {
    try {
        const response = await fetch(`${baseUrl}/verses/top/memorized?top=${top}`);
        if (response.ok) {
            const data: Verse[] = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to fetch top memorized verses');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function insertUserVerse(userVerse: UserVerse) {
    try {
        const response = await fetch(`${baseUrl}/userverses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userVerse),
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to insert user verse');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function recordPractice(username: string): Promise<number> {
    try {
        const response = await fetch(`${baseUrl}/practice/record/${username}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        if (response.ok) {
            const data: { streakLength: number } = await response.json();
            return data.streakLength;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to record practice');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getStreakLength(username: string): Promise<number> {
    try {
        const response = await fetch(`${baseUrl}/practice/streak/${username}`);
        if (response.ok) {
            const data: { streakLength: number } = await response.json();
            return data.streakLength;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to get streak length');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getPracticeHistory(username: string): Promise<string[]> {
    try {
        const response = await fetch(`${baseUrl}/practice/history/${username}`);
        if (response.ok) {
            const data: string[] = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to get practice history');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getUserNotifications(username: string) {
    try {
        const response = await fetch(`${baseUrl}/notifications/${username}`);
        if (response.ok) {
            const data = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to get notifications');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getUserNotificationsPaged(
    username: string,
    limit: number = 10,
    cursorCreated?: string,
    cursorId?: number
) {
    try {
        const params = new URLSearchParams();
        params.set('limit', String(limit));
        if (cursorCreated && cursorId != null) {
            params.set('cursorCreated', cursorCreated);
            params.set('cursorId', String(cursorId));
        }
        const response = await fetch(`${baseUrl}/notifications/${encodeURIComponent(username)}/paged?${params.toString()}`);
        if (response.ok) {
            const data = await response.json();
            return data as { items: any[]; nextCursorCreated: string | null; nextCursorId: number | null };
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to get notifications (paged)');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function markNotificationAsRead(notificationId: number) {
    try {
        const response = await fetch(`${baseUrl}/notifications/read/${notificationId}`, {
            method: 'POST',
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to mark notification as read');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function markAllNotificationsAsRead(username: string) {
    try {
        const response = await fetch(`${baseUrl}/notifications/readall/${username}`, {
            method: 'POST',
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to mark all notifications as read');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getUnreadNotificationCount(username: string): Promise<number> {
    try {
        const response = await fetch(`${baseUrl}/notifications/count/${username}`);
        if (response.ok) {
            const data = await response.json();
            return data.count;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to get notification count');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getAllUsers(search?: string) {
    try {
        const url = search ? `${baseUrl}/admin/users?search=${encodeURIComponent(search)}` : `${baseUrl}/admin/users`;
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to get users');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function sendNotificationToAll(message: string, senderUsername: string) {
    try {
        const response = await fetch(`${baseUrl}/admin/notifications/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message, senderUsername })
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to send notification');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function createVerseOfDay(reference: string, senderUsername: string) {
    try {
        const response = await fetch(`${baseUrl}/admin/verseofday`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ readableReference: reference, senderUsername })
        });
        if (!response.ok) {
            let errorMessage = 'Failed to create verse of day';
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } else {
                const responseText = await response.text();
                errorMessage = responseText || errorMessage;
            }
            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function deleteVerseOfDay(id: number, username: string) {
    try {
        const response = await fetch(`${baseUrl}/admin/verseofday/${id}?username=${encodeURIComponent(username)}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to delete verse of day');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getUpcomingVerseOfDay() {
    try {
        const response = await fetch(`${baseUrl}/admin/verseofday/upcoming`);
        if (response.ok) {
            const data = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to get verse of day');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function checkIfAdmin(username: string): Promise<boolean> {
    try {
        const response = await fetch(`${baseUrl}/admin/users/${username}/check`);
        if (response.ok) {
            const data = await response.json();
            return data.isAdmin;
        } else {
            return false;
        }
    } catch (error) {
        console.error(error);
        return false;
    }
}

export async function updateSubscribedVerseOfDay(username: string, subscribed: boolean): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/users/subscribedVerseOfDay/${username}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(subscribed)
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to update subscription');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function makeUserAdmin(username: string): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/admin/users/${username}/make-admin`, {
            method: 'PUT',
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to make user admin');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function removeUserAdmin(username: string): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/admin/users/${username}/remove-admin`, {
            method: 'PUT',
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to remove admin');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function updatePushNotifications(username: string, enabled: boolean): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/users/pushNotifications/${username}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(enabled)
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to update push notifications');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function updateActivityNotifications(username: string, enabled: boolean): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/users/activityNotifications/${username}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(enabled)
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to update activity notifications');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function deleteUser(username: string): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/users/${username}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to delete user');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function updateLastSeen(username: string): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/users/setAsActive/${username}`, {
            method: 'PUT',
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to update last seen');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function incrementVersesMemorized(username: string): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/users/incrementVersesMemorized/${username}`, {
            method: 'PUT',
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to increment verses memorized');
        }
    } catch (error) {
        console.error('Failed to increment verses memorized:', error);
        throw error;
    }
}

export async function expireNotification(notificationId: number): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/notifications/expire/${notificationId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to expire notification');
        }
    } catch (error) {
        console.error('Failed to expire notification:', error);
        throw error;
    }
}

export async function trackSearch(searchTerm: string): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/searches/track?searchTerm=${encodeURIComponent(searchTerm)}`, {
            method: 'POST',
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to track search');
        }
    } catch (error) {
        console.error('Failed to track search:', error);
        // Don't throw, just log - search tracking should not block the user
    }
}

export async function getPopularSearches(limit: number = 10): Promise<string[]> {
    try {
        const response = await fetch(`${baseUrl}/searches/popular?limit=${limit}`);
        if (response.ok) {
            const data: string[] = await response.json();
            return data;
        } else {
            return [];
        }
    } catch (error) {
        console.error('Failed to get popular searches:', error);
        return [];
    }
}

export async function shareCollection(fromUsername: string, toUsername: string, collectionId: number): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/notifications/share-collection`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fromUsername,
                toUsername,
                collectionId
            }),
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to share collection');
        }
    } catch (error) {
        console.error('Failed to share collection:', error);
        throw error;
    }
}

export async function shareVerse(fromUsername: string, toUsername: string, readableReference: string): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/notifications/share-verse`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fromUsername, toUsername, readableReference })
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to share verse');
        }
    } catch (error) {
        console.error('Failed to share verse:', error);
        throw error;
    }
}