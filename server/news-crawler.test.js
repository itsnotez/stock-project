const { fetchHeadlines } = require('./news-crawler');

describe('fetchHeadlines', () => {
  test('returns array of headline objects', async () => {
    const headlines = await fetchHeadlines();
    expect(Array.isArray(headlines)).toBe(true);
  });

  test('each headline has required fields', async () => {
    const headlines = await fetchHeadlines();
    if (headlines.length > 0) {
      const item = headlines[0];
      expect(item).toHaveProperty('headline');
      expect(item).toHaveProperty('source');
      expect(item).toHaveProperty('url');
      expect(typeof item.headline).toBe('string');
      expect(typeof item.source).toBe('string');
      expect(typeof item.url).toBe('string');
    }
  });

  test('returns at most 10 headlines', async () => {
    const headlines = await fetchHeadlines();
    expect(headlines.length).toBeLessThanOrEqual(10);
  });
});
