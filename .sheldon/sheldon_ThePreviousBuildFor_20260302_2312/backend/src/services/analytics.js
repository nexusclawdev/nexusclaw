const fs = require('fs');
const path = require('path');
const { formatDate } = require('../utils/helpers');

// Analytics data storage
const ANALYTICS_FILE = path.join(__dirname, '..\..\data\analytics.json');

class AnalyticsService {
  constructor() {
    this.ensureAnalyticsFile();
  }

  /**
   * Ensure analytics file exists
   */
  ensureAnalyticsFile() {
    if (!fs.existsSync(ANALYTICS_FILE)) {
      fs.writeFileSync(ANALYTICS_FILE, JSON.stringify({
        events: [],
        dailyStats: {},
        totalEvents: 0
      }, null, 2));
    }
  }

  /**
   * Track an analytics event
   * @param {string} type - Event type (e.g., 'login', 'document_create')
   * @param {object} [metadata] - Additional event data
   * @param {object} [user] - User object for user-specific tracking
   */
  trackEvent(type, metadata = {}, user = null) {
    const event = {
      id: Date.now().toString(36),
      type,
      timestamp: formatDate(),
      metadata,
      user: user ? {
        id: user.id,
        email: user.email,
        role: user.role
      } : null,
      ip: this.getClientIP() || 'unknown'
    };

    this.appendEvent(event);
    this.updateDailyStats(event);
  }

  /**
   * Append event to analytics file
   * @param {object} event - Event object
   */
  appendEvent(event) {
    try {
      const data = JSON.parse(fs.readFileSync(ANALYTICS_FILE));
      data.events.push(event);
      data.totalEvents++;
      fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error appending analytics event:', error);
    }
  }

  /**
   * Update daily statistics
   * @param {object} event - Event object
   */
  updateDailyStats(event) {
    try {
      const data = JSON.parse(fs.readFileSync(ANALYTICS_FILE));
      const dateKey = event.timestamp.split('T')[0]; // YYYY-MM-DD

      if (!data.dailyStats[dateKey]) {
        data.dailyStats[dateKey] = {
          date: dateKey,
          totalEvents: 0,
          eventsByType: {},
          uniqueUsers: new Set()
        };
      }

      const daily = data.dailyStats[dateKey];
      daily.totalEvents++;
      daily.eventsByType[event.type] = (daily.eventsByType[event.type] || 0) + 1;
      
      if (event.user) {
        daily.uniqueUsers.add(event.user.id);
      }

      fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error updating daily stats:', error);
    }
  }

  /**
   * Get analytics statistics
   * @param {object} [options] - Query options
   * @param {string} [options.startDate] - Start date (YYYY-MM-DD)
   * @param {string} [options.endDate] - End date (YYYY-MM-DD)
   * @param {string} [options.type] - Event type filter
   * @returns {object} Analytics statistics
   */
  getStats(options = {}) {
    try {
      const data = JSON.parse(fs.readFileSync(ANALYTICS_FILE));
      
      let filteredEvents = data.events;

      // Date range filtering
      if (options.startDate || options.endDate) {
        const startDate = options.startDate ? new Date(options.startDate) : new Date(0);
        const endDate = options.endDate ? new Date(options.endDate) : new Date();
        
        filteredEvents = filteredEvents.filter(event => {
          const eventDate = new Date(event.timestamp);
          return eventDate >= startDate && eventDate <= endDate;
        });
      }

      // Event type filtering
      if (options.type) {
        filteredEvents = filteredEvents.filter(event => event.type === options.type);
      }

      // Calculate statistics
      const stats = {
        totalEvents: filteredEvents.length,
        uniqueUsers: new Set(filteredEvents.map(e => e.user?.id)).size,
        eventsByType: this.countEventsByType(filteredEvents),
        dailyBreakdown: this.getDailyBreakdown(filteredEvents)
      };

      return stats;
    } catch (error) {
      console.error('Error getting analytics stats:', error);
      return { totalEvents: 0, uniqueUsers: 0, eventsByType: {}, dailyBreakdown: {} };
    }
  }

  /**
   * Count events by type
   * @param {array} events - Array of events
   * @returns {object} Event type counts
   */
  countEventsByType(events) {
    return events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Get daily breakdown of events
   * @param {array} events - Array of events
   * @returns {object} Daily event counts
   */
  getDailyBreakdown(events) {
    return events.reduce((acc, event) => {
      const dateKey = event.timestamp.split('T')[0];
      acc[dateKey] = (acc[dateKey] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Get client IP address (for logging)
   * @returns {string} Client IP address
   */
  getClientIP() {
    // In a real application, this would come from req.headers
    // For now, return placeholder
    return '127.0.0.1';
  }

  /**
   * Get recent events
   * @param {number} [limit=50] - Maximum number of events to return
   * @returns {array} Recent events
   */
  getRecentEvents(limit = 50) {
    try {
      const data = JSON.parse(fs.readFileSync(ANALYTICS_FILE));
      return data.events.slice(-limit).reverse();
    } catch (error) {
      console.error('Error getting recent events:', error);
      return [];
    }
  }

  /**
   * Clear analytics data (for testing)
   */
  clearData() {
    try {
      fs.writeFileSync(ANALYTICS_FILE, JSON.stringify({
        events: [],
        dailyStats: {},
        totalEvents: 0
      }, null, 2));
    } catch (error) {
      console.error('Error clearing analytics data:', error);
    }
  }
}

// Export singleton instance
module.exports = new AnalyticsService();