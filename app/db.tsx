import { User } from "./store";

const getUser = async (username: string): Promise<User | null> => {
    try {
        const response = await fetch(``);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        return data as User;
    } catch (error) {
        console.error('Failed to fetch user:', error);
        return null;
    }
}