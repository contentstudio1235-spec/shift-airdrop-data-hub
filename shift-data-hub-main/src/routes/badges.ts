import { Router } from 'express';
import { query, queryOne } from '../db/pool';
import { badgeGalleryService } from '../services/badgeGalleryService';
import { badgeService } from '../services/badgeService';

const router = Router();

// ── GET /api/badges/:wallet ──────────────────────────────────────────────
// Returns all badge definitions merged with earned status for a wallet.
router.get('/:wallet', async (req, res) => {
  const { wallet } = req.params;

  try {
    const [userBadges, earnedCount] = await Promise.all([
      badgeGalleryService.getUserBadges(wallet),
      badgeGalleryService.getEarnedBadgeCount(wallet),
    ]);

    // Rarity breakdown
    const breakdown = { common: 0, rare: 0, epic: 0, legend: 0 };
    userBadges.forEach(b => {
      if (b.earned) {
        const key = b.rarity as keyof typeof breakdown;
        if (key in breakdown) breakdown[key]++;
      }
    });

    res.json({
      badges: userBadges,
      earnedCount,
      totalCount: userBadges.length,
      breakdown,
    });
  } catch (error) {
    console.error('[API] Badges fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/badges/:wallet/progress ────────────────────────────────────
// Returns badge progress (% toward earning each badge).
router.get('/:wallet/progress', async (req, res) => {
  const { wallet } = req.params;

  try {
    const progress = await badgeService.getBadgeProgress(wallet);
    res.json({ progress });
  } catch (error) {
    console.error('[API] Badge progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/badges/:wallet/evaluate ───────────────────────────────────
// Trigger badge evaluation for a specific wallet (e.g., after a trade).
router.post('/:wallet/evaluate', async (req, res) => {
  const { wallet } = req.params;

  try {
    const awards = await badgeService.evaluateBadges(wallet);
    res.json({
      newBadges: awards,
      count: awards.length,
      message: awards.length > 0
        ? `Awarded ${awards.length} new badge(s)!`
        : 'No new badges at this time',
    });
  } catch (error) {
    console.error('[API] Badge evaluation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/badges/definitions/all ─────────────────────────────────────
// Public endpoint: returns all badge definitions (no wallet needed).
router.get('/definitions/all', async (_req, res) => {
  try {
    const badges = await badgeGalleryService.getAllBadges();
    res.json({ badges, totalCount: badges.length });
  } catch (error) {
    console.error('[API] Badge definitions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
