const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel,
        AlignmentType, BorderStyle, WidthType, ShadingType, PageBreak, LevelFormat, UnderlineType } = require('docx');
const fs = require('fs');

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: "1F4E78" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: "4472C4" },
        paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: "70AD47" },
        paragraph: { spacing: { before: 120, after: 80 }, outlineLevel: 2 } },
    ]
  },
  numbering: {
    config: [
      { reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    children: [
      // ==================== TITLE PAGE ====================
      new Paragraph({ children: [new TextRun("")] }),
      new Paragraph({ children: [new TextRun("")] }),
      new Paragraph({ children: [new TextRun("")] }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "SHIFT RWA POINTS ARCHITECTURE", bold: true, size: 36, color: "1F4E78" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Referral Engine & Leaderboard Implementation Plan", bold: true, size: 28, color: "4472C4" })]
      }),
      new Paragraph({ children: [new TextRun("")] }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Version: 2.0", italic: true, size: 24 })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Date: June 9, 2026", italic: true, size: 24 })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Status: Ready for Development", bold: true, size: 24, color: "70AD47" })]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // ==================== TABLE OF CONTENTS ====================
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Table of Contents")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun("Executive Summary")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun("Points Architecture & Multipliers")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun("Referral Commission Engine")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun("Backend Implementation (Phases 1-4)")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun("API Optimization & Caching Strategy")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun("Frontend Implementation (Mobile-First)")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun("Referral Page Design & UX")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun("Leaderboard with New Sort Dimensions")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun("Database Schema & Indexes")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun("Performance & Resource Optimization")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun("Deployment Timeline & Rollout")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // ==================== 1. EXECUTIVE SUMMARY ====================
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("1. Executive Summary")] }),

      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun("This document outlines a production-ready implementation plan for the SHIFT RWA Points Architecture, Referral Commission Engine, and enhanced Leaderboard system. The design prioritizes trading activity (Position SP at 2x multiplier) while supporting community growth (social and referral rewards) without creating unsustainable infrastructure costs.")]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Key Principles")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Position SP drives leaderboard dominance (2x multiplier) — incentivises real on-chain trading and SHIFT RWA token adoption")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Referral rewards are passive but quality-gated — requires active position holding to unlock commission")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Social engagement is valued but not dominant (1.0x) — one-time tasks don't outweigh sustained trading")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Resource-efficient architecture — 12-hour cache windows for expensive calculations, CDN-optimized API responses")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Mobile-first frontend — responsive design works on phones, tablets, and desktop with zero performance degradation")] }),

      new Paragraph({ children: [new TextRun("")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Success Metrics")] }),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3120, 3120, 3120],
        rows: [
          new TableRow({
            children: [
              new TableCell({ borders, shading: { fill: "4472C4", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Metric", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "4472C4", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Current", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "4472C4", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Target (6 weeks)", bold: true, color: "FFFFFF" })] })] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("API latency (p95)")] }),
              new TableCell({ borders, children: [new Paragraph("350ms")] }),
              new TableCell({ borders, children: [new Paragraph("< 200ms")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("Leaderboard cache hit %")] }),
              new TableCell({ borders, children: [new Paragraph("0%")] }),
              new TableCell({ borders, children: [new Paragraph("> 85%")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("Mobile page load (Lighthouse)")] }),
              new TableCell({ borders, children: [new Paragraph("62")] }),
              new TableCell({ borders, children: [new Paragraph("> 85")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("DB query cost per leaderboard sort")] }),
              new TableCell({ borders, children: [new Paragraph("~500ms (full scan)")] }),
              new TableCell({ borders, children: [new Paragraph("< 50ms (indexed + cached)")] }),
            ]
          }),
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // ==================== 2. POINTS ARCHITECTURE ====================
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("2. Points Architecture & Multipliers")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Final Score Formula")] }),
      new Paragraph({
        spacing: { before: 200, after: 200 },
        border: { bottom: { style: BorderStyle.DOUBLE, size: 6, color: "1F4E78", space: 1 } },
        children: [new TextRun({ text: "Final Points = (Position SP × 2.0) + (Social SP × 1.0) + (Referral SP × 0.5)", bold: true, size: 28 })]
      }),

      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: "No caps applied. Every point counts in full. Multipliers drive the composition toward trading-focused leaderboards.", italic: true })]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Why These Multipliers")] }),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2340, 2340, 4680],
        rows: [
          new TableRow({
            children: [
              new TableCell({ borders, shading: { fill: "4472C4", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Component", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "4472C4", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Multiplier", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "4472C4", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Rationale", bold: true, color: "FFFFFF" })] })] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph({ children: [new TextRun({ text: "Position SP", bold: true })] })] }),
              new TableCell({ borders, children: [new Paragraph({ children: [new TextRun({ text: "2.0x", bold: true, color: "70AD47" })] })] }),
              new TableCell({ borders, children: [new Paragraph("Directly drives on-chain volume, SHIFT RWA token adoption, unique holding behavior. Badges (from trading) also grant Position SP. Every dollar traded = higher leaderboard impact.")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph({ children: [new TextRun({ text: "Social SP", bold: true })] })] }),
              new TableCell({ borders, children: [new Paragraph({ children: [new TextRun({ text: "1.0x", bold: true })] })] }),
              new TableCell({ borders, children: [new Paragraph("One-time tasks (follow X, join Discord). Fair credit without outweighing actual trading. Prevents social-only climbers.")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph({ children: [new TextRun({ text: "Referral SP", bold: true })] })] }),
              new TableCell({ borders, children: [new Paragraph({ children: [new TextRun({ text: "0.5x", bold: true })] })] }),
              new TableCell({ borders, children: [new Paragraph("Passive income from bringing others. Monthly cap per pair prevents whale runaway. Incentivises quality network building.")] }),
            ]
          }),
        ]
      }),

      new Paragraph({ children: [new TextRun("")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("What Position SP Includes")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("XP earned from open positions (multiplier × position size × holding time)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Badge XP grants (common +100, rare +150, epic +200, legend +300)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Referral commission SP (earned when referred traders generate SP)")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // ==================== 3. REFERRAL COMMISSION ENGINE ====================
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("3. Referral Commission Engine")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("What Referrers Earn")] }),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [1872, 2340, 2340, 1808],
        rows: [
          new TableRow({
            children: [
              new TableCell({ borders, shading: { fill: "70AD47", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Event", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "70AD47", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "What Referrer Gets", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "70AD47", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "SP Category", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "70AD47", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Recurring?", bold: true, color: "FFFFFF" })] })] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph({ children: [new TextRun("Signup via link")] })] }),
              new TableCell({ borders, children: [new Paragraph("100 XP (flat, one-time)")] }),
              new TableCell({ borders, children: [new Paragraph("Social SP")] }),
              new TableCell({ borders, children: [new Paragraph("No")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph({ children: [new TextRun("First position")] })] }),
              new TableCell({ borders, children: [new Paragraph("Referral activates; commission starts")] }),
              new TableCell({ borders, children: [new Paragraph("—")] }),
              new TableCell({ borders, children: [new Paragraph("—")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, shading: { fill: "FFF2CC", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Referred person earns SP", bold: true })] })] }),
              new TableCell({ borders, shading: { fill: "FFF2CC", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "5–15% of their SP (tier-based)", bold: true })] })] }),
              new TableCell({ borders, shading: { fill: "FFF2CC", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Position SP", bold: true, color: "C65911" })] })] }),
              new TableCell({ borders, shading: { fill: "FFF2CC", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Yes (ongoing)", bold: true })] })] }),
            ]
          }),
        ]
      }),

      new Paragraph({
        spacing: { before: 200, after: 200 },
        children: [new TextRun({ text: "Key: Referrer gets BOTH signup bonus (Social SP) AND ongoing commission (Position SP). Commission only flows when referred person holds active positions.", italic: true })]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Commission Tier Structure")] }),

      new Paragraph({
        spacing: { after: 100 },
        children: [new TextRun("Tier is evaluated dynamically based on referred person's total earned Position SP:")]
      }),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3120, 3120, 3120],
        rows: [
          new TableRow({
            children: [
              new TableCell({ borders, shading: { fill: "4472C4", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Referred Person's Position SP", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "4472C4", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Commission Rate", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "4472C4", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Status", bold: true, color: "FFFFFF" })] })] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("No active position open")] }),
              new TableCell({ borders, children: [new Paragraph({ children: [new TextRun({ text: "0%", bold: true })] })] }),
              new TableCell({ borders, children: [new Paragraph("Inactive")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("1+ position + < 1,000 Position SP")] }),
              new TableCell({ borders, children: [new Paragraph({ children: [new TextRun({ text: "10%", color: "70AD47", bold: true })] })] }),
              new TableCell({ borders, children: [new Paragraph("Tier 1 (entry)")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("1+ position + 1,000–10,000 Position SP")] }),
              new TableCell({ borders, children: [new Paragraph({ children: [new TextRun({ text: "12%", color: "70AD47", bold: true })] })] }),
              new TableCell({ borders, children: [new Paragraph("Tier 2 (active)")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph("1+ position + > 10,000 Position SP")] }),
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "15%", color: "C65911", bold: true })] })] }),
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph("Tier 3 (whale)")] }),
            ]
          }),
        ]
      }),

      new Paragraph({
        spacing: { before: 200, after: 200 },
        children: [new TextRun({ text: "Tier upgrades automatically when referred person crosses thresholds. Commission applies to NEW SP only from the upgrade point (not backdated).", italic: true })]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Monthly Cap (Whale Protection)")] }),

      new Paragraph({
        spacing: { before: 100, after: 100 },
        border: { left: { style: BorderStyle.SINGLE, size: 4, color: "FF0000", space: 1 } },
        children: [new TextRun({ text: "Max commission per referrer–referred pair: 500 Position SP / month", bold: true, color: "C65911" })]
      }),

      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun("After cap is reached: referred person's SP continues normally; commission for THAT PAIR pauses until next month (resets 1st of month); referrer keeps earning from all other referred wallets unaffected.")]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // ==================== 4. BACKEND IMPLEMENTATION ====================
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("4. Backend Implementation (4 Phases)")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Phase 1 — Database Foundation (Days 1–2)")] }),

      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun({ text: "Migration 022: ", bold: true }), new TextRun("Create referral_commissions, referral_monthly_caps tables + add users.referral_commission_sp column")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun({ text: "Migration 023: ", bold: true }), new TextRun("Index creation: (referrer_wallet, month_year), (referred_wallet, earned_at), (wallet, month_year) for fast lookups")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun({ text: "Create referral_stats_cache table: ", bold: true }), new TextRun("stores pre-computed aggregates (referral count, total volume, total holding) — updated every 12 hours")] }),

      new Paragraph({ children: [new TextRun("")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Phase 2 — Core Services (Days 2–3)")] }),

      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun({ text: "ReferralCommissionService: ", bold: true }), new TextRun("calculate(), awardCommission(), checkMonthlyCap(), getTierForWallet()")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun({ text: "UserService: ", bold: true }), new TextRun("calculateFinalPoints() — implements the 2.0x + 1.0x + 0.5x formula with no caps")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun({ text: "LeaderboardCacheService: ", bold: true }), new TextRun("maintains sorted indexes by Final Points, Referral Count, Referred Volume, Referred Holding — cache window 12 hours")] }),

      new Paragraph({ children: [new TextRun("")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Phase 3 — Cron Jobs & Calculation (Days 3–4)")] }),

      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun({ text: "XP cron: ", bold: true }), new TextRun("(existing) calculate position SP → call ReferralCommissionService.calculate() → update referral commission SP")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun({ text: "Final Score cron: ", bold: true }), new TextRun("(new) every 6 hours: fetch all users → calculate Final Points (2.0x + 1.0x + 0.5x) → store in temp table → swap")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun({ text: "Leaderboard cache refresh: ", bold: true }), new TextRun("(new) every 12 hours: compute all 4 sort orders, cache in Redis/Memcached, invalidate on score changes")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun({ text: "Monthly cap reset: ", bold: true }), new TextRun("(new) every 1st of month at 00:00 UTC: reset referral_monthly_caps.total_awarded to 0")] }),

      new Paragraph({ children: [new TextRun("")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Phase 4 — API Endpoints (Day 4)")] }),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2340, 1872, 2340, 2808],
        rows: [
          new TableRow({
            children: [
              new TableCell({ borders, shading: { fill: "4472C4", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Endpoint", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "4472C4", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Method", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "4472C4", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Cache", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "4472C4", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Purpose", bold: true, color: "FFFFFF" })] })] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("GET /api/referral/:wallet")] }),
              new TableCell({ borders, children: [new Paragraph("GET")] }),
              new TableCell({ borders, children: [new Paragraph("1 hour")] }),
              new TableCell({ borders, children: [new Paragraph("Referral dashboard (hero stats, referred users table, tier progress)")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("GET /api/referral/:wallet/referred")] }),
              new TableCell({ borders, children: [new Paragraph("GET")] }),
              new TableCell({ borders, children: [new Paragraph("1 hour")] }),
              new TableCell({ borders, children: [new Paragraph("Full table of referred users (sortable on frontend)")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("GET /api/leaderboard?sort=final_points&limit=100")] }),
              new TableCell({ borders, children: [new Paragraph("GET")] }),
              new TableCell({ borders, children: [new Paragraph("12 hours")] }),
              new TableCell({ borders, children: [new Paragraph("Top 100 by final weighted score")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("GET /api/leaderboard?sort=referral_count")] }),
              new TableCell({ borders, children: [new Paragraph("GET")] }),
              new TableCell({ borders, children: [new Paragraph("12 hours")] }),
              new TableCell({ borders, children: [new Paragraph("Top 100 by number of referrals")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("GET /api/leaderboard?sort=referred_volume")] }),
              new TableCell({ borders, children: [new Paragraph("GET")] }),
              new TableCell({ borders, children: [new Paragraph("12 hours")] }),
              new TableCell({ borders, children: [new Paragraph("Top 100 by total volume of referred traders")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph("GET /api/leaderboard?sort=referred_holding")] }),
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph("GET")] }),
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph("12 hours")] }),
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph("Top 100 by current holding value of referred traders")] }),
            ]
          }),
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // ==================== 5. API OPTIMIZATION & CACHING ====================
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("5. API Optimization & Caching Strategy")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Problem: Expensive Calculations")] }),

      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Leaderboard sorts require joining 5+ tables (users, positions, badges, referral_commissions) and sorting 18K+ wallets")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Referral Volume/Holding aggregates involve SUM() across all positions of all referred wallets — O(n²) at scale")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Real-time calculations would cost 500–1500ms per query × 100 page loads/min = 50–150 seconds CPU per minute")] }),

      new Paragraph({ children: [new TextRun("")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Solution: Tiered Caching")] }),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [1872, 1872, 1872, 1872, 1872],
        rows: [
          new TableRow({
            children: [
              new TableCell({ borders, shading: { fill: "70AD47", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Layer", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "70AD47", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Technology", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "70AD47", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "TTL", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "70AD47", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Invalidation", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "70AD47", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Cost Savings", bold: true, color: "FFFFFF" })] })] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("CDN Edge")] }),
              new TableCell({ borders, children: [new Paragraph("Cloudflare/AWS CloudFront")] }),
              new TableCell({ borders, children: [new Paragraph("1 hour")] }),
              new TableCell({ borders, children: [new Paragraph("Manual (after leaderboard refresh)")] }),
              new TableCell({ borders, children: [new Paragraph("95% of page loads hit CDN (no origin hit)")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("Application Cache")] }),
              new TableCell({ borders, children: [new Paragraph("Redis (sorted sets for rankings)")] }),
              new TableCell({ borders, children: [new Paragraph("12 hours")] }),
              new TableCell({ borders, children: [new Paragraph("On cron refresh (or immediate on whale event)")] }),
              new TableCell({ borders, children: [new Paragraph("90% hit rate on leaderboard queries")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, shading: { fill: "FFF2CC", type: ShadingType.CLEAR }, children: [new Paragraph("Aggregation Cache")] }),
              new TableCell({ borders, shading: { fill: "FFF2CC", type: ShadingType.CLEAR }, children: [new Paragraph("referral_stats_cache table")] }),
              new TableCell({ borders, shading: { fill: "FFF2CC", type: ShadingType.CLEAR }, children: [new Paragraph("12 hours")] }),
              new TableCell({ borders, shading: { fill: "FFF2CC", type: ShadingType.CLEAR }, children: [new Paragraph("Batch recalc (off-peak)")] }),
              new TableCell({ borders, shading: { fill: "FFF2CC", type: ShadingType.CLEAR }, children: [new Paragraph("Eliminates O(n²) joins")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("DB Indexes")] }),
              new TableCell({ borders, children: [new Paragraph("PostgreSQL B-tree + hash")] }),
              new TableCell({ borders, children: [new Paragraph("—")] }),
              new TableCell({ borders, children: [new Paragraph("—")] }),
              new TableCell({ borders, children: [new Paragraph("< 50ms on indexed queries")] }),
            ]
          }),
        ]
      }),

      new Paragraph({
        spacing: { before: 200, after: 200 },
        children: [new TextRun({ text: "Why 12-hour window? Leaderboards change gradually (minutes to hours for users to earn enough SP to move rank). 12-hour updates are imperceptible but reduce load by 99% vs real-time.", italic: true })]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Cache Invalidation Strategy")] }),

      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun("Scheduled refresh: Leaderboard cache rebuilds every 12 hours (00:00, 12:00 UTC) off-peak")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun("Whale event: If any user's referral commission crosses 500 SP cap mid-month, invalidate that wallet's row (direct update to cache, not full rebuild)")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun("User endpoint cache: /api/referral/:wallet expires after 1 hour OR when that wallet's position changes (positions cron triggers invalidation)")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun("CDN cache: Leaderboard pages cache at CDN for 1 hour (revalidate on refresh)")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // ==================== 6. FRONTEND IMPLEMENTATION ====================
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("6. Frontend Implementation (Mobile-First Design)")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Core Principle: Mobile-First, Progressive Enhancement")] }),

      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun("All components designed for mobile screens first (< 480px), then scaled up. Zero JavaScript blocking render. Images lazy-loaded. API calls concurrent, not sequential.")]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Responsive Breakpoints")] }),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [1560, 1560, 1560, 1560, 2520],
        rows: [
          new TableRow({
            children: [
              new TableCell({ borders, shading: { fill: "4472C4", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Device", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "4472C4", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Width", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "4472C4", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Layout", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "4472C4", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Columns", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "4472C4", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Notes", bold: true, color: "FFFFFF" })] })] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("Mobile")] }),
              new TableCell({ borders, children: [new Paragraph("< 480px")] }),
              new TableCell({ borders, children: [new Paragraph("Stacked")] }),
              new TableCell({ borders, children: [new Paragraph("1")] }),
              new TableCell({ borders, children: [new Paragraph("Cards, bottom sheet for dropdowns")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("Tablet")] }),
              new TableCell({ borders, children: [new Paragraph("480–1024px")] }),
              new TableCell({ borders, children: [new Paragraph("2-col")] }),
              new TableCell({ borders, children: [new Paragraph("2")] }),
              new TableCell({ borders, children: [new Paragraph("Side nav collapsible")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph("Desktop")] }),
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph("> 1024px")] }),
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph("3-col")] }),
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph("3–4")] }),
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph("Full sidebar, detailed tables")] }),
            ]
          }),
        ]
      }),

      new Paragraph({ children: [new TextRun("")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Performance Targets")] }),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3120, 3120, 3120],
        rows: [
          new TableRow({
            children: [
              new TableCell({ borders, shading: { fill: "70AD47", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Metric", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "70AD47", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Target", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "70AD47", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "How", bold: true, color: "FFFFFF" })] })] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("Lighthouse Score (Mobile)")] }),
              new TableCell({ borders, children: [new Paragraph("> 85")] }),
              new TableCell({ borders, children: [new Paragraph("Lazy-load images, minimize CSS, no render-blocking JS")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("First Contentful Paint")] }),
              new TableCell({ borders, children: [new Paragraph("< 1.5s (mobile)")] }),
              new TableCell({ borders, children: [new Paragraph("Critical CSS inline, deferred JS")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("Largest Contentful Paint")] }),
              new TableCell({ borders, children: [new Paragraph("< 2.5s")] }),
              new TableCell({ borders, children: [new Paragraph("Optimized image sizes, async API calls")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph("Bundle Size (gzipped)")] }),
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph("< 80 KB")] }),
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph("Code-split, tree-shake, minify")] }),
            ]
          }),
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // ==================== 7. REFERRAL PAGE DESIGN ====================
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("7. Referral Page Design (`/referral`) — UI/UX Specs")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Mobile Layout (< 480px)")] }),

      new Paragraph({
        spacing: { after: 100 },
        children: [new TextRun("Page structure (top-to-bottom):")]
      }),

      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun({ text: "Hero Section (sticky header)", bold: true }), new TextRun(": Your referral link card with copy/share buttons. Single column.")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun({ text: "Stats Pills", bold: true }), new TextRun(": 3 pills stacked vertically: Total Referred | Active Traders | Commission Earned. Each pill shows number + label in sans-serif bold.")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun({ text: "Tier Progress (optional collapse)", bold: true }), new TextRun(": Shows how many more SP until next tier unlock. Use progress bar (green fill).")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun({ text: "Referred Users List", bold: true }), new TextRun(": Card-based layout. Each card: wallet truncation | status badge | holding value (prominent) | commission rate. Tap card to expand full details.")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun({ text: "Sort/Filter Sticky Tab Bar", bold: true }), new TextRun(": 3 tabs: Holding ↓ | Volume ↓ | Recent. Tap to resort (no page reload — filter in-memory on frontend).")] }),

      new Paragraph({ children: [new TextRun("")] }),
      new Paragraph({
        spacing: { after: 100 },
        children: [new TextRun({ text: "Design principles:", italic: true })]
      }),

      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Color: Primary action (copy link, share) = bright green (#70AD47). Status active = green, inactive = gray.")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Spacing: 16px base unit. Cards have 12px padding. No widows/orphans.")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Typography: -apple-system font stack. Body 14px, labels 12px, stats 24px bold.")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Referral status shown FIRST (before other details) — emphasizes that active holding is the gate to commission")] }),

      new Paragraph({ children: [new TextRun("")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Desktop Layout (> 1024px)")] }),

      new Paragraph({
        spacing: { after: 100 },
        children: [new TextRun("Two-column grid layout:")]
      }),

      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun({ text: "Left Column (1/3 width):", bold: true }), new TextRun(" Hero section fixed (sticky on scroll). Link copy button, share on X button. Below: 3 stats cards stacked.")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun({ text: "Right Column (2/3 width):", bold: true }), new TextRun(" Full referred users table. Columns: Wallet | Status | Open Positions | Holding Value | Volume | Your Commission | Tier | Action (detail dropdown).")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun({ text: "Sort Bar (sticky above table):", bold: true }), new TextRun(" Inline buttons (Holding ↑↓, Volume ↑↓, Recent). Click to resort; table rebinds instantly from cache (no API call).")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // ==================== 8. LEADERBOARD ENHANCEMENTS ====================
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("8. Leaderboard with New Sort Dimensions")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Sort Options (Tabs)")] }),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [1872, 1872, 1872, 1872, 1872],
        rows: [
          new TableRow({
            children: [
              new TableCell({ borders, shading: { fill: "4472C4", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Tab Label", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "4472C4", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Sorts By", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "4472C4", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Use Case", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "4472C4", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Cache", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "4472C4", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Mobile?", bold: true, color: "FFFFFF" })] })] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("🏆 Final Points (default)")] }),
              new TableCell({ borders, children: [new Paragraph("(POS×2 + SOC×1 + REF×0.5)")] }),
              new TableCell({ borders, children: [new Paragraph("Overall rank")] }),
              new TableCell({ borders, children: [new Paragraph("12h")] }),
              new TableCell({ borders, children: [new Paragraph("Yes")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("📈 Highest Referrals")] }),
              new TableCell({ borders, children: [new Paragraph("Count of referred wallets")] }),
              new TableCell({ borders, children: [new Paragraph("Community builders")] }),
              new TableCell({ borders, children: [new Paragraph("12h")] }),
              new TableCell({ borders, children: [new Paragraph("Yes")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("💰 Referred Volume")] }),
              new TableCell({ borders, children: [new Paragraph("Sum of all referred wallets' total position_size_usd")] }),
              new TableCell({ borders, children: [new Paragraph("Network traders (most active)")] }),
              new TableCell({ borders, children: [new Paragraph("12h")] }),
              new TableCell({ borders, children: [new Paragraph("Yes")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph("🏦 Referred Holding")] }),
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph("Sum of all referred wallets' current open position_size_usd")] }),
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph("Network quality (active holders)")] }),
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph("12h")] }),
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph("Yes")] }),
            ]
          }),
        ]
      }),

      new Paragraph({ children: [new TextRun("")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Leaderboard Row Enhancements")] }),

      new Paragraph({
        spacing: { after: 100 },
        children: [new TextRun("Every row now shows:")]
      }),

      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun("Rank | Wallet | Final Points | 2 new inline chips:")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun("Chip 1: "), new TextRun({ text: "\"42 referred\"", italic: true }), new TextRun(" (links to /referral/wallet public summary)")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun("Chip 2: "), new TextRun({ text: "\"$2,450 network value\"", italic: true }), new TextRun(" (sum of open position sizes of all referred wallets)")] }),

      new Paragraph({
        spacing: { before: 100, after: 100 },
        children: [new TextRun({ text: "Chips are visible on all leaderboard sorts (not just referral tabs). Encourages users to notice network size/value even when browsing by Final Points.", italic: true })]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Mobile: Collapsible Leaderboard Details")] }),

      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun("On mobile (< 480px), table columns condense. Show rank | wallet | points on row, tap row to expand bottom sheet with all details (referral count, network value, individual commission breakdowns).")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // ==================== 9. DATABASE SCHEMA ====================
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("9. Database Schema & Indexes")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("New Tables (Migration 022)")] }),

      new Paragraph({
        spacing: { after: 100 },
        children: [new TextRun("Table: referral_commissions")]
      }),

      new Paragraph({
        spacing: { before: 50, after: 150 },
        border: { left: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC", space: 1 } },
        children: [new TextRun({ text: "CREATE TABLE referral_commissions (\n  id SERIAL PRIMARY KEY,\n  referrer_wallet VARCHAR(255) NOT NULL,\n  referred_wallet VARCHAR(255) NOT NULL,\n  commission_rate NUMERIC(4,2) NOT NULL,\n  sp_awarded NUMERIC(18,4) NOT NULL,\n  source_sp NUMERIC(18,4),\n  month_year CHAR(7),\n  awarded_at TIMESTAMP DEFAULT NOW(),\n  UNIQUE(referrer_wallet, referred_wallet, awarded_at)\n);", font: "Courier New", size: 18 })]
      }),

      new Paragraph({
        spacing: { after: 100 },
        children: [new TextRun("Table: referral_monthly_caps")]
      }),

      new Paragraph({
        spacing: { before: 50, after: 150 },
        border: { left: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC", space: 1 } },
        children: [new TextRun({ text: "CREATE TABLE referral_monthly_caps (\n  referrer_wallet VARCHAR(255) NOT NULL,\n  referred_wallet VARCHAR(255) NOT NULL,\n  month_year CHAR(7) NOT NULL,\n  total_awarded NUMERIC(18,4) DEFAULT 0,\n  PRIMARY KEY(referrer_wallet, referred_wallet, month_year)\n);", font: "Courier New", size: 18 })]
      }),

      new Paragraph({
        spacing: { after: 100 },
        children: [new TextRun("Table: referral_stats_cache (NEW — pre-computed aggregates)")]
      }),

      new Paragraph({
        spacing: { before: 50, after: 150 },
        border: { left: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC", space: 1 } },
        children: [new TextRun({ text: "CREATE TABLE referral_stats_cache (\n  referrer_wallet VARCHAR(255) PRIMARY KEY,\n  referral_count INT,\n  total_volume NUMERIC(18,4),\n  total_holding NUMERIC(18,4),\n  last_updated TIMESTAMP DEFAULT NOW()\n);", font: "Courier New", size: 18 })]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Indexes (Migration 023)")] }),

      new Paragraph({
        spacing: { after: 100 },
        children: [new TextRun("Fast lookups for commission calculations:")]
      }),

      new Paragraph({
        spacing: { before: 50, after: 100 },
        border: { left: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC", space: 1 } },
        children: [new TextRun({ text: "CREATE INDEX idx_referral_commissions_referrer_month\nON referral_commissions(referrer_wallet, month_year, sp_awarded DESC);\n\nCREATE INDEX idx_referral_commissions_referred\nON referral_commissions(referred_wallet, awarded_at DESC);\n\nCREATE INDEX idx_referral_monthly_caps_pair_month\nON referral_monthly_caps(referrer_wallet, referred_wallet, month_year);\n\nCREATE INDEX idx_referral_stats_cache_referrer\nON referral_stats_cache(referrer_wallet);", font: "Courier New", size: 18 })]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // ==================== 10. PERFORMANCE & RESOURCE OPTIMIZATION ====================
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("10. Performance & Resource Optimization")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Load Reduction Targets")] }),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2340, 1872, 1872, 1872, 1404],
        rows: [
          new TableRow({
            children: [
              new TableCell({ borders, shading: { fill: "70AD47", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Metric", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "70AD47", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Before", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "70AD47", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "After", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "70AD47", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Savings", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "70AD47", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Method", bold: true, color: "FFFFFF" })] })] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("Leaderboard DB queries")] }),
              new TableCell({ borders, children: [new Paragraph("500ms (full scan)")] }),
              new TableCell({ borders, children: [new Paragraph("0ms (Redis cache)")] }),
              new TableCell({ borders, children: [new Paragraph("99.9%")] }),
              new TableCell({ borders, children: [new Paragraph("Redis sorted set")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("Referral aggregate queries")] }),
              new TableCell({ borders, children: [new Paragraph("800ms (O(n²) join)")] }),
              new TableCell({ borders, children: [new Paragraph("10ms (cache table)")] }),
              new TableCell({ borders, children: [new Paragraph("98.75%")] }),
              new TableCell({ borders, children: [new Paragraph("Batch precalc")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("API response size")] }),
              new TableCell({ borders, children: [new Paragraph("2.5 MB")] }),
              new TableCell({ borders, children: [new Paragraph("180 KB (gzipped)")] }),
              new TableCell({ borders, children: [new Paragraph("92.8%")] }),
              new TableCell({ borders, children: [new Paragraph("Field filtering")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph("Page load time (p95)")] }),
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph("1.2s (mobile)")] }),
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph("450ms")] }),
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph("62.5%")] }),
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph("CDN + cache")] }),
            ]
          }),
        ]
      }),

      new Paragraph({ children: [new TextRun("")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Why 12-Hour Cache Windows (Not Real-Time)")] }),

      new Paragraph({
        spacing: { before: 100, after: 100 },
        border: { left: { style: BorderStyle.SINGLE, size: 4, color: "FF9900", space: 1 } },
        children: [new TextRun({ text: "User behavior: A typical user earns SP over hours/days. Moving 10 positions on a 18K-user leaderboard takes ~10,000 SP, which is 10+ days of trading at testnet scale. Users don't expect real-time rank updates.", bold: true })]
      }),

      new Paragraph({
        spacing: { before: 100, after: 100 },
        border: { left: { style: BorderStyle.SINGLE, size: 4, color: "FF9900", space: 1 } },
        children: [new TextRun({ text: "Cost of real-time: 18K users × 10 sorts × 5 queries/minute = 900K queries/min = 500+ seconds CPU cost/min (unsustainable).", bold: true })]
      }),

      new Paragraph({
        spacing: { before: 100, after: 200 },
        border: { left: { style: BorderStyle.SINGLE, size: 4, color: "FF9900", space: 1 } },
        children: [new TextRun({ text: "12-hour window: Refresh at 00:00 and 12:00 UTC (off-peak). Users never notice stale data (leaderboard updates once per 12 hours). Cost: 2 full-scan queries per day = trivial.", bold: true })]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // ==================== 11. DEPLOYMENT TIMELINE ====================
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("11. Deployment Timeline & Rollout Strategy")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Week 1: Backend Foundation (Days 1–5)")] }),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [936, 1872, 2808, 1872, 1872],
        rows: [
          new TableRow({
            children: [
              new TableCell({ borders, shading: { fill: "4472C4", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Day", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "4472C4", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Task", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "4472C4", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Owner", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "4472C4", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Hours", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "4472C4", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Status", bold: true, color: "FFFFFF" })] })] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("1")] }),
              new TableCell({ borders, children: [new Paragraph("Migrations 022–023: new tables, indexes")] }),
              new TableCell({ borders, children: [new Paragraph("Backend lead")] }),
              new TableCell({ borders, children: [new Paragraph("4")] }),
              new TableCell({ borders, children: [new Paragraph("PR → Review → Merge")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("2")] }),
              new TableCell({ borders, children: [new Paragraph("ReferralCommissionService + UserService (weighted formula)")] }),
              new TableCell({ borders, children: [new Paragraph("Backend engineer")] }),
              new TableCell({ borders, children: [new Paragraph("8")] }),
              new TableCell({ borders, children: [new Paragraph("Unit tests + integration")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("3")] }),
              new TableCell({ borders, children: [new Paragraph("Cron job updates: commission calc, cache refresh")] }),
              new TableCell({ borders, children: [new Paragraph("Backend engineer")] }),
              new TableCell({ borders, children: [new Paragraph("6")] }),
              new TableCell({ borders, children: [new Paragraph("Staging test")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("4")] }),
              new TableCell({ borders, children: [new Paragraph("API endpoints (4 leaderboard sorts + referral endpoints)")] }),
              new TableCell({ borders, children: [new Paragraph("Backend engineer")] }),
              new TableCell({ borders, children: [new Paragraph("8")] }),
              new TableCell({ borders, children: [new Paragraph("API test")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph("5")] }),
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph("Load testing, cache tuning")] }),
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph("DevOps")] }),
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph("4")] }),
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph("Ready to deploy")] }),
            ]
          }),
        ]
      }),

      new Paragraph({
        spacing: { before: 200, after: 200 },
        children: [new TextRun({ text: "Week 1 Outcome: Backend fully deployed to staging. All API endpoints live (feature-flagged, inactive by default).", bold: true })]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Week 2: Frontend & UI (Days 6–12)")] }),

      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun("Parallel work: Designers create Figma mockups (Days 1–2); Engineers implement components (Days 3–5); QA & Lighthouse optimization (Days 6+).")]
      }),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [936, 2340, 2340, 1872, 1872],
        rows: [
          new TableRow({
            children: [
              new TableCell({ borders, shading: { fill: "70AD47", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Day", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "70AD47", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Task", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "70AD47", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Owner", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "70AD47", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Hours", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "70AD47", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Status", bold: true, color: "FFFFFF" })] })] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("6–7")] }),
              new TableCell({ borders, children: [new Paragraph("Referral page desktop + mobile components")] }),
              new TableCell({ borders, children: [new Paragraph("Frontend lead + 2 engineers")] }),
              new TableCell({ borders, children: [new Paragraph("12")] }),
              new TableCell({ borders, children: [new Paragraph("Code review")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("8")] }),
              new TableCell({ borders, children: [new Paragraph("Leaderboard new sort tabs + row chips")] }),
              new TableCell({ borders, children: [new Paragraph("Frontend engineer")] }),
              new TableCell({ borders, children: [new Paragraph("6")] }),
              new TableCell({ borders, children: [new Paragraph("Feature branch")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("9")] }),
              new TableCell({ borders, children: [new Paragraph("Mobile optimization: responsive grids, touch targets")] }),
              new TableCell({ borders, children: [new Paragraph("Frontend engineer")] }),
              new TableCell({ borders, children: [new Paragraph("4")] }),
              new TableCell({ borders, children: [new Paragraph("Device testing")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("10–12")] }),
              new TableCell({ borders, children: [new Paragraph("Lighthouse optimization, bundle tuning, QA")] }),
              new TableCell({ borders, children: [new Paragraph("QA + Frontend")] }),
              new TableCell({ borders, children: [new Paragraph("8")] }),
              new TableCell({ borders, children: [new Paragraph("Ready for prod")] }),
            ]
          }),
        ]
      }),

      new Paragraph({
        spacing: { before: 200, after: 200 },
        children: [new TextRun({ text: "Week 2 Outcome: All UI components live on staging. Mobile Lighthouse > 85. Ready for feature flag enablement.", bold: true })]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Week 3: Backfill & Production (Days 13–16)")] }),

      new Paragraph({
        spacing: { before: 100, after: 200 },
        children: [new TextRun("Day 13: Run historical commission backfill (offline script) for all May 26 → June 9 referral activity. Verify results against expected distribution. Day 14: Enable feature flags (5% traffic). Day 15: 50% traffic. Day 16: 100% traffic + full monitoring.")]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // ==================== CONCLUSION ====================
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Conclusion")] }),

      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun("This plan delivers a production-grade referral and points system that incentivises trading (2x multiplier), rewards quality social engagement (1x), and creates sustainable passive income for community builders (0.5x with monthly caps and quality gates). The 12-hour cache strategy keeps infrastructure costs low while providing imperceptible staleness to users. Mobile-first design ensures all 18K users have a fast, responsive experience regardless of device.")]
      }),

      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun("Total estimated effort: ~3 weeks. Estimated resource cost savings vs real-time calculation: 95%+. Expected Lighthouse score: > 85. Expected API latency (p95): < 200ms.")]
      }),

      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: "Ready to proceed to engineering sprints.", bold: true, color: "70AD47" })]
      }),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("C:\\Users\\Axel\\Downloads\\SHIFT_RWA_IMPLEMENTATION_PLAN.docx", buffer);
  console.log("✅ Document created: SHIFT_RWA_IMPLEMENTATION_PLAN.docx");
});
