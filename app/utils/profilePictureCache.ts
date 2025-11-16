import * as FileSystem from 'expo-file-system';

const PROFILE_PICTURES_DIR = `${FileSystem.documentDirectory}profile_pictures/`;
const LOW_QUALITY_SUFFIX = '_low';

/**
 * Ensures the profile pictures directory exists
 */
async function ensureDirectoryExists(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(PROFILE_PICTURES_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(PROFILE_PICTURES_DIR, { intermediates: true });
  }
}

/**
 * Gets the local file path for a cached profile picture
 */
function getLocalPath(username: string, lowQuality: boolean = false): string {
  const suffix = lowQuality ? LOW_QUALITY_SUFFIX : '';
  return `${PROFILE_PICTURES_DIR}${username}${suffix}.jpg`;
}

/**
 * Downloads and caches a profile picture from a URL
 * @param username - The username of the user
 * @param imageUrl - The URL of the profile picture
 * @param lowQuality - Whether to download a low-quality version (for friends list, etc.)
 * @returns The local file path if successful, null otherwise
 */
export async function cacheProfilePicture(
  username: string,
  imageUrl: string | null | undefined,
  lowQuality: boolean = false
): Promise<string | null> {
  if (!imageUrl) {
    return null;
  }

  try {
    await ensureDirectoryExists();
    const localPath = getLocalPath(username, lowQuality);
    
    // Check if already cached
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    if (fileInfo.exists) {
      return localPath;
    }

    // For low quality, we'll download and resize
    // For now, just download the full image - expo-image will handle caching
    // In production, you might want to request a thumbnail endpoint from the server
    const downloadResult = await FileSystem.downloadAsync(imageUrl, localPath);
    
    if (downloadResult.status === 200) {
      return localPath;
    }
    
    return null;
  } catch (error) {
    console.error(`Failed to cache profile picture for ${username}:`, error);
    return null;
  }
}

/**
 * Gets the cached profile picture path, or returns the original URL if not cached
 * @param username - The username of the user
 * @param imageUrl - The original URL of the profile picture
 * @param lowQuality - Whether to get a low-quality version
 * @returns The local file path if cached, or the original URL
 */
export async function getCachedProfilePicture(
  username: string,
  imageUrl: string | null | undefined,
  lowQuality: boolean = false
): Promise<string | null> {
  if (!imageUrl) {
    return null;
  }

  try {
    const localPath = getLocalPath(username, lowQuality);
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    
    if (fileInfo.exists) {
      return localPath;
    }
    
    // If not cached, return original URL and trigger async cache
    cacheProfilePicture(username, imageUrl, lowQuality).catch(err => {
      console.error(`Failed to cache profile picture for ${username}:`, err);
    });
    
    return imageUrl;
  } catch (error) {
    console.error(`Failed to get cached profile picture for ${username}:`, error);
    return imageUrl || null;
  }
}

/**
 * Clears the cached profile picture for a user
 */
export async function clearCachedProfilePicture(username: string): Promise<void> {
  try {
    const fullPath = getLocalPath(username, false);
    const lowPath = getLocalPath(username, true);
    
    const fullInfo = await FileSystem.getInfoAsync(fullPath);
    if (fullInfo.exists) {
      await FileSystem.deleteAsync(fullPath, { idempotent: true });
    }
    
    const lowInfo = await FileSystem.getInfoAsync(lowPath);
    if (lowInfo.exists) {
      await FileSystem.deleteAsync(lowPath, { idempotent: true });
    }
  } catch (error) {
    console.error(`Failed to clear cached profile picture for ${username}:`, error);
  }
}

/**
 * Batch cache profile pictures for multiple users
 * Useful when loading friends list or search results
 */
export async function cacheProfilePictures(
  users: Array<{ username: string; profilePictureUrl?: string | null }>,
  lowQuality: boolean = true
): Promise<void> {
  const cachePromises = users
    .filter(user => user.profilePictureUrl)
    .map(user => cacheProfilePicture(user.username, user.profilePictureUrl, lowQuality));
  
  await Promise.allSettled(cachePromises);
}

/**
 * Gets a profile picture URL that can be used with expo-image
 * This will return a cached path if available, otherwise the original URL
 */
export function getProfilePictureSource(
  username: string,
  imageUrl: string | null | undefined,
  lowQuality: boolean = false
): { uri: string } | null {
  if (!imageUrl) {
    return null;
  }

  // For expo-image, we can use the cacheKey to leverage its built-in caching
  // But we'll also use our file system cache for offline access
  const localPath = getLocalPath(username, lowQuality);
  
  // Check if cached file exists synchronously (we'll verify async)
  // For now, return the original URL - expo-image has good caching
  // We'll enhance this to use local cache when available
  return { uri: imageUrl };
}

