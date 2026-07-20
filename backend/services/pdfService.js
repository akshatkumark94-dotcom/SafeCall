const PDFDocument = require('pdfkit');

/**
 * Generates an evidence PDF report for a given call/report structure.
 * Pipes the resulting document directly into the response stream.
 * @param {Object} report 
 * @param {WritableStream} resStream 
 */
function generateReportPDF(report, resStream) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  // Pipe to response
  doc.pipe(resStream);

  // Colors
  const darkNavy = '#0f172a';
  const slateGray = '#475569';
  const alertRed = '#dc2626';
  const warningOrange = '#ea580c';
  const infoBlue = '#2563eb';
  const successGreen = '#16a34a';

  // Determine severity color
  let threatColor = successGreen;
  let threatLevel = 'LOW';
  if (report.threatScore > 75) {
    threatColor = alertRed;
    threatLevel = 'CRITICAL RISK';
  } else if (report.threatScore > 40) {
    threatColor = warningOrange;
    threatLevel = 'MODERATE RISK';
  } else if (report.threatScore > 15) {
    threatColor = infoBlue;
    threatLevel = 'MINOR SUSPICION';
  }

  // --- HEADER SECTION ---
  doc.rect(0, 0, 595.28, 120).fill(darkNavy);
  
  // SafeCall Branding
  doc.fillColor('#ffffff')
     .font('Helvetica-Bold')
     .fontSize(24)
     .text('SafeCall', 50, 40);
  
  doc.font('Helvetica')
     .fontSize(10)
     .fillColor('#94a3b8')
     .text('AI-POWERED REAL-TIME SCAM DETECTION & DIGITAL EVIDENCE REPORT', 50, 68);

  // --- REPORT SUMMARY ---
  doc.fillColor(darkNavy)
     .font('Helvetica-Bold')
     .fontSize(16)
     .text('Evidence Dossier', 50, 150);

  // Horizontal divider
  doc.moveTo(50, 172).lineTo(545, 172).strokeColor('#e2e8f0').lineWidth(1).stroke();

  // Meta Info Box
  let y = 185;
  doc.font('Helvetica-Bold').fontSize(10).fillColor(slateGray).text('Caller Number:', 50, y);
  doc.font('Helvetica').fillColor(darkNavy).text(report.callerNumber || 'Hidden Number', 150, y);
  
  doc.font('Helvetica-Bold').fillColor(slateGray).text('Caller Identity:', 300, y);
  doc.font('Helvetica').fillColor(darkNavy).text(report.callerName || 'Unknown Caller', 400, y);

  y += 20;
  doc.font('Helvetica-Bold').fillColor(slateGray).text('Date & Time:', 50, y);
  doc.font('Helvetica').fillColor(darkNavy).text(new Date(report.createdAt).toLocaleString(), 150, y);

  doc.font('Helvetica-Bold').fillColor(slateGray).text('Scam Category:', 300, y);
  doc.font('Helvetica').fillColor(darkNavy).text(report.scamCategory || 'Unclassified', 400, y);

  // --- THREAT PROFILE PANEL ---
  y += 40;
  doc.rect(50, y, 495, 75).fill('#f8fafc').stroke('#e2e8f0').lineWidth(1).stroke();
  
  // Threat Gauge Text
  doc.fillColor(darkNavy)
     .font('Helvetica-Bold')
     .fontSize(11)
     .text('THREAT ASSESSMENT PROFILE', 65, y + 15);

  doc.fillColor(threatColor)
     .fontSize(22)
     .text(`${report.threatScore}%`, 65, y + 35);
  
  doc.fontSize(10)
     .font('Helvetica-Bold')
     .text(threatLevel, 130, y + 43);

  // Red flags detected
  doc.fillColor(slateGray)
     .font('Helvetica')
     .fontSize(9)
     .text('Key Scam Indicators:', 280, y + 15);
  
  const indicatorsText = report.scamIndicators && report.scamIndicators.length > 0 
    ? report.scamIndicators.join(', ') 
    : 'No clear scam patterns matching standard signatures.';
  
  doc.fillColor(darkNavy)
     .font('Helvetica-Bold')
     .text(indicatorsText, 280, y + 30, { width: 250, lineGap: 3 });

  // --- SUSPICIOUS PHRASES HIGHLIGHTS ---
  y += 100;
  doc.fillColor(darkNavy)
     .font('Helvetica-Bold')
     .fontSize(12)
     .text('AI Detected Red Flags (Conversation Snippets)', 50, y);

  y += 18;
  const filteredPhrases = report.transcript ? report.transcript.filter(l => l.isSuspicious) : [];
  
  if (filteredPhrases.length > 0) {
    filteredPhrases.slice(0, 4).forEach((phraseObj) => {
      doc.rect(50, y, 495, 36).fill('#fef2f2');
      doc.rect(50, y, 4, 36).fill(alertRed);
      
      doc.fillColor(alertRed)
         .font('Helvetica-Bold')
         .fontSize(9)
         .text('FLAGGED PHRASE:', 65, y + 8);
      
      doc.fillColor(darkNavy)
         .font('Helvetica-Oblique')
         .fontSize(9)
         .text(`"${phraseObj.text}"`, 170, y + 8, { width: 360, height: 20, ellipsis: true });

      y += 42;
    });
  } else {
    doc.fillColor(slateGray)
       .font('Helvetica')
       .fontSize(10)
       .text('No isolated highly suspicious phrases flagged.', 65, y + 5);
    y += 25;
  }

  // --- TRANSCRIPT SECTION ---
  doc.fillColor(darkNavy)
     .font('Helvetica-Bold')
     .fontSize(12)
     .text('Complete Interaction Transcript', 50, y + 10);
  
  y += 30;
  
  if (report.transcript && report.transcript.length > 0) {
    report.transcript.forEach((line) => {
      // Basic page overflow handling
      if (y > 720) {
        doc.addPage();
        y = 50; // reset y on new page
      }

      const timeStr = line.timestamp ? new Date(line.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
      const speakerPrefix = `[${timeStr}] ${line.speaker}:`;
      
      doc.font('Helvetica-Bold')
         .fontSize(9)
         .fillColor(line.isSuspicious ? alertRed : slateGray)
         .text(speakerPrefix, 50, y);

      const textX = 160;
      doc.font('Helvetica')
         .fontSize(9)
         .fillColor(line.isSuspicious ? alertRed : darkNavy)
         .text(line.text, textX, y, { width: 380 });

      const textHeight = doc.heightOfString(line.text, { width: 380 });
      y += Math.max(textHeight + 8, 18);
    });
  } else {
    doc.font('Helvetica-Oblique')
       .fontSize(10)
       .fillColor(slateGray)
       .text('Transcript is empty.', 50, y);
    y += 20;
  }

  // --- LEGAL / CYBERCRIME REPORTING GUIDELINES ---
  if (y > 600) {
    doc.addPage();
    y = 50;
  } else {
    y += 20;
  }

  doc.rect(50, y, 495, 120).fill('#eff6ff').stroke('#bfdbfe').lineWidth(1).stroke();
  
  doc.fillColor(infoBlue)
     .font('Helvetica-Bold')
     .fontSize(10)
     .text('HOW TO FILE A REPORT WITH CYBER CRIME AUTHORITIES', 65, y + 15);

  doc.fillColor(darkNavy)
     .font('Helvetica')
     .fontSize(9)
     .text('1. National Cyber Crime Reporting Portal: Visit https://cybercrime.gov.in to lodge a formal complaint.', 65, y + 35)
     .text('2. National Helpline: Call 1930 immediately to freeze fraudulent money transfers (within the golden hour).', 65, y + 50)
     .text('3. Share this Evidence: Export/print this PDF dossier and attach it to your complaint as official transcript evidence.', 65, y + 65)
     .text('4. Block & Report: Mark the numbers, bank details, and UPI IDs on SafeCall and your telecom provider app.', 65, y + 80);

  // Footer message
  doc.fillColor(slateGray)
     .fontSize(8)
     .font('Helvetica')
     .text('SafeCall is an automated AI assistance tool. This report is compiled from user device logs. Generated in real-time.', 50, 770, { align: 'center', width: 495 });

  doc.end();
}

module.exports = {
  generateReportPDF
};
