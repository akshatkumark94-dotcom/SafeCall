const express = require('express');
const router = express.Router();
const { CommunityReport } = require('../db');
const cache = require('../redis');

// Utility to escape regex special characters to prevent ReDoS / injection
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Add a record to the scam database
router.post('/', async (req, res) => {
  try {
    const { scamValue, type, scamCategory, description, reporterName } = req.body;

    if (!scamValue || !type) {
      return res.status(400).json({ success: false, message: 'scamValue and type are required.' });
    }

    // Clean input
    const cleanedValue = scamValue.trim();

    const newReport = await CommunityReport.create({
      scamValue: cleanedValue,
      type,
      scamCategory: scamCategory || 'Unclassified',
      description: description || '',
      reporterName: reporterName || 'Anonymous',
      createdAt: new Date()
    });

    // Cache the flag status in Redis for quick verification checks
    // Key: sf:check:<value> -> True
    await cache.set(`sf:check:${cleanedValue.toLowerCase()}`, {
      isScam: true,
      category: scamCategory,
      createdAt: newReport.createdAt
    }, 86400 * 7); // Cache for 7 days

    res.status(201).json({ success: true, report: newReport });
  } catch (error) {
    console.error('[Community Route] Error adding report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fetch all reported scams
router.get('/', async (req, res) => {
  try {
    const reports = await CommunityReport.find({});
    res.json({ success: true, reports });
  } catch (error) {
    console.error('[Community Route] Error fetching reports:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search for a specific contact detail in the registry
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, message: 'Query parameter q is required.' });
    }

    const queryStr = q.trim().toLowerCase();

    // Check Redis cache first for super-fast lookups
    const cachedResult = await cache.get(`sf:check:${queryStr}`);
    if (cachedResult) {
      return res.json({
        success: true,
        isScam: true,
        source: 'cache',
        info: cachedResult
      });
    }

    // DB query (case-insensitive regular expression match with ReDoS protection)
    const escapedQuery = escapeRegExp(queryStr);
    const matches = await CommunityReport.find({
      scamValue: new RegExp(escapedQuery, 'i')
    });

    if (matches.length > 0) {
      const summary = {
        isScam: true,
        category: matches[0].scamCategory,
        createdAt: matches[0].createdAt,
        totalReports: matches.length
      };

      // Set cache
      await cache.set(`sf:check:${queryStr}`, summary, 86400); // cache for 1 day

      return res.json({
        success: true,
        isScam: true,
        source: 'db',
        info: summary,
        reports: matches
      });
    }

    res.json({ success: true, isScam: false, message: 'No records found.' });
  } catch (error) {
    console.error('[Community Route] Error searching registry:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fetch summary metrics (scam distribution stats)
router.get('/stats', async (req, res) => {
  try {
    const reports = await CommunityReport.find({});
    
    // Group and count
    const typeCounts = { phone: 0, upi: 0, website: 0, other: 0 };
    const categoryCounts = {};

    reports.forEach(r => {
      if (typeCounts[r.type] !== undefined) {
        typeCounts[r.type]++;
      } else {
        typeCounts.other++;
      }

      const cat = r.scamCategory || 'Unclassified';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    res.json({
      success: true,
      stats: {
        totalReports: reports.length,
        byType: typeCounts,
        byCategory: categoryCounts
      }
    });
  } catch (error) {
    console.error('[Community Route] Error calculating stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
