import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../db/database.js';

/**
 * Hook for article queries and state management.
 * Note: IndexedDB cannot index boolean values (true/false are not valid IDB keys).
 * We store isRead as truthy/falsy and use JS filtering where needed.
 * isBookmarked uses 0/1 integers for indexing.
 */
export function useArticles(viewType, viewId) {
  const articles = useLiveQuery(() => {
    switch (viewType) {
      case 'feed':
        return db.articles
          .where('feedId')
          .equals(viewId)
          .toArray()
          .then((arts) => arts.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)));

      case 'folder': {
        return db.feeds
          .where('folderId')
          .equals(viewId)
          .toArray()
          .then((feeds) => {
            const feedIds = feeds.map((f) => f.id);
            if (feedIds.length === 0) return [];
            return db.articles
              .where('feedId')
              .anyOf(feedIds)
              .toArray()
              .then((arts) =>
                arts.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
              );
          });
      }

      case 'today': {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayStr = todayStart.toISOString();
        return db.articles
          .toArray()
          .then((arts) =>
            arts
              .filter((a) => a.publishedAt >= todayStr)
              .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
          );
      }

      case 'saved':
        return db.articles
          .where('isBookmarked')
          .equals(1)
          .toArray()
          .then((arts) =>
            arts.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
          );

      case 'all':
      default:
        return db.articles
          .toArray()
          .then((arts) =>
            arts.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
          );
    }
  }, [viewType, viewId]) || [];

  const markAsRead = useCallback(async (articleId) => {
    await db.articles.update(articleId, { isRead: true });
  }, []);

  const markAsUnread = useCallback(async (articleId) => {
    await db.articles.update(articleId, { isRead: false });
  }, []);

  const toggleBookmark = useCallback(async (articleId) => {
    const article = await db.articles.get(articleId);
    if (article) {
      await db.articles.update(articleId, {
        isBookmarked: article.isBookmarked ? 0 : 1,
      });
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!articles || articles.length === 0) return;
    const ids = articles.filter((a) => !a.isRead).map((a) => a.id);
    if (ids.length > 0) {
      await db.articles.where('id').anyOf(ids).modify({ isRead: true });
    }
  }, [articles]);

  return {
    articles,
    markAsRead,
    markAsUnread,
    toggleBookmark,
    markAllAsRead,
  };
}
