import { Activity, Collection, SearchData, User, UserVerse, Verse } from "./store";

const baseUrl = 'https://verseappnewserver-app-2025111008.agreeablestone-f22c316f.eastus.azurecontainerapps.io'
//const baseUrl = 'https://10.154.116.121:8080'

const normalizeUser = <T extends Partial<User> & Record<string, any>>(user: T): T & { isAdmin?: boolean } => {
    if (!user) {
        return user;
    }
    const rawValue = user.isAdmin ?? user.IsAdmin;
    const normalizedIsAdmin = rawValue === true || rawValue === 'true'
        ? true
        : rawValue === false || rawValue === 'false'
            ? false
            : typeof rawValue === 'number'
                ? rawValue === 1
                : Boolean(rawValue);

    const rawPoints = user.points ?? user.Points;
    const normalizedPoints =
        typeof rawPoints === 'number'
            ? rawPoints
            : typeof rawPoints === 'string'
                ? Number.parseInt(rawPoints, 10) || 0
                : 0;

    const rawHasShownBibleHelp = user.hasShownBibleHelp ?? user.HasShownBibleHelp;
    const normalizedHasShownBibleHelp = rawHasShownBibleHelp === true || rawHasShownBibleHelp === 'true'
        ? true
        : rawHasShownBibleHelp === false || rawHasShownBibleHelp === 'false'
            ? false
            : typeof rawHasShownBibleHelp === 'number'
                ? rawHasShownBibleHelp === 1
                : Boolean(rawHasShownBibleHelp);

    // Normalize profile picture URL - convert relative URLs to absolute
    const rawProfilePictureUrl = user.profilePictureUrl ?? user.ProfilePictureUrl;
    let normalizedProfilePictureUrl = rawProfilePictureUrl;
    if (normalizedProfilePictureUrl && !normalizedProfilePictureUrl.startsWith('http')) {
        normalizedProfilePictureUrl = `${baseUrl}${normalizedProfilePictureUrl.startsWith('/') ? '' : '/'}${normalizedProfilePictureUrl}`;
    }

    return {
        ...user,
        isAdmin: normalizedIsAdmin,
        points: normalizedPoints,
        hasShownBibleHelp: normalizedHasShownBibleHelp,
        profilePictureUrl: normalizedProfilePictureUrl,
    };
};

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
            const loggedInUser = normalizeUser(await response.json());
            try {
                loggedInUser.isAdmin = await checkIfAdmin(loggedInUser.username);
            } catch (error) {
                console.error('Failed to check admin status:', error);
            }
            return loggedInUser as User;
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
            const user = normalizeUser(await response.json());
            try {
                user.isAdmin = await checkIfAdmin(user.username);
            } catch (error) {
                console.error('Failed to check admin status:', error);
            }
            return user as User;
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
            const loggedInUser = normalizeUser(await response.json());
            try {
                loggedInUser.isAdmin = await checkIfAdmin(loggedInUser.username);
            } catch (error) {
                console.error('Failed to check admin status:', error);
            }
            return loggedInUser as User;
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

export async function requestUsernameReminder(firstName: string, lastName: string, email: string): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/users/forgot-username`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstName, lastName, email }),
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('No usernames found matching the provided details.');
            }

            const responseText = await response.text();
            throw new Error(responseText || 'Failed to send username reminder.');
        }
    } catch (error) {
        throw error;
    }
}

export async function requestPasswordResetOtp(username: string, email: string): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/users/forgot-password/request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email }),
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('No account matches the provided username and email.');
            }

            const responseText = await response.text();
            throw new Error(responseText || 'Failed to send password reset code.');
        }
    } catch (error) {
        throw error;
    }
}

export interface VerifyOtpResponse {
    valid: boolean;
    reason?: 'invalid' | 'expired';
}

export async function verifyPasswordResetOtp(username: string, otp: string): Promise<VerifyOtpResponse> {
    try {
        const response = await fetch(`${baseUrl}/users/forgot-password/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, otp }),
        });

        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to verify password reset code.');
        }

        return await response.json();
    } catch (error) {
        throw error;
    }
}

export async function resetPasswordWithOtp(username: string, otp: string, newPassword: string): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/users/forgot-password/reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, otp, newPassword }),
        });

        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to reset password.');
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

