import { Collection, SearchData, User, UserVerse } from "./store";

const baseUrl = 'http://10.87.110.121:5160'

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

export async function getUserCollections(username: string): Promise<Collection[]> {
    try {
        const response = await fetch(`${baseUrl}/collections/all/${username}`);
        if (response.ok) {
            const data: Collection[] = await response.json();
            return data;
        } else {
            const responseText = await response.text();
            throw new Error(responseText || 'Failed to fetch user collections');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}
