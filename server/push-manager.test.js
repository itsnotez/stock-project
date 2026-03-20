const { addSubscription, removeSubscription, loadSubscriptions, saveSubscriptions } = require('./push-manager');
const fs = require('fs');
const path = require('path');

const TEST_PATH = path.join(__dirname, 'test-push-subscriptions.json');

describe('subscription storage', () => {
  afterEach(() => {
    if (fs.existsSync(TEST_PATH)) fs.unlinkSync(TEST_PATH);
  });

  test('saveSubscriptions writes JSON file', () => {
    const subs = [{ endpoint: 'https://example.com/push/1', keys: { auth: 'a', p256dh: 'b' } }];
    saveSubscriptions(subs, TEST_PATH);
    const content = JSON.parse(fs.readFileSync(TEST_PATH, 'utf-8'));
    expect(content).toEqual(subs);
  });

  test('loadSubscriptions returns empty array when file missing', () => {
    const result = loadSubscriptions(TEST_PATH);
    expect(result).toEqual([]);
  });

  test('loadSubscriptions reads saved subscriptions', () => {
    const subs = [{ endpoint: 'https://example.com/push/1', keys: {} }];
    saveSubscriptions(subs, TEST_PATH);
    const result = loadSubscriptions(TEST_PATH);
    expect(result).toEqual(subs);
  });

  test('addSubscription adds new entry', () => {
    const sub = { endpoint: 'https://example.com/push/2', keys: {} };
    addSubscription(sub, TEST_PATH);
    const result = loadSubscriptions(TEST_PATH);
    expect(result).toContainEqual(sub);
  });

  test('addSubscription does not duplicate by endpoint', () => {
    const sub = { endpoint: 'https://example.com/push/2', keys: {} };
    addSubscription(sub, TEST_PATH);
    addSubscription(sub, TEST_PATH);
    const result = loadSubscriptions(TEST_PATH);
    expect(result.filter(s => s.endpoint === sub.endpoint).length).toBe(1);
  });

  test('removeSubscription removes by endpoint', () => {
    const sub = { endpoint: 'https://example.com/push/3', keys: {} };
    addSubscription(sub, TEST_PATH);
    removeSubscription(sub.endpoint, TEST_PATH);
    const result = loadSubscriptions(TEST_PATH);
    expect(result.find(s => s.endpoint === sub.endpoint)).toBeUndefined();
  });
});
