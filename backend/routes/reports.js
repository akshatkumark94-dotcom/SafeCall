const express = require('express');
const router = express.Router();
const { Report } = require('../db');
const { generateReportPDF } = require('../services/pdfService');

// Save a new evidence report
router.post('/', async (req, res) => {
  try {
    const { callerNumber, callerName, threatScore, scamCategory, scamIndicators, transcript, advice } = req.body;
    
    const newReport = await Report.create({
      callerNumber: callerNumber || 'Unknown',
      callerName: callerName || 'Unknown Caller',
      threatScore: threatScore || 0,
      scamCategory: scamCategory || 'Unclassified',
      scamIndicators: scamIndicators || [],
      transcript: transcript || [],
      advice: advice || [],
      createdAt: new Date()
    });

    res.status(201).json({ success: true, report: newReport });
  } catch (error) {
    console.error('[Reports Route] Error saving report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fetch all saved evidence reports
router.get('/', async (req, res) => {
  try {
    const reports = await Report.find({});
    res.json({ success: true, reports });
  } catch (error) {
    console.error('[Reports Route] Error fetching reports:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fetch a single report
router.get('/:id', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }
    res.json({ success: true, report });
  } catch (error) {
    console.error('[Reports Route] Error fetching report by ID:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate and download PDF report
router.get('/:id/pdf', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    // Set response headers for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=SafeCall_Evidence_${report._id}.pdf`);

    // Stream PDF directly to client response
    generateReportPDF(report, res);
  } catch (error) {
    console.error('[Reports Route] Error generating PDF:', error);
    // Only send error if response headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

module.exports = router;
