import { User } from "./store";

export default async function checkUsernameAvailable(username: string): Promise<boolean> {
    try {
        const response = await fetch(`http://10.172.8.121:5160/users/${username}`);
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
        const response = await fetch(`http://10.172.8.121:5160/users`, {
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
        const response = await fetch(`http://10.172.8.121:5160/users/${user.username}`);
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