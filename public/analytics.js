/**
 * LinkWatcher Analytics - Real-time User Tracking
 * Add this script to your website: <script src="https://your-domain.com/analytics.js"></script>
 */

(function() {
  'use strict';

  const CONFIG = {
    endpoint: 'https://skibidiadmin.linkwatcher.io/api/analytics/track',
    sessionDuration: 30 * 60 * 1000, // 30 minutes
    heartbeatInterval: 10000, // 10 seconds
    debug: false
  };

  class Analytics {
    constructor() {
      this.sessionId = this.getOrCreateSessionId();
      this.userId = this.getOrCreateUserId();
      this.pageLoadTime = Date.now();
      this.lastActivity = Date.now();
      this.events = [];
      this.isActive = true;

      this.init();
    }

    init() {
      this.trackPageView();
      this.setupEventListeners();
      this.startHeartbeat();
      this.setupBeforeUnload();
    }

    getOrCreateSessionId() {
      let sessionId = sessionStorage.getItem('lw_session_id');
      if (!sessionId) {
        sessionId = this.generateId();
        sessionStorage.setItem('lw_session_id', sessionId);
        sessionStorage.setItem('lw_session_start', Date.now().toString());
      }
      return sessionId;
    }

    getOrCreateUserId() {
      let userId = localStorage.getItem('lw_user_id');
      if (!userId) {
        userId = this.generateId();
        localStorage.setItem('lw_user_id', userId);
      }
      return userId;
    }

    generateId() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

    setupEventListeners() {
      // Track clicks
      document.addEventListener('click', (e) => {
        this.trackEvent('click', {
          element: e.target.tagName,
          id: e.target.id,
          class: e.target.className,
          text: e.target.innerText?.substring(0, 50),
          x: e.clientX,
          y: e.clientY
        });
      });

      // Track scrolling
      let scrollTimeout;
      document.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          this.trackEvent('scroll', {
            depth: Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100),
            scrollY: window.scrollY
          });
        }, 500);
      });

      // Track mouse movement (sampled)
      let mouseMoveTimeout;
      document.addEventListener('mousemove', (e) => {
        clearTimeout(mouseMoveTimeout);
        mouseMoveTimeout = setTimeout(() => {
          this.trackEvent('mousemove', {
            x: e.clientX,
            y: e.clientY
          });
        }, 1000);
      });

      // Track form submissions
      document.addEventListener('submit', (e) => {
        this.trackEvent('form_submit', {
          formId: e.target.id,
          formAction: e.target.action
        });
      });

      // Track visibility changes
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.trackEvent('page_hidden');
          this.isActive = false;
        } else {
          this.trackEvent('page_visible');
          this.isActive = true;
        }
      });

      // Track errors
      window.addEventListener('error', (e) => {
        this.trackEvent('error', {
          message: e.message,
          filename: e.filename,
          line: e.lineno,
          column: e.colno
        });
      });
    }

    trackPageView() {
      this.trackEvent('pageview', {
        url: window.location.href,
        path: window.location.pathname,
        title: document.title,
        referrer: document.referrer,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        userAgent: navigator.userAgent,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });
    }

    trackEvent(eventType, data = {}) {
      const event = {
        sessionId: this.sessionId,
        userId: this.userId,
        eventType,
        data,
        timestamp: Date.now(),
        url: window.location.href,
        path: window.location.pathname
      };

      this.events.push(event);
      this.lastActivity = Date.now();

      // Batch send events
      if (this.events.length >= 10) {
        this.sendEvents();
      }

      if (CONFIG.debug) {
        console.log('[Analytics]', eventType, data);
      }
    }

    async sendEvents() {
      if (this.events.length === 0) return;

      const eventsToSend = [...this.events];
      this.events = [];

      try {
        await fetch(CONFIG.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            events: eventsToSend,
            metadata: {
              sessionId: this.sessionId,
              userId: this.userId,
              isActive: this.isActive
            }
          }),
          keepalive: true
        });
      } catch (error) {
        if (CONFIG.debug) {
          console.error('[Analytics] Failed to send events:', error);
        }
        // Re-add events to queue on failure
        this.events = [...eventsToSend, ...this.events];
      }
    }

    startHeartbeat() {
      setInterval(() => {
        if (this.isActive) {
          this.trackEvent('heartbeat', {
            timeOnPage: Date.now() - this.pageLoadTime,
            lastActivity: Date.now() - this.lastActivity
          });
          this.sendEvents();
        }
      }, CONFIG.heartbeatInterval);
    }

    setupBeforeUnload() {
      window.addEventListener('beforeunload', () => {
        this.trackEvent('page_unload', {
          timeOnPage: Date.now() - this.pageLoadTime
        });
        this.sendEvents();
      });
    }
  }

  // Initialize analytics
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.LWAnalytics = new Analytics();
    });
  } else {
    window.LWAnalytics = new Analytics();
  }

  // Expose public API
  window.lwTrack = function(eventType, data) {
    if (window.LWAnalytics) {
      window.LWAnalytics.trackEvent(eventType, data);
    }
  };
})();
