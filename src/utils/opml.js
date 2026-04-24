export function parseOPML(xmlString) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
  
  if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Invalid XML format');
  }

  const feeds = [];
  
  // Find all outline nodes directly in the body
  const rootOutlines = xmlDoc.querySelectorAll('body > outline');
  
  rootOutlines.forEach(outline => {
    // Check if it's a folder (has nested outlines and usually no xmlUrl)
    const children = Array.from(outline.children).filter(child => child.tagName.toLowerCase() === 'outline');
    
    if (children.length > 0) {
      // It's a folder
      const folderName = outline.getAttribute('title') || outline.getAttribute('text') || 'Uncategorized';
      
      children.forEach(child => {
        const xmlUrl = child.getAttribute('xmlUrl');
        if (xmlUrl) {
          feeds.push({
            title: child.getAttribute('title') || child.getAttribute('text') || xmlUrl,
            url: xmlUrl,
            siteUrl: child.getAttribute('htmlUrl') || '',
            folderName: folderName
          });
        }
      });
    } else {
      // It's a direct feed
      const xmlUrl = outline.getAttribute('xmlUrl');
      if (xmlUrl) {
        feeds.push({
          title: outline.getAttribute('title') || outline.getAttribute('text') || xmlUrl,
          url: xmlUrl,
          siteUrl: outline.getAttribute('htmlUrl') || '',
          folderName: null
        });
      }
    }
  });

  // Also catch any deeply nested ones just in case Feedly exports them weirdly
  // but avoid duplicating the ones we already found.
  const allFeeds = Array.from(xmlDoc.querySelectorAll('outline[xmlUrl]'));
  const existingUrls = new Set(feeds.map(f => f.url));
  
  allFeeds.forEach(feedNode => {
    const xmlUrl = feedNode.getAttribute('xmlUrl');
    if (xmlUrl && !existingUrls.has(xmlUrl)) {
      // Try to find parent folder if it exists
      const parent = feedNode.parentElement;
      let folderName = null;
      if (parent && parent.tagName.toLowerCase() === 'outline') {
        folderName = parent.getAttribute('title') || parent.getAttribute('text');
      }
      
      feeds.push({
        title: feedNode.getAttribute('title') || feedNode.getAttribute('text') || xmlUrl,
        url: xmlUrl,
        siteUrl: feedNode.getAttribute('htmlUrl') || '',
        folderName: folderName
      });
      existingUrls.add(xmlUrl);
    }
  });

  return feeds;
}

export function generateOPML(feeds, folders) {
  // Map folders for easy lookup
  const folderMap = {};
  folders.forEach(f => {
    folderMap[f.id] = f.name;
  });

  // Group feeds by folder
  const feedsByFolder = { uncategorized: [] };
  folders.forEach(f => {
    feedsByFolder[f.id] = [];
  });

  feeds.forEach(feed => {
    if (feed.folderId && feedsByFolder[feed.folderId]) {
      feedsByFolder[feed.folderId].push(feed);
    } else {
      feedsByFolder.uncategorized.push(feed);
    }
  });

  // Generate XML
  const escapeXML = (str) => {
    if (!str) return '';
    return str.replace(/[<>&'"]/g, c => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  };

  let opml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Atlas Pulse Subscriptions</title>
    <dateCreated>${new Date().toUTCString()}</dateCreated>
  </head>
  <body>\n`;

  // Write categorized feeds
  for (const folderId in feedsByFolder) {
    if (folderId === 'uncategorized') continue;
    
    const folderFeeds = feedsByFolder[folderId];
    if (folderFeeds.length === 0) continue;
    
    const folderName = escapeXML(folderMap[folderId]);
    opml += `    <outline text="${folderName}" title="${folderName}">\n`;
    
    folderFeeds.forEach(feed => {
      const title = escapeXML(feed.title);
      const xmlUrl = escapeXML(feed.url);
      const htmlUrl = escapeXML(feed.siteUrl);
      opml += `      <outline type="rss" text="${title}" title="${title}" xmlUrl="${xmlUrl}" htmlUrl="${htmlUrl}" />\n`;
    });
    
    opml += `    </outline>\n`;
  }

  // Write uncategorized feeds
  feedsByFolder.uncategorized.forEach(feed => {
    const title = escapeXML(feed.title);
    const xmlUrl = escapeXML(feed.url);
    const htmlUrl = escapeXML(feed.siteUrl);
    opml += `    <outline type="rss" text="${title}" title="${title}" xmlUrl="${xmlUrl}" htmlUrl="${htmlUrl}" />\n`;
  });

  opml += `  </body>\n</opml>`;
  return opml;
}
