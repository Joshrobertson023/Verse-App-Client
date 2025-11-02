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

export async function getMemorizedUserVerses(username: string): Promise<UserVerse[]> {
    try {
        const response = await fetch(`${baseUrl}/userverses/memorized/${username}`);
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

export async function getUnpopulatedMemorizedUserVerses(username: string): Promise<UserVerse[]> {
    try {
        const response = await fetch(`${baseUrl}/userverses/memorized/unpopulated/${username}`);
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

export async function getUserVersesInProgress(username: string): Promise<UserVerse[]> {
    try {
        const response = await fetch(`${baseUrl}/userverses/inprogress/${username}`);
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

export async function getUserVersesNotStarted(username: string): Promise<UserVerse[]> {
    try {
        const response = await fetch(`${baseUrl}/userverses/notstarted/${username}`);
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

export async function populateVersesForUserVerses(userVerses: UserVerse[]): Promise<UserVerse[]> {
    try {
        const response = await fetch(`${baseUrl}/userverses/populate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userVerses),
        });
        if (response.ok) {
            const data: UserVerse[] = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to populate verses for user verses');
        }
    } catch (error) {
        console.error(error);
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

export async function getUserNotificationsTop(username: string, page: number) {
    try {
        const params = new URLSearchParams();
        if (page !== undefined) {
            params.append('pageSize', page.toString());
        }

        const queryString = params.toString();
        const response = await fetch(`${baseUrl}/notifications/${username}/paged?${queryString}`);
        if (response.ok) {
            const data = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to get notifications paged');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getUserNotificationsPaged(username: string, page: number, nextCursorId: number) {
    try {
        const params = new URLSearchParams();
        if (page !== undefined) {
            params.append('pageSize', page.toString());
        }
        if (nextCursorId !== undefined) {
            params.append('cursorId', nextCursorId.toString());
        }

        const queryString = params.toString();
        const response = await fetch(`${baseUrl}/notifications/${username}/paged?${queryString}`);
        if (response.ok) {
            const data = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to get notifications paged');
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