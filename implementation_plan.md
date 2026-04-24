# FeedFlow — Improvements Plan

## Issue Summary & Sizing

| # | Issue | Effort | Approach |
|---|---|---|---|
| 1 | Fix curated feeds (HBR 403 etc.) | **Small** (~20 min) | Verify all URLs, replace broken ones, expand list |
| 2 | Move feeds into folders easily | **Medium** (~1 hr) | Add "Move to folder" to right-click context menu + a dropdown selector |
| 3 | Auto-load full articles | **Small** (~30 min) | Auto-extract on article select; show fallback on failure |
| 4 | Search for feeds when adding content | **Medium** (~1.5 hrs) | Use Google News RSS trick — zero cost, no API key |
| 5 | Search across articles in reader | **Small** (~30 min) | Local IndexedDB full-text search on title + content |

**Total estimated effort: ~4 hours**

---

## Detailed Approach

### 1. Fix Curated Feeds

**Problem**: HBR URL points to a PNG image, not an RSS feed. Other feeds may also be broken or return 403s.

**Fix**:
- Replace HBR with the correct RSS URL: `https://hbr.org/rss/most-popular`
- Remove feeds known to block server-side fetching (some sites aggressively block non-browser user-agents)
- **Expand each category to 5-6 verified feeds**, adding reliable sources like:
  - Business: Inc, Entrepreneur, McKinsey Insights, First Round Review
  - AI: Hugging Face Blog, Anthropic Blog, AI News
  - News: AP News, The Guardian, Al Jazeera
  - Science: NASA, Phys.org, Scientific American

---

### 2. Move Feeds Into Folders

**Problem**: No UI pathway to reorganize feeds after adding them.

**Approach — Context Menu "Move to folder"** (instead of full drag-and-drop):
- Right-click on any feed in the sidebar → shows existing context menu
- Add a **"Move to..."** option that opens a submenu/dropdown listing all folders + "Uncategorized"
- Clicking a folder moves the feed there immediately

> [!NOTE]
> Full drag-and-drop (with drag handles, drop zones, visual feedback) is significantly more complex (~4-5 hours) and typically requires a library like `@dnd-kit/core`. The context-menu approach gives the same functionality with much less complexity. We can add DnD as a future polish item.

---

### 3. Auto-Load Full Articles

**Problem**: User has to manually click "Load Full Article" every time.

**Approach**:
- When an article is selected, **automatically trigger full article extraction** in the background
- Show the RSS feed content immediately (so the user isn't staring at a blank screen)
- When extraction completes, **seamlessly replace** the content with the full article
- If extraction fails silently, keep showing the RSS content + show "Open in New Tab" button
- Add a small "Using extracted content" indicator so the user knows what they're reading

---

### 4. Search for Feeds When Adding Content

**Problem**: The user can only paste URLs or pick from presets — no keyword search.

**Approach — Google News RSS (zero cost, no API key)**:
- Add a **search input** to the Add Content "Discover" tab
- When the user types a keyword (e.g., "machine learning"), we construct:
  ```
  https://news.google.com/rss/search?q=machine+learning&hl=en
  ```
- Parse this as a regular RSS feed → show results as a "Google News" feed the user can subscribe to
- Additionally, try auto-discovering feeds by searching `https://{keyword-slug}.com/feed` patterns
- This gives the user a **keyword → RSS feed** workflow at zero cost

> [!IMPORTANT]
> This won't discover arbitrary blog RSS feeds by keyword (no free API exists for that). But it does give the user a functional search-to-subscribe flow via Google News RSS, which covers the 80% use case. Combined with the URL discovery we already have, this should be sufficient for MVP.

---

### 5. Search Across Articles in Reader

**Problem**: No way to find previously read articles.

**Approach**:
- Add a **search bar** at the top of the article list panel
- Query IndexedDB `articles` table, filtering by `title` and `summary` fields using case-insensitive string matching
- Show matching results in the same article list format
- Clear search to return to the normal view
- This is purely local — instant, no API calls

---

## Proposed Changes

### [MODIFY] [constants.js](file:///Users/vinaychaganti/Documents/RSS%20Feed%20Reader/src/utils/constants.js)
Fix broken feed URLs, expand each category to 5-6 verified feeds.

### [MODIFY] [Sidebar.jsx](file:///Users/vinaychaganti/Documents/RSS%20Feed%20Reader/src/components/Sidebar.jsx)
Add "Move to folder" option in the feed right-click context menu.

### [MODIFY] [ArticleReader.jsx](file:///Users/vinaychaganti/Documents/RSS%20Feed%20Reader/src/components/ArticleReader.jsx)
Auto-trigger article extraction on select, seamless content swap.

### [MODIFY] [ArticleList.jsx](file:///Users/vinaychaganti/Documents/RSS%20Feed%20Reader/src/components/ArticleList.jsx)
Add search bar for filtering articles by title/content.

### [MODIFY] [AddFeedModal.jsx](file:///Users/vinaychaganti/Documents/RSS%20Feed%20Reader/src/components/AddFeedModal.jsx)
Add keyword search that generates Google News RSS feeds.

### [MODIFY] [App.jsx](file:///Users/vinaychaganti/Documents/RSS%20Feed%20Reader/src/App.jsx)
Wire search state through to ArticleList.

---

## Open Questions

> [!IMPORTANT]
> **Feed search (Item 4)**: The Google News RSS approach is the best zero-cost option. It won't find "Blog X's RSS feed" by typing a keyword — for that, you'd need a paid API like Feedly's. Are you okay with the Google News RSS approach for MVP, knowing you can always paste direct URLs for specific blogs?

> [!NOTE]
> **Drag and drop (Item 2)**: I recommend the context-menu "Move to folder" approach for now. If you'd prefer full drag-and-drop, I can do it but it will add ~3-4 hours. Which do you prefer?
