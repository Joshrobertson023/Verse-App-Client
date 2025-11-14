declare module 'expo-background-fetch' {
  export enum BackgroundFetchResult {
    NoData = 1,
    NewData = 2,
    Failed = 3,
  }

  export interface BackgroundFetchOptions {
    minimumInterval?: number;
    stopOnTerminate?: boolean;
    startOnBoot?: boolean;
  }

  export function registerTaskAsync(taskName: string, options?: BackgroundFetchOptions): Promise<void>;
  export function unregisterTaskAsync(taskName: string): Promise<void>;
  export function setMinimumIntervalAsync(interval: number): Promise<void>;
}


