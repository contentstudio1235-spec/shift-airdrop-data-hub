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
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "WITH LEGACY REFERRER MIGRATION STRATEGY", bold: true, size: 24, color: "C65911" })]
      }),
      new Paragraph({ children: [new TextRun("")] }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Version: 2.1", italic: true, size: 24 })]
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

      // ==================== SECTION: LEGACY REFERRER MIGRATION ====================
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("4.5 Legacy Referrer Migration & Pending Balance Strategy")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Problem Statement")] }),

      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun("The referral commission system launches at timestamp T. Before T, referrers earned 100 XP per signup (Snag social reward). After T, they earn 10–15% of referred person's Position SP (passive Position SP commission). Legacy referrers who built networks before T should receive backfilled commission on all historical referred-person SP, displayed as 'Pending Referral Balance' until they explicitly claim or auto-claim.")]
      }),

      new Paragraph({
        spacing: { before: 100, after: 200 },
        border: { left: { style: BorderStyle.DOUBLE, size: 6, color: "FF9900", space: 1 } },
        children: [new TextRun({ text: "Goal: Reward legacy builders fairly without inflating their live score until they see the change.", bold: true })]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Identification: Who is a 'Legacy Referrer'?")] }),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3120, 3120, 3120],
        rows: [
          new TableRow({
            children: [
              new TableCell({ borders, shading: { fill: "4472C4", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Criteria", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "4472C4", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Detection", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "4472C4", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Action", bold: true, color: "FFFFFF" })] })] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("Referred 1+ wallets before launch")] }),
              new TableCell({ borders, children: [new Paragraph("Query: COUNT(users WHERE referred_by_wallet = X AND created_at < launch_timestamp)")] }),
              new TableCell({ borders, children: [new Paragraph("Flag as legacy_referrer = true")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("Referred person has earned any SP")] }),
              new TableCell({ borders, children: [new Paragraph("Query: referred_person.total_xp > 0")] }),
              new TableCell({ borders, children: [new Paragraph("Eligible for backfill commission")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph("Referrer has not yet claimed legacy balance")] }),
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph("Check: referral_legacy_balance.claimed = false")] }),
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph("Show pending balance prominently")] }),
            ]
          }),
        ]
      }),

      new Paragraph({ children: [new TextRun("")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Backfill Calculation: Retroactive Commission on Historical SP")] }),

      new Paragraph({
        spacing: { before: 100, after: 100 },
        children: [new TextRun({ text: "For each legacy referrer, calculate what they would have earned if the 10–15% commission had been in effect since the referred person started:", italic: true })]
      }),

      new Paragraph({
        spacing: { before: 50, after: 150 },
        border: { left: { style: BorderStyle.SINGLE, size: 4, color: "70AD47", space: 1 } },
        children: [new TextRun({ text: "Backfilled Commission = SUM(referred_person.total_xp × commission_rate_for_tier(referred_person.total_xp))\n\nWhere:\n- commission_rate = 10% if referred_person.total_xp < 1,000\n- commission_rate = 12% if referred_person.total_xp between 1,000–10,000\n- commission_rate = 15% if referred_person.total_xp > 10,000\n\nNOTE: Use CURRENT total_xp (not historical), because we're retroactively applying the system.", font: "Courier New", size: 18 })]
      }),

      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: "Example: Legacy referrer Alice referred Bob. Bob now has 5,000 XP (Tier 2, 12% rate). Backfilled commission = 5,000 × 0.12 = 600 Position SP added to Alice's pending balance.", italic: true })]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("New Database Table: Pending Referral Balance")] }),

      new Paragraph({
        spacing: { before: 50, after: 150 },
        border: { left: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC", space: 1 } },
        children: [new TextRun({ text: "CREATE TABLE referral_legacy_balance (\n  referrer_wallet VARCHAR(255) PRIMARY KEY,\n  pending_sp NUMERIC(18,4) DEFAULT 0,\n  claimed BOOLEAN DEFAULT false,\n  claimed_at TIMESTAMP,\n  claim_method VARCHAR(50),  -- 'auto' or 'manual'\n  created_at TIMESTAMP DEFAULT NOW()\n);", font: "Courier New", size: 18 })]
      }),

      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun("This table tracks pending SP for all legacy referrers. 'Claimed' = false until they claim via button or auto-claim on first earning.")]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Backfill Execution (Phase 3, Day 13)")] }),

      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun("Offline script (no downtime, runs once):")]
      }),

      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun({ text: "Identify all legacy referrers: ", bold: true }), new TextRun("SELECT DISTINCT referred_by_wallet FROM users WHERE created_at < launch_timestamp")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun({ text: "For each legacy referrer: ", bold: true }), new TextRun("calculate backfilled SP across all referred wallets")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun({ text: "Insert into referral_legacy_balance: ", bold: true }), new TextRun("(referrer_wallet, pending_sp=calculated_amount, claimed=false)")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun({ text: "Verify: ", bold: true }), new TextRun("SELECT COUNT(*) FROM referral_legacy_balance WHERE pending_sp > 0 should match expected count")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun({ text: "Publish: ", bold: true }), new TextRun("Alert all legacy referrers via email: 'You have [X] Position SP pending from your referral network. Claim in your dashboard.'")] }),

      new Paragraph({ children: [new TextRun("")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("How Pending Balance Works (Live)")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Referral Dashboard UI — Pending Section (Mobile & Desktop)")] }),

      new Paragraph({
        spacing: { before: 100, after: 100 },
        children: [new TextRun({ text: "BEFORE the claim button is clicked:", italic: true })]
      }),

      new Paragraph({
        spacing: { before: 50, after: 150 },
        border: { left: { style: BorderStyle.SINGLE, size: 4, color: "FF9900", space: 1 } },
        children: [new TextRun({ text: "┌─────────────────────────────────────────────┐\n│  PENDING REFERRAL BALANCE                   │\n│  ====================================        │\n│  You have 2,450 Position SP pending          │\n│  from your legacy referral network.          │\n│                                              │\n│  [CLAIM NOW]  [LEARN MORE]                   │\n│                                              │\n│  Claiming adds this to your live balance.    │\n│  Your leaderboard rank will update after.    │\n└─────────────────────────────────────────────┘", font: "Courier New", size: 16 })]
      }),

      new Paragraph({
        spacing: { before: 100, after: 100 },
        children: [new TextRun({ text: "Key design choices:", italic: true })]
      }),

      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Prominent card (yellow/orange background, top of referral page) — user can't miss it")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Clear call-to-action: [CLAIM NOW] button (green, bold)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Transparency: explains what happens when claimed ('leaderboard rank will update')")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("No pressure: user can claim anytime (no countdown, no expiry)")] }),

      new Paragraph({ children: [new TextRun("")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Claim Flow — Manual vs Auto")] }),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2340, 2340, 2340, 1440],
        rows: [
          new TableRow({
            children: [
              new TableCell({ borders, shading: { fill: "4472C4", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Event", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "4472C4", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Trigger", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "4472C4", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Action", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "4472C4", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Type", bold: true, color: "FFFFFF" })] })] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("User clicks [CLAIM NOW]")] }),
              new TableCell({ borders, children: [new Paragraph("POST /api/referral/:wallet/claim-legacy")] }),
              new TableCell({ borders, children: [new Paragraph("Move pending_sp to total_xp, set claimed=true, claimed_at=NOW()")] }),
              new TableCell({ borders, children: [new Paragraph("Manual")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("Referred person earns new SP")] }),
              new TableCell({ borders, children: [new Paragraph("XP cron runs & detects legacy_referrer")] }),
              new TableCell({ borders, children: [new Paragraph("Auto-claim all pending (once), then apply new commission")] }),
              new TableCell({ borders, children: [new Paragraph("Auto")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph("Admin override")] }),
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph("Admin dashboard command")] }),
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph("Force-claim for inactive users (after 30 days)")] }),
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph("Admin")] }),
            ]
          }),
        ]
      }),

      new Paragraph({ children: [new TextRun("")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Post-Claim: Live Commission Continues")] }),

      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun("After a legacy referrer claims their pending balance:")]
      }),

      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun("Pending balance is ADDED to their total_xp (increases their Final Points immediately)")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun("Leaderboard rank recalculated (may jump up 100+ spots if big pending amount)")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun("Going forward, all new referred-person SP generates commission at 10–15% rate (normal tier-based logic)")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun("Monthly cap still applies to future commission (backfilled SP is one-time, not subject to monthly limits)")] }),

      new Paragraph({ children: [new TextRun("")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Example Scenario: Legacy Referrer Alice")] }),

      new Paragraph({
        spacing: { before: 100, after: 100 },
        border: { left: { style: BorderStyle.SINGLE, size: 4, color: "70AD47", space: 1 } },
        children: [new TextRun({ text: "Timeline:\n\nMay 26 (Launch): Alice refers 5 people\nJun 9 (System Launch): New commission system goes live\n  - Bob (referred) has 2,000 XP (Tier 2, 12%)\n  - Charlie (referred) has 500 XP (Tier 1, 10%)\n  - Diana (referred) has 8,000 XP (Tier 2, 12%)\n  - Eve (referred) has 1,500 XP (Tier 1, 10%)\n  - Frank (referred) has 4,000 XP (Tier 2, 12%)\n\nBackfilled Pending = (2,000 × 0.12) + (500 × 0.10) + (8,000 × 0.12) + (1,500 × 0.10) + (4,000 × 0.12)\n                   = 240 + 50 + 960 + 150 + 480\n                   = 1,880 Position SP pending\n\nJun 12: Alice sees 1,880 SP pending, clicks [CLAIM NOW]\n  - 1,880 SP added to her total_xp\n  - referral_legacy_balance.claimed = true\n  - Leaderboard rank updated (may climb significantly)\n  - Referral card now shows active commission: Bob 12%, Charlie 10%, Diana 12%, Eve 10%, Frank 12%\n\nJun 15: Charlie earns 500 more XP (now 1,000 total)\n  - Alice's commission rate stays at 10% (Charlie's tier didn't change)\n  - New commission = 500 × 0.10 = 50 SP (added to active referral_commissions, not legacy)\n  - Monthly cap check: 50 / 500 cap OK\n\nJun 20: Bob earns 2,000 more XP (now 4,000 total, tier upgrade from 12% to 12%, no change)\n  - Commission on new earnings = 2,000 × 0.12 = 240 SP\n  - Cumulative: Alice now has 1,880 (legacy claim) + 50 (Charlie) + 240 (Bob) + ... (others)", font: "Courier New", size: 16 })]
      }),

      new Paragraph({ children: [new TextRun("")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("API Endpoint for Claiming")] }),

      new Paragraph({
        spacing: { before: 50, after: 150 },
        border: { left: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC", space: 1 } },
        children: [new TextRun({ text: "POST /api/referral/:wallet/claim-legacy\n\nRequest:\n  { }\n\nResponse (200):\n  {\n    \"success\": true,\n    \"claimed_amount\": 1880,\n    \"new_total_xp\": 5280,  // previous total_xp + claimed\n    \"message\": \"Your 1,880 Position SP have been claimed. Your leaderboard rank updated.\"\n  }\n\nResponse (400):\n  {\n    \"error\": \"No pending balance to claim\"\n  }\n\nResponse (409):\n  {\n    \"error\": \"Already claimed (on 2026-06-12)\"\n  }", font: "Courier New", size: 18 })]
      }),

      new Paragraph({ children: [new TextRun("")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Timeline: Migration Execution")] }),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [1560, 2340, 2340, 1560, 1560],
        rows: [
          new TableRow({
            children: [
              new TableCell({ borders, shading: { fill: "70AD47", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Phase", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "70AD47", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Task", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "70AD47", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "When", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "70AD47", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Owner", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "70AD47", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Time", bold: true, color: "FFFFFF" })] })] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("1")] }),
              new TableCell({ borders, children: [new Paragraph("Create referral_legacy_balance table")] }),
              new TableCell({ borders, children: [new Paragraph("Week 1, Day 2")] }),
              new TableCell({ borders, children: [new Paragraph("Backend")] }),
              new TableCell({ borders, children: [new Paragraph("2 hours")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("2")] }),
              new TableCell({ borders, children: [new Paragraph("Write backfill script (offline, test in staging)")] }),
              new TableCell({ borders, children: [new Paragraph("Week 2, Day 10")] }),
              new TableCell({ borders, children: [new Paragraph("Backend")] }),
              new TableCell({ borders, children: [new Paragraph("4 hours")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("3")] }),
              new TableCell({ borders, children: [new Paragraph("Add pending balance UI to referral dashboard")] }),
              new TableCell({ borders, children: [new Paragraph("Week 2, Day 11")] }),
              new TableCell({ borders, children: [new Paragraph("Frontend")] }),
              new TableCell({ borders, children: [new Paragraph("3 hours")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("4")] }),
              new TableCell({ borders, children: [new Paragraph("Implement POST /claim-legacy endpoint")] }),
              new TableCell({ borders, children: [new Paragraph("Week 2, Day 11")] }),
              new TableCell({ borders, children: [new Paragraph("Backend")] }),
              new TableCell({ borders, children: [new Paragraph("2 hours")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("5")] }),
              new TableCell({ borders, children: [new Paragraph("DRY RUN: Execute backfill on staging DB")] }),
              new TableCell({ borders, children: [new Paragraph("Week 3, Day 13 (before prod deploy)")] }),
              new TableCell({ borders, children: [new Paragraph("Backend + DevOps")] }),
              new TableCell({ borders, children: [new Paragraph("1 hour")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("6")] }),
              new TableCell({ borders, children: [new Paragraph("Verify staging results: count, amounts, no duplicates")] }),
              new TableCell({ borders, children: [new Paragraph("Week 3, Day 13")] }),
              new TableCell({ borders, children: [new Paragraph("QA")] }),
              new TableCell({ borders, children: [new Paragraph("1 hour")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, shading: { fill: "FFF2CC", type: ShadingType.CLEAR }, children: [new Paragraph("7")] }),
              new TableCell({ borders, shading: { fill: "FFF2CC", type: ShadingType.CLEAR }, children: [new Paragraph("PRODUCTION: Execute backfill on live DB")] }),
              new TableCell({ borders, shading: { fill: "FFF2CC", type: ShadingType.CLEAR }, children: [new Paragraph("Week 3, Day 14 (00:30 UTC, off-peak)")] }),
              new TableCell({ borders, shading: { fill: "FFF2CC", type: ShadingType.CLEAR }, children: [new Paragraph("Backend")] }),
              new TableCell({ borders, shading: { fill: "FFF2CC", type: ShadingType.CLEAR }, children: [new Paragraph("15 min")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("8")] }),
              new TableCell({ borders, children: [new Paragraph("Send email to legacy referrers: claim pending balance")] }),
              new TableCell({ borders, children: [new Paragraph("Week 3, Day 14 (06:00 UTC)")] }),
              new TableCell({ borders, children: [new Paragraph("Growth/Comms")] }),
              new TableCell({ borders, children: [new Paragraph("1 hour")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("9")] }),
              new TableCell({ borders, children: [new Paragraph("Monitor: claims, support tickets, leaderboard updates")] }),
              new TableCell({ borders, children: [new Paragraph("Week 3, Days 14–16")] }),
              new TableCell({ borders, children: [new Paragraph("Ops")] }),
              new TableCell({ borders, children: [new Paragraph("Ongoing")] }),
            ]
          }),
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Communication Strategy: Email Template")] }),

      new Paragraph({
        spacing: { before: 100, after: 200 },
        border: { left: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC", space: 1 } },
        children: [new TextRun({ text: "Subject: Claim Your Pending Referral Rewards on SHIFT\n\nHi [Name],\n\nWe've launched a new referral commission system that rewards you for bringing active traders to SHIFT. And we want to credit you for all the people you referred before today.\n\n🎁 Your Pending Balance: [X] Position SP\n\nThis is the commission you would have earned if the new system had been in effect since launch. It's now waiting for you to claim.\n\n📌 How to Claim:\n1. Go to airdrop.shiftrwa.xyz/referral\n2. You'll see a big \"PENDING REFERRAL BALANCE\" card\n3. Click [CLAIM NOW]\n4. Your Position SP increases immediately, and your leaderboard rank updates\n\n📊 After You Claim:\n- You'll see commission rates for each person you referred (10–15% of their earnings)\n- Every time they trade and earn Position SP, you earn passive commission\n- Monthly cap: 500 Position SP per referred person, per month (prevents over-concentration)\n\n❓ Questions?\n- Learn more: https://airdrop.shiftrwa.xyz/referral-faq\n- Contact: support@shiftrwa.xyz\n\nThanks for building SHIFT's community!\n\nThe SHIFT Team", font: "Courier New", size: 16 })]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Fairness & Transparency Safeguards")] }),

      new Paragraph({
        spacing: { before: 100, after: 100 },
        children: [new TextRun("To ensure legacy referrers feel valued, not punished, for being early:")]
      }),

      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun({ text: "Backfilled SP is based on CURRENT referred-person SP, not historical ", italic: true }), new TextRun("(easier to calculate, no need to track historical SP changes)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("No expiry on claim window: users can claim anytime (no \"claim by X or lose it\" pressure)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Transparent calculation: referral page shows exact breakdown per referred person")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("One-time bonus: backfilled SP doesn't count toward monthly caps (fair, not subject to 500 SP/month limit)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Clear communication: email explains what happened and why")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Optional claim: users can delay or ignore if they prefer (though UI will remind them regularly)")] }),

      new Paragraph({ children: [new TextRun("")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Edge Cases & Handling")] }),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2340, 3510, 3510],
        rows: [
          new TableRow({
            children: [
              new TableCell({ borders, shading: { fill: "4472C4", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Edge Case", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "4472C4", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Scenario", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ borders, shading: { fill: "4472C4", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "Resolution", bold: true, color: "FFFFFF" })] })] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("Legacy referrer has no referred wallets")] }),
              new TableCell({ borders, children: [new Paragraph("referred_by_wallet used but count=0")] }),
              new TableCell({ borders, children: [new Paragraph("Skip in backfill (pending_sp=0, don't insert row)")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("Referred person has 0 XP (never traded)")] }),
              new TableCell({ borders, children: [new Paragraph("Bob was referred but closed his account / never earned SP")] }),
              new TableCell({ borders, children: [new Paragraph("Commission = 0 for that person (no pending, not counted)")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("Referrer claims, then referred person earns new SP same day")] }),
              new TableCell({ borders, children: [new Paragraph("Alice claims 1,880 pending at 10:00 UTC; Bob earns 200 SP at 15:00 UTC")] }),
              new TableCell({ borders, children: [new Paragraph("Normal commission applies: 200 × 12% = 24 SP (new referral_commissions row, not legacy)")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, children: [new Paragraph("Referred person was inactive, now active again")] }),
              new TableCell({ borders, children: [new Paragraph("Charlie had 500 XP, no positions open for 2 weeks, now opens new position")] }),
              new TableCell({ borders, children: [new Paragraph("Commission flow resumes at current tier (10% for < 1K SP); counts toward monthly cap")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph("Backfill was wrong, need to recalculate")] }),
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph("Bug found in tier logic post-backfill")] }),
              new TableCell({ borders, shading: { fill: "E7E6E6", type: ShadingType.CLEAR }, children: [new Paragraph("Admin can manually adjust: UPDATE referral_legacy_balance SET pending_sp = new_amount WHERE wallet = X")] }),
            ]
          }),
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Conclusion")] }),

      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun("This implementation plan now includes a complete legacy referrer migration strategy that ensures early community builders are rewarded fairly. The pending balance system is transparent, non-expiring, and prominently displayed, so users feel valued and informed about their earned rewards.")]
      }),

      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun("Key outcomes:")]
      }),

      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("All legacy referrers see their pending balance on day 1 of live system")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("No gaming or unfairness: backfilled amounts are one-time, not subject to monthly caps")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Smooth UX: claim button is optional but visible, email explains everything")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Minimal risk: backfill is an offline script, no downtime, fully reversible")] }),

      new Paragraph({
        spacing: { before: 200, after: 200 },
        children: [new TextRun({ text: "Ready to build and deploy.", bold: true, color: "70AD47" })]
      }),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("C:\\Users\\Axel\\Downloads\\SHIFT_RWA_IMPLEMENTATION_PLAN_v2.docx", buffer);
  console.log("✅ Updated document created: SHIFT_RWA_IMPLEMENTATION_PLAN_v2.docx");
});
