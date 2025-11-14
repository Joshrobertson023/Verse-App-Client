declare module "expo-task-manager" {
  export type TaskHandler = (
    event: any
  ) =>
    | void
    | import("expo-background-fetch").BackgroundFetchResult
    | Promise<void | import("expo-background-fetch").BackgroundFetchResult>;

  export function defineTask(taskName: string, task: TaskHandler): void;
  export function isTaskRegisteredAsync(taskName: string): Promise<boolean>;
  export function unregisterTaskAsync(taskName: string): Promise<void>;
}