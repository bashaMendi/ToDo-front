const LAST_SYNC_KEY = 'lastSyncTimestamp';

export class SyncStorage {
  static getLastSyncTimestamp(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    
    try {
      return localStorage.getItem(LAST_SYNC_KEY);
    } catch (error) {
      console.warn('Failed to get last sync timestamp from localStorage:', error);
      return null;
    }
  }

  static setLastSyncTimestamp(timestamp: string): void {
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      localStorage.setItem(LAST_SYNC_KEY, timestamp);
    } catch (error) {
      console.warn('Failed to save last sync timestamp to localStorage:', error);
    }
  }

  static clearLastSyncTimestamp(): void {
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      localStorage.removeItem(LAST_SYNC_KEY);
    } catch (error) {
      console.warn('Failed to clear last sync timestamp from localStorage:', error);
    }
  }

  static getInitialSyncTimestamp(): string {
    // אם אין timestamp שמור, השתמשטאמפ של לפני שעה
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    return this.getLastSyncTimestamp() || oneHourAgo;
  }
}
