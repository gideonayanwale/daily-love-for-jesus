import { useState, useEffect, useRef, useCallback } from "react";
import { NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { ReadingTrackerService } from "../lib/readingTracker";

interface UseReadingTrackerOptions {
  bookNumber: number;
  chapter: number;
  groupId?: number;
  onReadCompleted?: () => void;
}

export function useReadingTracker({
  bookNumber,
  chapter,
  groupId,
  onReadCompleted,
}: UseReadingTrackerOptions) {
  const contentId = `bible:${bookNumber}:${chapter}`;
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [scrollDepth, setScrollDepth] = useState<number>(0);
  const [pendingQueueCount, setPendingQueueCount] = useState<number>(0);

  const startTimeRef = useRef<number>(Date.now());
  const hasTriggeredRef = useRef<boolean>(false);
  // Use a ref for scroll depth inside callbacks to avoid re-creating them on every scroll frame
  const scrollDepthRef = useRef<number>(0);

  // Reset timer and state when book or chapter changes
  useEffect(() => {
    startTimeRef.current = Date.now();
    hasTriggeredRef.current = false;
    scrollDepthRef.current = 0;
    setIsCompleted(false);
    setScrollDepth(0);

    // Refresh pending offline queue count
    ReadingTrackerService.getQueue().then((q) => {
      setPendingQueueCount(q.length);
      const isAlreadyInQueue = q.some((item) => item.contentId === contentId);
      if (isAlreadyInQueue) {
        setIsCompleted(true);
        hasTriggeredRef.current = true;
      }
    });
  }, [contentId]);

  /**
   * Dispatches reading completion to offline storage & triggers background sync
   */
  const markAsRead = useCallback(async () => {
    if (hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;
    setIsCompleted(true);

    const timeSpentSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    // Capture current scroll depth from ref (avoids stale closure / dep thrashing)
    const capturedScrollDepth = Math.min(100, scrollDepthRef.current);

    try {
      await ReadingTrackerService.recordReading({
        contentId,
        contentType: "bible_chapter",
        bookNumber,
        chapter,
        timeSpentSeconds,
        scrollDepth: capturedScrollDepth,
        groupId,
      });

      const queue = await ReadingTrackerService.getQueue();
      setPendingQueueCount(queue.length);

      if (onReadCompleted) {
        onReadCompleted();
      }
    } catch (err) {
      console.warn("[useReadingTracker] Error marking read:", err);
    }
  }, [contentId, bookNumber, chapter, groupId, onReadCompleted]); // scrollDepth removed from deps

  /**
   * Scroll handler listening for >= 90% scroll depth
   */
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const totalHeight = contentSize.height - layoutMeasurement.height;

      if (totalHeight <= 0) {
        // Short chapter — full content fits in viewport, auto-mark after 2s if needed
        return;
      }

      const currentScrollRatio = (contentOffset.y + layoutMeasurement.height) / contentSize.height;
      const percentage = Math.min(100, Math.round(currentScrollRatio * 100));

      // Update ref synchronously (no re-render cost)
      scrollDepthRef.current = percentage;
      // Update state only when meaningfully different to minimize re-renders
      setScrollDepth((prev) => (Math.abs(prev - percentage) >= 5 ? percentage : prev));

      // Auto-trigger completion when reaching 90% scroll depth
      if (currentScrollRatio >= 0.90 && !hasTriggeredRef.current) {
        console.log(`[useReadingTracker] Reached 90% scroll depth for ${contentId}. Auto-marking as read.`);
        markAsRead();
      }
    },
    [contentId, markAsRead]
  );

  return {
    isCompleted,
    scrollDepth,
    pendingQueueCount,
    markAsRead,
    handleScroll,
  };
}
