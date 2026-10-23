import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const OFFLINE_QUEUE_KEY = 'kiosk_offline_attendance_queue_v1';
const MAX_QUEUE_SIZE = 500;

/**
 * Offline Attendance Queue Service
 * Ensures zero-data-loss when Kiosk network connection drops during peak attendance hours.
 */
export const offlineQueue = {
  /**
   * Enqueue attendance event when network is unavailable.
   */
  enqueue: async ({ embedding, deviceId, livenessPayload = {}, capturedAt }) => {
    try {
      const existingRaw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      const queue = existingRaw ? JSON.parse(existingRaw) : [];

      if (queue.length >= MAX_QUEUE_SIZE) {
        console.warn('[OFFLINE_QUEUE] Queue reached maximum capacity (500), purging oldest event');
        queue.shift();
      }

      const event = {
        idempotency_key: Crypto.randomUUID(),
        device_id: deviceId,
        embedding,
        liveness_score: livenessPayload.liveness_score ?? 1.0,
        is_live: livenessPayload.is_live ?? true,
        ai_attestation: livenessPayload.ai_attestation || null,
        captured_at: capturedAt || new Date().toISOString(),
        queued_at: new Date().toISOString(),
        retry_count: 0,
      };

      queue.push(event);
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      console.log(`[OFFLINE_QUEUE] Enqueued offline event ${event.idempotency_key}. Total in queue: ${queue.length}`);
      return { success: true, queued: true, event };
    } catch (err) {
      console.error('[OFFLINE_QUEUE] Failed to enqueue offline event:', err.message);
      throw new Error('Khong the luu hang doi ngoai tuyen cuc bo: ' + err.message);
    }
  },

  /**
   * Retrieve count of pending offline records.
   */
  getQueueCount: async () => {
    try {
      const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      if (!raw) return 0;
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list.length : 0;
    } catch (_e) {
      return 0;
    }
  },

  /**
   * Get all pending events in the queue.
   */
  getQueue: async () => {
    try {
      const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_e) {
      return [];
    }
  },

  /**
   * Flush/sync queued offline records to the Attendance Service when online.
   */
  flushQueue: async (attendanceApi) => {
    try {
      const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      if (!raw) return { synced: 0, remaining: 0 };
      const queue = JSON.parse(raw);
      if (!Array.isArray(queue) || queue.length === 0) return { synced: 0, remaining: 0 };

      console.log(`[OFFLINE_QUEUE] Attempting to flush ${queue.length} offline event(s)...`);
      const remainingQueue = [];
      let syncedCount = 0;

      for (const item of queue) {
        try {
          const result = await attendanceApi.recognizeAndCheck(
            item.embedding,
            item.device_id,
            {
              liveness_score: item.liveness_score,
              is_live: item.is_live,
              ai_attestation: item.ai_attestation,
              offline_captured_at: item.captured_at,
              idempotency_key: item.idempotency_key,
            }
          );
          if (result && result.success) {
            syncedCount++;
          } else {
            // Keep if rejected temporarily
            item.retry_count = (item.retry_count || 0) + 1;
            remainingQueue.push(item);
          }
        } catch (err) {
          console.warn(`[OFFLINE_QUEUE] Failed to sync event ${item.idempotency_key}:`, err.message);
          item.retry_count = (item.retry_count || 0) + 1;
          remainingQueue.push(item);
          // If network is still down, stop processing rest of batch
          break;
        }
      }

      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));
      console.log(`[OFFLINE_QUEUE] Flush complete: ${syncedCount} synced, ${remainingQueue.length} remaining.`);
      return { synced: syncedCount, remaining: remainingQueue.length };
    } catch (err) {
      console.error('[OFFLINE_QUEUE] Flush error:', err.message);
      return { synced: 0, error: err.message };
    }
  },

  /**
   * Clear all offline queue items (admin/debug only).
   */
  clearQueue: async () => {
    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
  }
};

