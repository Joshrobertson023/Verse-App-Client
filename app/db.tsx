
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