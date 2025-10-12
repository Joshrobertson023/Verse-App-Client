import { User } from "./store";

export default async function checkUsernameAvailable(username: string): Promise<boolean> {
    try {
        const response = await fetch(`http://10.125.244.121:5160/users/${username}`);
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
        const response = await fetch(`http://10.125.244.121:5160/users`, {
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
        const response = await fetch(`http://10.125.244.121:5160/users/${user.username}`);
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
        const response = await fetch(`http://10.125.244.121:5160/users/token/${token}`);
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
        const response = await fetch(`http://10.125.244.121:5160/users/password/${username}`);
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