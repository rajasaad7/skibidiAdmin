# LinkWatcher Analytics - Setup Guide

Your personal real-time analytics system similar to Microsoft Clarity.

## 📋 What's Included

1. **Tracking Script** (`public/analytics.js`) - JavaScript to embed in your website
2. **Backend API** - Endpoints to collect and retrieve analytics data
3. **Database Schema** - Tables to store events and sessions
4. **Real-time Dashboard** - View active users and their activity

## 🚀 Setup Instructions

### Step 1: Create Database Tables

Run the SQL in `database/analytics_schema.sql` in your Supabase SQL editor:

```bash
# Copy the SQL from database/analytics_schema.sql and run it in Supabase
```

This creates:
- `analytics_events` - Stores all user events
- `analytics_sessions` - Tracks active sessions

### Step 2: Update Analytics Script Configuration

Edit `public/analytics.js` and update the endpoint:

```javascript
const CONFIG = {
  endpoint: 'https://your-admin-domain.com/api/analytics/track',  // Update this!
  sessionDuration: 30 * 60 * 1000,
  heartbeatInterval: 10000,
  debug: false  // Set to true for testing
};
```

### Step 3: Add Script to Your Website

Add this to your LinkWatcher website's `<head>` or just before `</body>`:

```html
<!-- Add to your website -->
<script src="https://your-admin-domain.com/analytics.js" async></script>
```

**Important**: Replace `your-admin-domain.com` with your actual admin panel domain.

### Step 4: Configure CORS (if needed)

If your website and admin panel are on different domains, ensure CORS is properly configured in the API route.

The API already includes CORS headers:
```typescript
'Access-Control-Allow-Origin': '*',
'Access-Control-Allow-Methods': 'POST, OPTIONS',
'Access-Control-Allow-Headers': 'Content-Type',
```

### Step 5: Access the Dashboard

Navigate to: `https://your-admin-domain.com/analytics`

## 📊 Features

### Tracking Script Captures:
- ✅ Page views
- ✅ Clicks (with element details)
- ✅ Scroll depth
- ✅ Mouse movements (sampled)
- ✅ Form submissions
- ✅ JavaScript errors
- ✅ Page visibility changes
- ✅ Session duration
- ✅ Device & browser info
- ✅ Screen resolution
- ✅ User location (timezone/language)

### Dashboard Shows:
- 👥 Real-time active users
- 📄 Current page each user is viewing
- 🖱️ User interactions (clicks, scrolls)
- 📱 Device type and browser
- 🌍 Location and language
- ⏱️ Time on page
- 📊 Top pages
- 📈 Activity trends

## 🔧 Customization

### Track Custom Events

You can track custom events from your website:

```javascript
// Track custom event
window.lwTrack('button_click', {
  buttonName: 'Sign Up',
  page: 'Homepage'
});

// Track purchase
window.lwTrack('purchase', {
  amount: 99.99,
  productId: '123'
});
```

### Adjust Tracking Frequency

Edit `public/analytics.js`:

```javascript
const CONFIG = {
  heartbeatInterval: 10000,  // Send heartbeat every 10 seconds
  sessionDuration: 30 * 60 * 1000,  // 30 minute session timeout
};
```

### Data Retention

The schema includes a cleanup function. To automatically delete events older than 30 days:

```sql
-- Run this periodically (e.g., via cron)
SELECT cleanup_old_analytics_events();
```

Or set up a cron job in Supabase:

```sql
-- Create a cron job to run daily at 2 AM
SELECT cron.schedule(
  'cleanup-old-analytics',
  '0 2 * * *',
  $$SELECT cleanup_old_analytics_events()$$
);
```

## 🎯 Use Cases

1. **Monitor Active Users**: See who's on your site right now
2. **Track User Journey**: See which pages users visit
3. **Identify Issues**: Monitor errors and page load times
4. **Optimize UX**: See where users click and scroll
5. **Analyze Traffic**: View real-time page views and top pages

## 🔒 Privacy & Security

- No personal data is collected without consent
- IP addresses are stored for analytics but can be anonymized
- User IDs are random UUIDs, not linked to accounts
- Sessions expire after 30 minutes of inactivity
- All data stays in your own database

## 🐛 Troubleshooting

### Events not showing up?

1. Check browser console for errors (set `debug: true`)
2. Verify the endpoint URL is correct
3. Check CORS configuration
4. Ensure database tables exist
5. Verify Supabase connection

### Dashboard shows no users?

1. Events are considered "active" if received in last 5 minutes
2. Check if the tracking script is loaded on your website
3. Verify API is receiving events: check server logs

### High database usage?

1. Adjust `heartbeatInterval` to reduce events
2. Sample mouse movements less frequently
3. Set up automatic cleanup of old events
4. Archive old data to separate table

## 📈 Performance Tips

1. **Use CDN**: Serve `analytics.js` from a CDN for faster loading
2. **Async Loading**: Always load script with `async` attribute
3. **Batch Events**: Script automatically batches events (10 per request)
4. **Index Database**: Indexes are included in schema for fast queries

## 🔄 Updates & Maintenance

### Update Tracking Script

When you update `public/analytics.js`, users will automatically get the new version on their next visit.

### Monitor Performance

Check your database size and query performance regularly:

```sql
-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename LIKE 'analytics_%';

-- Check recent event count
SELECT COUNT(*) FROM analytics_events
WHERE timestamp > NOW() - INTERVAL '24 hours';
```

## 🆘 Support

For issues or questions:
1. Check browser console logs
2. Review server logs
3. Verify database permissions
4. Test with `debug: true` in CONFIG

---

**Note**: This is your personal analytics system. You have full control over data collection, storage, and privacy.
