import Status from './Enums';

class User {
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

    constructor(username: string, firstName: string, lastName:string, email:string, ) {
        this.username = username;
        this.firstName = firstName;
        this.lastName = lastName;
    }
}

export default User;