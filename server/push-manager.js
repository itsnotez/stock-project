require('dotenv').config();
const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

const SUBS_PATH = path.join(__dirname, 'push-subscriptions.json');

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

function loadSubscriptions(filePath = SUBS_PATH) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return [];
  }
}

function saveSubscriptions(subs, filePath = SUBS_PATH) {
  fs.writeFileSync(filePath, JSON.stringify(subs, null, 2), 'utf-8');
}

function addSubscription(subscription, filePath = SUBS_PATH) {
  const subs = loadSubscriptions(filePath);
  const exists = subs.find(s => s.endpoint === subscription.endpoint);
  if (!exists) {
    subs.push(subscription);
    saveSubscriptions(subs, filePath);
  }
}

function removeSubscription(endpoint, filePath = SUBS_PATH) {
  const subs = loadSubscriptions(filePath).filter(s => s.endpoint !== endpoint);
  saveSubscriptions(subs, filePath);
}

async function sendPushNotifications(payload) {
  const subs = loadSubscriptions();
  const results = await Promise.allSettled(
    subs.map(sub => webpush.sendNotification(sub, JSON.stringify(payload)))
  );
  const failed = results.filter(r => r.status === 'rejected');
  if (failed.length > 0) {
    console.warn(`[push-manager] ${failed.length} notifications failed`);
  }
}

module.exports = { loadSubscriptions, saveSubscriptions, addSubscription, removeSubscription, sendPushNotifications };
