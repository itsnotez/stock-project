const Parser = require('rss-parser');
const parser = new Parser();

const FEEDS = [
  { url: 'https://feeds.reuters.com/reuters/businessNews', source: 'Reuters', limit: 4 },
  { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', source: 'CNBC', limit: 3 },
  { url: 'https://feeds.apnews.com/rss/apf-business', source: 'AP', limit: 3 },
];

async function fetchFromFeed({ url, source, limit }) {
  try {
    const feed = await parser.parseURL(url);
    return feed.items.slice(0, limit).map(item => ({
      headline: item.title || '',
      source,
      url: item.link || '',
    }));
  } catch (err) {
    console.warn(`[news-crawler] Failed to fetch ${source}: ${err.message}`);
    return [];
  }
}

async function fetchHeadlines() {
  const results = await Promise.all(FEEDS.map(fetchFromFeed));
  return results.flat().slice(0, 10);
}

module.exports = { fetchHeadlines };
