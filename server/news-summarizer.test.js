const { summarizeHeadlines, saveCache } = require('./news-summarizer');
const fs = require('fs');
const path = require('path');

describe('summarizeHeadlines', () => {
  test('returns items with summary field added', async () => {
    const input = [
      { headline: 'Fed holds rates steady', source: 'Reuters', url: 'https://example.com/1' },
      { headline: 'Oil prices drop 3%', source: 'CNBC', url: 'https://example.com/2' },
    ];
    const result = await summarizeHeadlines(input);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    result.forEach(item => {
      expect(item).toHaveProperty('headline');
      expect(item).toHaveProperty('summary');
      expect(item).toHaveProperty('source');
      expect(item).toHaveProperty('url');
    });
  });

  test('summary is string or null', async () => {
    const input = [{ headline: 'Test headline', source: 'Test', url: 'https://example.com' }];
    const result = await summarizeHeadlines(input);
    result.forEach(item => {
      expect(item.summary === null || typeof item.summary === 'string').toBe(true);
    });
  });
});

describe('saveCache', () => {
  const testCachePath = path.join(__dirname, 'test-news-cache.json');

  afterEach(() => {
    if (fs.existsSync(testCachePath)) fs.unlinkSync(testCachePath);
  });

  test('writes valid JSON file', () => {
    const news = [{ headline: 'Test', summary: '테스트', source: 'Test', url: 'https://example.com' }];
    saveCache(news, testCachePath);
    const content = JSON.parse(fs.readFileSync(testCachePath, 'utf-8'));
    expect(content).toHaveProperty('date');
    expect(content).toHaveProperty('updatedAt');
    expect(content).toHaveProperty('news');
    expect(content.news).toEqual(news);
  });
});