export async function getVersesInCategory(categoryId: number, top: number): Promise<Verse[]> {
    try {
        const response = await fetch(`${baseUrl}/categories/verses/${categoryId}/${top}`);
        if (response.ok) {
            const data: Verse[] = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || `Failed to fetch verses in category: ${categoryId}`);
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
        const payload: Collection = {
            ...collection,
            authorUsername: collection.authorUsername ?? username,
            username,
        };

        const response = await fetch(`${baseUrl}/collections`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to create collection');
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create collection';
        alert(message);
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
        const response = await fetch(`${baseUrl}/collections/get`);
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

export async function getCollection(collection: Collection): Promise<Collection> {
    try {
        const response = await fetch(`${baseUrl}/collections/byId/${collection.id}`);
        if (response.ok) {
            const data: Collection = await response.json();
            return data;
            //         const response = await fetch(`${baseUrl}/collections/get`, {
            // method: 'POST',
            // headers: {
            //     'Content-Type': 'application/json',
            // },
            // body: JSON.stringify(collection)});
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to fetch collection');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getCollectionById(collectionId: number): Promise<Collection | null> {
    try {
        const response = await fetch(`${baseUrl}/collections/byId/${collectionId}`);
        if (response.ok) {
            const data: Collection = await response.json();
            return data;
        }

        if (response.status === 404) {
            return null;
        }

        const responseText = await response.text();
        throw new Error(responseText || 'Failed to fetch collection');
    } catch (error) {
        const message = (error as Error)?.message?.toLowerCase() ?? '';
        if (
            message.includes('failed to fetch collection') ||
            message.includes('not found') ||
            message.includes('does not exist')
        ) {
            return null;
        }

        console.error(error);
        throw error;
    }
}

export async function getCollectionByPublishedId(publishedId: number): Promise<Collection | null> {
    try {
        const response = await fetch(`${baseUrl}/collections/published/${publishedId}/source`);
        if (response.ok) {
            const data: Collection = await response.json();
            return data;
        }

        if (response.status === 404) {
            return null;
        }

        const responseText = await response.text();
        throw new Error(responseText || 'Failed to fetch collection');
    } catch (error) {
        const message = (error as Error)?.message?.toLowerCase() ?? '';
        if (
            message.includes('failed to fetch collection') ||
            message.includes('not found') ||
            message.includes('does not exist')
        ) {
            return null;
        }

        console.error(error);
        throw error;
    }
}

export async function getUserCollections(username: string): Promise<Collection[]> {
    try {
        const response = await fetch(`${baseUrl}/collections/all/${username}`);
        if (response.ok) {
            const data: Collection[] = await response.json();
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

export async function getFriendCollectionWithVerses(collectionId: number, viewerUsername?: string): Promise<Collection> {
    try {
        const query = viewerUsername ? `?viewerUsername=${encodeURIComponent(viewerUsername)}` : '';
        const response = await fetch(`${baseUrl}/collections/friend/${collectionId}/verses${query}`);
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

export async function uploadProfilePicture(username: string, imageUri: string): Promise<string> {
    try {
        const formData = new FormData();
        
        // Get file name from URI
        const filename = imageUri.split('/').pop() || 'profile.jpg';
        
        // Determine content type from file extension
        let type = 'image/jpeg'; // default
        const match = /\.(\w+)$/.exec(filename.toLowerCase());
        if (match) {
            const ext = match[1].toLowerCase();
            switch (ext) {
                case 'jpg':
                case 'jpeg':
                    type = 'image/jpeg';
                    break;
                case 'png':
                    type = 'image/png';
                    break;
                case 'gif':
                    type = 'image/gif';
                    break;
                case 'webp':
                    type = 'image/webp';
                    break;
                default:
                    type = 'image/jpeg';
            }
        }
        
        // React Native FormData format
        formData.append('file', {
            uri: imageUri,
            name: filename,
            type: type,
        } as any);

        const response = await fetch(`${baseUrl}/users/profile-picture/${username}`, {
            method: 'POST',
            body: formData,
            // Don't set Content-Type header - let fetch set it with boundary
        });

        if (!response.ok) {
            const responseText = await response.text();
            console.error('Profile picture upload failed:', response.status, responseText);
            throw new Error(responseText || `Failed to upload profile picture (${response.status})`);
        }

        const result = await response.json();
        // Return full URL
        const profilePictureUrl = result.profilePictureUrl;
        if (profilePictureUrl && !profilePictureUrl.startsWith('http')) {
            return `${baseUrl}${profilePictureUrl.startsWith('/') ? '' : '/'}${profilePictureUrl}`;
        }
        return profilePictureUrl || '';
    } catch (error) {
        console.error('Error uploading profile picture:', error);
        throw error;
    }
}

export async function deleteProfilePicture(username: string): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/users/profile-picture/${username}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to delete profile picture');
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
            // Cache profile pictures for search results (low quality for list view)
            const { cacheProfilePictures } = await import('./utils/profilePictureCache');
            await cacheProfilePictures(data, true);
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
            // Cache profile pictures for friends (low quality for list view)
            const { cacheProfilePictures } = await import('./utils/profilePictureCache');
            await cacheProfilePictures(data, true);
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

export async function getFriendNames(username: string): Promise<User[]> {
    try {
        const response = await fetch(`${baseUrl}/relationships/friends/${username}/names`);
        if (response.ok) {
            const data: User[] = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to get friend names');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function removeFriend(username: string, friendUsername: string): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/relationships/${username}/${friendUsername}`, {
            method: 'DELETE',
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
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ reporterUsername, reportedUsername, reason }),
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

export async function submitBugReport(username: string, description: string): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/reports/bug`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, description }),
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to submit bug report');
        }
    } catch (error) {
        console.error('Failed to submit bug report:', error);
        throw error;
    }
}

export async function getAllReports(): Promise<ReportItem[]> {
    try {
        const response = await fetch(`${baseUrl}/reports`);
        if (response.ok) {
            const data: ReportItem[] = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to get reports');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function deleteReport(id: number): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/reports/${id}`, {
            method: 'DELETE',
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

export async function getLeaderboard(page: number = 1, pageSize: number = 20): Promise<User[]> {
    try {
        const response = await fetch(`${baseUrl}/leaderboard?page=${page}&pageSize=${pageSize}`);
        if (response.ok) {
            const data: User[] = await response.json();
            return data.map(user => normalizeUser(user));
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to get leaderboard');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getUserRank(username: string): Promise<number> {
    try {
        const response = await fetch(`${baseUrl}/leaderboard/rank/${encodeURIComponent(username)}`);
        if (response.ok) {
            const data: { rank: number } = await response.json();
            return data.rank;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to get user rank');
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

export async function memorizeUserVerse(userVerse: UserVerse) {
    try {
        const response = await fetch(`${baseUrl}/userverses/memorized`, {
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

export async function memorizeVerseOfDay(username: string, readableReference: string) {
    try {
        const response = await fetch(`${baseUrl}/userverses/memorize-verse-of-day`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username,
                readableReference: readableReference
            }),
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to memorize verse of day');
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

export async function deleteUserVerse(userVerse: UserVerse): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/userverses/`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userVerse),
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to delete user verse');
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
            if (Array.isArray(data)) {
                return data.map((user: any) => normalizeUser(user));
            }
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

export async function getAdminUsernames(): Promise<string[]> {
    try {
        const response = await fetch(`${baseUrl}/admin/usernames`);
        if (response.ok) {
            const data: string[] = await response.json();
            return Array.isArray(data) ? data : [];
        }

        const responseText = await response.text();
        throw new Error(responseText || 'Failed to get admin usernames');
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export interface AdminSummary {
    username: string;
    email?: string | null;
}

export async function getAdmins(): Promise<AdminSummary[]> {
    try {
        const response = await fetch(`${baseUrl}/admin/admins`);
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
                return data.map((admin: any) => ({
                    username: admin?.username ?? admin?.Username,
                    email: admin?.email ?? admin?.Email ?? null,
                }));
            }
            return [];
        }

        const responseText = await response.text();
        throw new Error(responseText || 'Failed to get admins');
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
            body: JSON.stringify({
                readableReference: reference,
                senderUsername
            })
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

export async function suggestVerseOfDay(username: string, readableReference: string): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/verseofday/suggest`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username,
                readableReference
            }),
        });

        if (!response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to submit suggestion');
            } else {
                const responseText = await response.text();
                throw new Error(responseText || 'Failed to submit suggestion');
            }
        }
    } catch (error) {
        console.error('Failed to submit verse of day suggestion:', error);
        throw error;
    }
}

export async function resetVerseOfDayQueue(username: string) {
    try {
        const response = await fetch(`${baseUrl}/admin/verseofday/reset`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                senderUsername: username
            })
        });

        if (!response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to reset verse of day queue');
            }
            const text = await response.text();
            throw new Error(text || 'Failed to reset verse of day queue');
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getCurrentVerseOfDay() {
    try {
        const response = await fetch(`${baseUrl}/verseofday/current`);
        if (response.status === 204) {
            return null;
        }

        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || 'Failed to load current verse of the day');
        }

        return await response.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getCurrentVerseOfDayAsUserVerse(): Promise<UserVerse | null> {
    try {
        const response = await fetch(`${baseUrl}/verseofday/current/userverse`);
        if (response.status === 204) {
            return null;
        }

        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || 'Failed to load current verse of the day');
        }

        return await response.json();
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
            throw new Error(responseText || 'Failed to remove user admin');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function makeUserPaid(username: string, adminUsername: string, pin: string): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/admin/users/${username}/make-paid`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ adminUsername, pin }),
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to make user paid');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function removeUserPaid(username: string, adminUsername: string, pin: string): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/admin/users/${username}/remove-paid`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ adminUsername, pin }),
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to remove paid status');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getPaidUsers(): Promise<AdminSummary[]> {
    try {
        const response = await fetch(`${baseUrl}/admin/users/paid`);
        if (response.ok) {
            const data: AdminSummary[] = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to get paid users');
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

export async function registerDevicePushToken(username: string, expoPushToken: string, platform: string): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/push-tokens`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, expoPushToken, platform }),
        });

        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to register push token');
        }
    } catch (error) {
        console.error('Failed to register push token:', error);
        throw error;
    }
}

export async function removeDevicePushToken(username: string, expoPushToken: string): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/push-tokens/${encodeURIComponent(expoPushToken)}?username=${encodeURIComponent(username)}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to remove push token');
        }
    } catch (error) {
        console.error('Failed to remove push token:', error);
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

export async function updateNotifyMemorizedVerse(username: string, enabled: boolean): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/users/notifyMemorizedVerse/${username}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(enabled)
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to update notify memorized verse setting');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function updateNotifyPublishedCollection(username: string, enabled: boolean): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/users/notifyPublishedCollection/${username}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(enabled)
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to update notify published collection setting');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function updateNotifyCollectionSaved(username: string, enabled: boolean): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/users/${encodeURIComponent(username)}/notify-collection-saved`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ enabled }),
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to update notification setting');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function updateNotifyNoteLiked(username: string, enabled: boolean): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/users/notifyNoteLiked/${username}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(enabled)
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to update notify note liked setting');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function updateBadgeNotificationsEnabled(username: string, enabled: boolean): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/users/badge-notifications/${username}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(enabled)
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to update badge notifications setting');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function updateBadgeOverdueEnabled(username: string, enabled: boolean): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/users/badge-overdue/${username}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(enabled)
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to update badge overdue setting');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function updatePracticeReminders(username: string, enabled: boolean): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/users/practice-notifications/${username}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(enabled)
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to update practice reminders setting');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function updateNotifyOfFriends(username: string, enabled: boolean): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/users/friends-activity-notifications/${username}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(enabled)
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to update friends activity notifications setting');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function updateReceiveStreakReminders(username: string, enabled: boolean): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/users/streak-reminders/${username}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(enabled)
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to update streak reminders setting');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function updateBibleVersion(username: string, bibleVersion: number): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/users/bibleVersion/${username}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bibleVersion)
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to update Bible version');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function updateUsername(oldUsername: string, newUsername: string): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/users/username/${oldUsername}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newUsername)
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to update username');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function updateEmail(username: string, newEmail: string): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/users/email/${username}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newEmail)
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to update email');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function updatePassword(username: string, newPassword: string): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/users/password/${username}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newPassword)
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to update password');
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

export interface Ban {
    banId: number;
    username: string;
    adminBanned: string;
    reason?: string;
    banDate: string;
    banExpireDate?: string;
}

export async function getActiveBan(username: string): Promise<Ban | null> {
    try {
        const response = await fetch(`${baseUrl}/bans/user/${encodeURIComponent(username)}`);
        if (response.ok) {
            const data: Ban = await response.json();
            return data;
        } else if (response.status === 404) {
            return null;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to get active ban');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function checkIfBanned(username: string): Promise<boolean> {
    try {
        const response = await fetch(`${baseUrl}/bans/check/${encodeURIComponent(username)}`);
        if (response.ok) {
            const data: { isBanned: boolean } = await response.json();
            return data.isBanned;
        } else {
            return false;
        }
    } catch (error) {
        console.error(error);
        return false;
    }
}

export async function banUser(username: string, adminBanned: string, reason?: string, banExpireDate?: string): Promise<Ban> {
    try {
        const response = await fetch(`${baseUrl}/bans`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username,
                adminBanned,
                reason,
                banExpireDate: banExpireDate ? new Date(banExpireDate).toISOString() : null
            }),
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to ban user');
        }
        const data: Ban = await response.json();
        return data;
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

export async function shareVerse(fromUsername: string, toUsername: string, verseReferences: string[]): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/notifications/share-verse`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fromUsername,
                toUsername,
                verseReferences
            }),
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

export interface VerseOfDaySuggestion {
    id: number;
    readableReference: string;
    suggesterUsername: string;
    createdDate: string;
    status: string;
}

export async function getVerseOfDaySuggestions(username: string): Promise<VerseOfDaySuggestion[]> {
    try {
        const response = await fetch(`${baseUrl}/admin/verseofday/suggestions?username=${encodeURIComponent(username)}`);
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to get suggestions');
        }
        return await response.json();
    } catch (error) {
        console.error('Failed to get verse of day suggestions:', error);
        throw error;
    }
}

export async function approveVerseOfDaySuggestion(id: number, username: string): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/admin/verseofday/suggestions/${id}/approve?username=${encodeURIComponent(username)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to approve suggestion');
            } else {
                const responseText = await response.text();
                throw new Error(responseText || 'Failed to approve suggestion');
            }
        }
    } catch (error) {
        console.error('Failed to approve suggestion:', error);
        throw error;
    }
}

export async function deleteVerseOfDaySuggestion(id: number, username: string): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/admin/verseofday/suggestions/${id}?username=${encodeURIComponent(username)}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to delete suggestion');
        }
    } catch (error) {
        console.error('Failed to delete suggestion:', error);
        throw error;
    }
}

export interface Category {
    categoryId: number,
    name: string
}

export interface ReportItem {
    report_Id: number;
    reporter_Username: string;
    reported_Username: string;
    reported_Email?: string;
    reason?: string;
    created_Date: string;
    status?: string;
}

export interface PublishedCollection {
    publishedId: number,
    description?: string | null,
    numSaves: number,
    title: string,
    verseOrder: string,
    author: string,
    collectionId?: number | null,
    categoryIds?: number[],
    publishedDate: Date,
    userVerses: UserVerse[],
    notes?: import('./store').CollectionNote[]
}

export async function getAllCategories(): Promise<Category[]> {
    try {
        const response = await fetch(`${baseUrl}/categories`);
        if (response.ok) {
            const data: Category[] = await response.json();
            return data;
        } else {
            return [];
        }
    } catch (error) {
        console.error(error);
        return [];
    }
}

// Get top categories by number of published collections (server should aggregate efficiently)
export async function getTopCategories(limit: number = 8): Promise<Category[]> {
    try {
        const response = await fetch(`${baseUrl}/categories/top/${limit}`);
        if (response.ok) {
            const data: Category[] = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to fetch top categories');
        }
    } catch (error) {
        console.error('getTopCategories failed:', error);
        // Fallback to all categories if top endpoint is unavailable
        try {
            const all = await getAllCategories();
            return all.slice(0, limit);
        } catch {
            return [];
        }
    }
}

export async function createCategory(name: string): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/categories`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name })
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to create category');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function deleteCategory(categoryId: number): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/categories/${categoryId}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to delete category');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function addVerseToCategory(categoryId: number, verseReference: string): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/categories/${categoryId}/verses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ verseReference })
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to add verse to category');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function deleteVerseFromCategory(categoryId: number, verseReference: string): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/categories/${categoryId}/verses`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ verseReference })
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to remove verse from category');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getCategoryVerses(categoryId: number): Promise<string[]> {
    try {
        const response = await fetch(`${baseUrl}/categories/${categoryId}/verses`);
        if (response.ok) {
            const data: string[] = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || `Failed to fetch verses for category: ${categoryId}`);
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getCollectionsByCategory(categoryId: number): Promise<PublishedCollection[]> {
    try {
        const response = await fetch(`${baseUrl}/categories/${categoryId}/collections`);
        if (response.ok) {
            const data: PublishedCollection[] = await response.json();
            return data;
        }
        if (response.status === 404) {
            return [];
        }
        const responseText = await response.text();
        throw new Error(responseText || 'Failed to fetch collections by category');
    } catch (error) {
        console.error(error);
        return [];
    }
}

export async function getCategoriesForCollection(collectionId: number): Promise<number[]> {
    try {
        const response = await fetch(`${baseUrl}/collections/${collectionId}/categories`);
        if (response.ok) {
            const data: number[] = await response.json();
            return data;
        }
        if (response.status === 404) {
            return [];
        }
        const responseText = await response.text();
        throw new Error(responseText || 'Failed to fetch categories for collection');
    } catch (error) {
        console.error(error);
        return [];
    }
}

export async function getPopularPublishedCollections(top: number = 50): Promise<PublishedCollection[]> {
    try {
        const response = await fetch(`${baseUrl}/collections/published/popular/${top}`);
        if (response.ok) {
            const data: PublishedCollection[] = await response.json();
            return data;
        } else {
            return [];
        }
    } catch (error) {
        console.error(error);
        return [];
    }
}

export async function getRecentPublishedCollections(top: number = 50): Promise<PublishedCollection[]> {
    try {
        const response = await fetch(`${baseUrl}/collections/published/recent/${top}`);
        if (response.ok) {
            const data: PublishedCollection[] = await response.json();
            return data;
        }
        if (response.status === 404) {
            return [];
        }
        const responseText = await response.text();
        throw new Error(responseText || 'Failed to fetch recent published collections');
    } catch (error) {
        console.error(error);
        return [];
    }
}

export async function getPublishedCollectionsByAuthor(username: string): Promise<PublishedCollection[]> {
    try {
        const response = await fetch(`${baseUrl}/collections/published/author/${encodeURIComponent(username)}`);
        if (response.ok) {
            const data: PublishedCollection[] = await response.json();
            return data;
        }
        if (response.status === 404) {
            return [];
        }
        const responseText = await response.text();
        throw new Error(responseText || 'Failed to fetch published collections');
    } catch (error) {
        console.error('Failed to fetch published collections by author:', error);
        throw error;
    }
}

export interface SearchPublishedCollectionsPayload {
    query: string;
    verseReferences: string[];
    limit?: number;
}

export async function searchPublishedCollections({ query, verseReferences, limit = 50 }: SearchPublishedCollectionsPayload): Promise<PublishedCollection[]> {
    try {
        const uniqueReferences = Array.from(
            new Set(
                (verseReferences ?? [])
                    .filter((ref) => typeof ref === 'string' && ref.trim().length > 0)
                    .map((ref) => ref.trim())
            )
        );

        const response = await fetch(`${baseUrl}/collections/published/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query,
                verseReferences: uniqueReferences,
                limit,
            }),
        });

        if (response.ok) {
            const data: PublishedCollection[] = await response.json();
            return data;
        }

        if (response.status === 404) {
            return [];
        }

        const responseText = await response.text();
        throw new Error(responseText || 'Failed to search published collections');
    } catch (error) {
        console.error('searchPublishedCollections failed:', error);
        return [];
    }
}

export async function getPublishedCollection(publishedId: number): Promise<PublishedCollection | null> {
    try {
        const response = await fetch(`${baseUrl}/collections/published/${publishedId}`);
        if (response.ok) {
            const data: PublishedCollection = await response.json();
            return data;
        }
        if (response.status === 404) {
            return null;
        }
        const responseText = await response.text();
        throw new Error(responseText || 'Failed to fetch published collection');
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getTopSavedVerses(): Promise<Verse[]> {
    try {
        const response = await fetch(`${baseUrl}/verses/top/saved/30`);
        if (response.ok) {
            const data: Verse[] = await response.json();
            return data;
        } else {
            return [];
        }
    } catch (error) {
        console.error(error);
        return [];
    }
}

export async function getTopMemorizedVerses(): Promise<Verse[]> {
    try {
        const response = await fetch(`${baseUrl}/verses/top/memorized/30`);
        if (response.ok) {
            const data: Verse[] = await response.json();
            return data;
        } else {
            return [];
        }
    } catch (error) {
        console.error(error);
        return [];
    }
}

export interface SiteBannerResponse {
    hasBanner: boolean;
    message: string | null;
}

const normalizeSiteBanner = (data: any): SiteBannerResponse => ({
    hasBanner: Boolean(data?.hasBanner),
    message: data?.message != null ? data.message.toString() : null,
});

export async function getSiteBanner(): Promise<SiteBannerResponse> {
    try {
        const response = await fetch(`${baseUrl}/banner`);
        if (response.ok) {
            const raw = await response.json();
            return normalizeSiteBanner(raw);
        }

        if (response.status === 404) {
            return { hasBanner: false, message: null };
        }

        const responseText = await response.text();
        throw new Error(responseText || 'Failed to fetch site banner');
    } catch (error) {
        console.error('Failed to fetch site banner:', error);
        throw error;
    }
}

export async function updateSiteBanner(message: string, username: string, pin: string): Promise<SiteBannerResponse> {
    try {
        const response = await fetch(`${baseUrl}/admin/banner`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message,
                username,
                pin,
            }),
        });

        if (response.ok) {
            const raw = await response.json();
            return normalizeSiteBanner(raw);
        }

        const responseText = await response.text();
        throw new Error(responseText || 'Failed to update site banner');
    } catch (error) {
        console.error('Failed to update site banner:', error);
        throw error;
    }
}

export async function deleteSiteBanner(username: string, pin: string): Promise<SiteBannerResponse> {
    try {
        const response = await fetch(`${baseUrl}/admin/banner`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username,
                pin,
            }),
        });

        if (response.ok) {
            const raw = await response.json();
            return normalizeSiteBanner(raw);
        }

        const responseText = await response.text();
        throw new Error(responseText || 'Failed to delete site banner');
    } catch (error) {
        console.error('Failed to delete site banner:', error);
        throw error;
    }
}

export interface PublishCollectionInfo {
    collection: Collection,
    description: string,
    categoryIds: number[]
}

export async function publishCollection(collection: Collection, description: string, categoryIds: number[]): Promise<string> {
    try {
        // Ensure the collection has all required fields and userVerses are included
        const collectionToPublish: Collection = {
            ...collection,
            userVerses: collection.userVerses || []
        };
        
        const info: PublishCollectionInfo = {
            collection: collectionToPublish,
            description: description,
            categoryIds: categoryIds
        };
        
        const response = await fetch(`${baseUrl}/collections/publish`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(info),
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to publish collection');
        }
        
        const result = await response.json();
        return result.message || 'Collection submitted for review. It usually takes under a day for review.';
    } catch (error) {
        console.error('Failed to publish collection:', error);
        throw error;
    }
}

export async function unpublishCollection(collectionId: number): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/collections/${collectionId}/publish`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to unpublish collection');
        }
    } catch (error) {
        console.error('Failed to unpublish collection:', error);
        throw error;
    }
}

export async function getRecentPractice(username: string): Promise<UserVerse[]> {
    try {
        const response = await fetch(`${baseUrl}/userverses/recent/${username}`);
        if (response.ok) {
            const data: UserVerse[] = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to get recent practice');
        }
    } catch (error) {
        console.error('Failed to get recent practice:', error);
        throw error;
    }
}

export async function getOverdueVerses(username: string): Promise<UserVerse[]> {
    try {
        const response = await fetch(`${baseUrl}/userverses/overdue/${username}`);
        if (response.ok) {
            const data: UserVerse[] = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to get overdue verses');
        }
    } catch (error) {
        console.error('Failed to get overdue verses:', error);
        throw error;
    }
}

export async function getFriendsActivity(username: string, limit: number = 10): Promise<Activity[]> {
    try {
        const response = await fetch(`${baseUrl}/activity/friends/${username}?limit=${limit}`);
        if (response.ok) {
            const data: Activity[] = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to get friends activity');
        }
    } catch (error) {
        console.error('Failed to get friends activity:', error);
        throw error;
    }
}

export async function getUserActivity(username: string, limit: number = 10): Promise<Activity[]> {
    try {
        const response = await fetch(`${baseUrl}/activity/user/${username}?limit=${limit}`);
        if (response.ok) {
            const data: Activity[] = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to get user activity');
        }
    } catch (error) {
        console.error('Failed to get user activity:', error);
        throw error;
    }
}

export async function getFriendActivity(username: string, viewerUsername: string, limit: number = 10): Promise<Activity[]> {
    try {
        const response = await fetch(`${baseUrl}/activity/friend/${username}?viewerUsername=${viewerUsername}&limit=${limit}`);
        if (response.ok) {
            const data: Activity[] = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to get friend activity');
        }
    } catch (error) {
        console.error('Failed to get friend activity:', error);
        throw error;
    }
}

export async function setUserSavedCollection(collectionId: number) {
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
            throw new Error(responseText || 'Failed to set collection as saved');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function incrementPublishedCollectionSaveCount(collection: PublishedCollection, usernameSaving: string) {
    try {
        const response = await fetch(`${baseUrl}/collections/published/saved/${usernameSaving}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(collection),
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to increment published collection saves');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export interface Highlight {
    id: number;
    username: string;
    verseReference: string;
    createdDate: string;
}

export async function addHighlight(username: string, readableReference: string): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/highlights`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, readableReference }),
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to add highlight');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function removeHighlight(username: string, readableReference: string): Promise<void> {
    try {
        const encodedVerseRef = encodeURIComponent(readableReference);
        const response = await fetch(`${baseUrl}/highlights/${username}/${encodedVerseRef}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to remove highlight');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getHighlightsByUsername(username: string): Promise<Highlight[]> {
    try {
        const response = await fetch(`${baseUrl}/highlights/${username}`);
        if (response.ok) {
            const data: Highlight[] = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to get highlights');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getHighlightsByChapter(username: string, book: string, chapter: number): Promise<Highlight[]> {
    try {
        const encodedBook = encodeURIComponent(book);
        const response = await fetch(`${baseUrl}/highlights/${username}/chapter/${encodedBook}/${chapter}`);
        if (response.ok) {
            const data: Highlight[] = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to get chapter highlights');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function checkHighlight(username: string, verseReference: string): Promise<boolean> {
    try {
        const encodedVerseRef = encodeURIComponent(verseReference);
        const response = await fetch(`${baseUrl}/highlights/${username}/check/${encodedVerseRef}`);
        if (response.ok) {
            const data: { isHighlighted: boolean } = await response.json();
            return data.isHighlighted;
        } else {
            return false;
        }
    } catch (error) {
        console.error(error);
        return false;
    }
}

export interface VerseNote {
    id: number;
    verseReference: string;
    username: string;
    text: string;
    isPublic: boolean;
    approved?: boolean | null;
    createdDate: string;
    originalReference?: string;
    likeCount?: number;
    userLiked?: boolean;
}

export async function createNote(verseReference: string, username: string, text: string, isPublic: boolean, originalReference?: string): Promise<VerseNote> {
    try {
        const response = await fetch(`${baseUrl}/notes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                verseReference,
                username,
                text,
                isPublic,
                originalReference: originalReference || verseReference
            }),
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to create note');
        }
        const data: VerseNote = await response.json();
        return data;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function updateNote(id: number, text: string): Promise<VerseNote> {
    try {
        const response = await fetch(`${baseUrl}/notes/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to update note');
        }
        const data: VerseNote = await response.json();
        return data;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function deleteNote(id: number): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/notes/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to delete note');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getPublicNotesByVerseReference(verseReference: string, currentUsername?: string): Promise<VerseNote[]> {
    try {
        const encodedVerseRef = encodeURIComponent(verseReference);
        const url = currentUsername
            ? `${baseUrl}/notes/verse/${encodedVerseRef}/public?currentUsername=${encodeURIComponent(currentUsername)}`
            : `${baseUrl}/notes/verse/${encodedVerseRef}/public`;
        const response = await fetch(url);
        if (response.ok) {
            const data: VerseNote[] = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to get notes');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getAllNotesByChapter(book: string, chapter: number, noteType: 'private' | 'public', username?: string, currentUsername?: string): Promise<VerseNote[]> {
    try {
        const encodedBook = encodeURIComponent(book);
        let url: string;
        if (noteType === 'private') {
            if (!username) {
                throw new Error('Username is required for private notes');
            }
            url = `${baseUrl}/notes/chapter/${encodedBook}/${chapter}/all/private?username=${encodeURIComponent(username)}`;
            if (currentUsername) {
                url += `&currentUsername=${encodeURIComponent(currentUsername)}`;
            }
        } else {
            url = `${baseUrl}/notes/chapter/${encodedBook}/${chapter}/all/public`;
            if (currentUsername) {
                url += `?currentUsername=${encodeURIComponent(currentUsername)}`;
            }
        }
        const response = await fetch(url);
        if (response.ok) {
            const data: VerseNote[] = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to get chapter notes');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getNotesByVerseReference(verseReference: string, username?: string): Promise<VerseNote[]> {
    try {
        const encodedVerseRef = encodeURIComponent(verseReference);
        const url = username 
            ? `${baseUrl}/notes/verse/${encodedVerseRef}?username=${encodeURIComponent(username)}`
            : `${baseUrl}/notes/verse/${encodedVerseRef}`;
        const response = await fetch(url);
        if (response.ok) {
            const data: VerseNote[] = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to get notes');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getNotesByUsername(username: string): Promise<VerseNote[]> {
    try {
        const response = await fetch(`${baseUrl}/notes/user/${username}`);
        if (response.ok) {
            const data: VerseNote[] = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to get notes');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getUnapprovedNotes(username: string): Promise<VerseNote[]> {
    try {
        const response = await fetch(`${baseUrl}/admin/notes/unapproved?username=${encodeURIComponent(username)}`);
        if (response.ok) {
            const data: VerseNote[] = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to get unapproved notes');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function approveNote(id: number, username: string): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/admin/notes/${id}/approve?username=${encodeURIComponent(username)}`, {
            method: 'PUT',
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to approve note');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function denyNote(id: number, username: string, reason: string): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/admin/notes/${id}/deny?username=${encodeURIComponent(username)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ reason }),
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to deny note');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getVersesWithPrivateNotes(username: string, book: string, chapter: number): Promise<string[]> {
    try {
        const response = await fetch(`${baseUrl}/notes/chapter/${encodeURIComponent(book)}/${chapter}/private?username=${encodeURIComponent(username)}`);
        if (response.ok) {
            const data: string[] = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to get verses with private notes');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getVersesWithPublicNotes(book: string, chapter: number): Promise<string[]> {
    try {
        const response = await fetch(`${baseUrl}/notes/chapter/${encodeURIComponent(book)}/${chapter}/public`);
        if (response.ok) {
            const data: string[] = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to get verses with public notes');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function likeNote(noteId: number, username: string): Promise<{ likeCount: number; liked: boolean }> {
    try {
        const response = await fetch(`${baseUrl}/notes/${noteId}/like?username=${encodeURIComponent(username)}`, {
            method: 'POST',
        });
        if (response.ok) {
            const data: { likeCount: number; liked: boolean } = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to like note');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function unlikeNote(noteId: number, username: string): Promise<{ likeCount: number; liked: boolean }> {
    try {
        const response = await fetch(`${baseUrl}/notes/${noteId}/like?username=${encodeURIComponent(username)}`, {
            method: 'DELETE',
        });
        if (response.ok) {
            const data: { likeCount: number; liked: boolean } = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to unlike note');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export interface PublishedCollection {
    publishedId: number;
    description?: string;
    title: string;
    author: string;
    numSaves: number;
    verseOrder: string;
    collectionId?: number;
    categoryIds: number[];
    publishedDate: string;
    status: string;
    userVerses: UserVerse[];
}

export async function getPendingCollections(username: string): Promise<PublishedCollection[]> {
    try {
        const response = await fetch(`${baseUrl}/admin/collections/pending?username=${encodeURIComponent(username)}`);
        if (response.ok) {
            const data: PublishedCollection[] = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to get pending collections');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function approveCollection(id: number, username: string): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/admin/collections/${id}/approve?username=${encodeURIComponent(username)}`, {
            method: 'PUT',
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to approve collection');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function rejectCollection(id: number, username: string, reason?: string): Promise<void> {
    try {
        const response = await fetch(`${baseUrl}/admin/collections/${id}/reject?username=${encodeURIComponent(username)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ reason }),
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to reject collection');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export interface PracticeSession {
    sessionId: number;
    username: string;
    userVerseId?: number;
    readableReference: string;
    practiceStyle: number;
    accuracyPercent: number;
    stageCount: number;
    stageAccuracies: string;
    practiceDate: string;
    createdDate: string;
}

export async function getPracticeSessionsByUserVerseId(
    username: string,
    userVerseId: number,
    limit: number = 5
): Promise<PracticeSession[]> {
    try {
        const response = await fetch(
            `${baseUrl}/practicesessions/userverse/${encodeURIComponent(username)}/${userVerseId}?limit=${limit}`
        );
        if (response.ok) {
            const data: PracticeSession[] = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to get practice sessions');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getPracticeSessionsByVerse(
    username: string,
    readableReference: string,
    limit: number = 5
): Promise<PracticeSession[]> {
    try {
        const response = await fetch(
            `${baseUrl}/practicesessions/verse/${encodeURIComponent(username)}?readableReference=${encodeURIComponent(readableReference)}&limit=${limit}`
        );
        if (response.ok) {
            const data: PracticeSession[] = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to get practice sessions');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export interface UserVerseParts {
    book?: string,
    chapter?: number,
    verseParts?: string[],
    text?: string
}

export async function getUserVerseParts(userVerse: UserVerse): Promise<UserVerseParts> {
    try {
        const response = await fetch(`${baseUrl}/userverses/parse`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userVerse),
        });
        if (response.ok) {
            const data: UserVerseParts = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText);
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}


export async function updateThemeDb(preference: number, username: string): Promise<void> {
    try {
        const response = await fetch(
            `${baseUrl}/users/theme/${username}`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(preference),
            }
        );
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to update theme preference');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function updateTypeOutReference(typeOut: boolean, username: string): Promise<void> {
    try {
        const response = await fetch(
            `${baseUrl}/users/typeoutreference/${username}`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(typeOut),
            }
        );
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to update type out reference setting');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export interface UserVerseMemorizedInfo {
    userVerse: UserVerse;
    pointsGained: number;
}

export interface MemorizedInfo {
    userVerseId: number;
    accuracy: number;
}

export async function memorizePassage(info: MemorizedInfo): Promise<UserVerseMemorizedInfo> {
    try {
        const response = await fetch(`${baseUrl}/userverses/memorize`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(info),
        });
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to memorize passage');
        }
        const data: UserVerseMemorizedInfo = await response.json();
        return data;
    } catch (error) {
        console.error(error);
        throw error;
    }
}