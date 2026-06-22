---
title: "TGS Ranking System Documentation"
description: "The complete technical reference for the OWCS Nexus Team Global Standings's rating system."
lastUpdated: 2026-06-22
version: "1.0"
template: doc
---

# How the Algorithm Works

This document is the reference for the ELO system that powers the Team Global Standings (TGS), the (un)official rankings of teams partecipating in the official regions of the Overwatch Champions Series (OWCS).

<blockquote class="warning">
⚠️ Disclaimer

Treat these ratings as a **very** rough estimate, not absolute truth. Since OWCS can be very "volatile" (to say the very least) in terms of format and rosters competing in it, things like regional weights, roster continuity mapping, and team rebrand aliases are still adjusted as the season goes on, and a handful of teams can shift a region's calibration more than we'd like.

</blockquote>

## 1. Overview

### Quick Reference

| Constant                      | Value       | What it controls                                                     |
| :---------------------------- | :---------- | :------------------------------------------------------------------- |
| `K_MAJOR`                     | 48          | K-factor for Majors                                                  |
| `K_CROSS`                     | 32          | K-factor for cross-region events                                     |
| `K_REGIONAL`                  | 20          | K-factor for everything else                                         |
| `CALIBRATION_GAMES`           | 8           | Games until a roster's K multiplier settles to 1.0×                  |
| `CALIBRATION_MAX_K`           | 1.8×        | K multiplier on a roster's very first game                           |
| `ROSTER_MIN_PLAYERS`          | 3           | Minimum reported lineup size to fingerprint a roster                 |
| `ROSTER_REGRESSION_THRESHOLD` | 0.40        | Jaccard similarity floor that triggers a soft reset                  |
| `ROSTER_REGRESSION_KEEP`      | 50%         | Share of pre-reset rating retained after an overhaul                 |
| `INACTIVITY_GRACE_WEEKS`      | 3           | Weeks before decay starts                                            |
| `INACTIVITY_DECAY_RATE`       | 0.97 / week | Decay rate after the grace period                                    |
| `INACTIVITY_DECAY_FLOOR`      | 70%         | Decay never drops a rating below this share of its last active value |
| `INACTIVITY_REMOVAL_DAYS`     | 180         | Hard removal from the leaderboard after this many inactive days      |

---

## 2. Mathematical Foundations

### 2.1 Expected Score (Win Probability)

The core of the TPR is the "logistic curve", where given two teams with ratings $R_A$ and $R_B$ respectively, the "expected score" $E_A$, which is the probability of Team A winning, is calculated as:

$$
E_A = \frac{1}{1 + 10^{(R_B - R_A)/400}}
$$

The constant 400 is the scale factor that converts a raw rating gap into the exponent used by the logistic function. By making the constant smaller, the curve would be steeper and the same rating gap would imply a bigger probability swing. We chose 400 since a 400-point gap implies a ~91% win probability (near certain).

### 2.2 The Update Equation

After a match, each team's rating moves by its own K-factor times the gap between the actual result $S$ (1 for a win, 0 for a loss) and what was expected:

$$
R' = R + K \cdot (S - E)
$$

The two teams almost never use the same $K$ in this system — see §3 and §4. That means a single match's rating swing is **not symmetric**: the winner's gain and the loser's loss can be different magnitudes for the same match. This is intentional, and it's the main reason the system isn't strictly zero-sum (more in §9.1).

---

## 3. The Three-Tier K-Factor Engine

The K-factor controls the "volatility", where it indicates how much a single match can move a rating. The algorithm computes a **base K** based on the tournament, then applies two independent multipliers on top of it: one for roster calibration (§3.2, below), one for margin of victory (§4).

### 3.1 Tournament Tiering

```ts
const baseK = (isMajor ? K_MAJOR : isCross ? K_CROSS : K_REGIONAL) * kScale;
```

- Majors (base K = 48): Season-defining events like Champions Clash, Midseason Championship, World Finals, ect.
- Cross-region tournaments (base K = 32): Events explicitly framed as inter-regional matchups (the "Road to World Finals" tournaments, the "OWCS Asia Stage 1" tournaments ect.).
- Regional / Other (base K = 20): All the remaining events. This is a fallback tier: a cross-region match that lacks the explicit cross-region naming above still falls into this category.

Regions themselves are inferred from the tournament name, checked in this order:

1. Checks that there are no "multiple regions" in the tournament name, since its treated as ambiguous and resolves to no region at all
2. checks for **Pacific**, then **Japan**, then **China**, then **Korea**, then **North America**, then **EMEA**, in that order. This is **snapshotted before** the match updates each team's region. That snapshot exists specifically to avoid misclassifying a match's tier using a region a team is only just transitioning into.

### 3.2 Calibration Multiplier (New Rosters)

A roster with little match history shouldn't need 20 games to find its "true" rating, so its K-factor gets a temporary boost that decays linearly over its first 8 games on that lineup:

$$
\text{calib}(n) = 1.8 - \frac{(1.8 - 1.0) \cdot n}{8}, \quad n < 8
$$

where $n$ is `gamesInCurrentRoster`. At $n=0$ a roster's K is multiplied **1.8×**; by $n=8$ it's settled to **1.0×** and stays there. Each team tracks this independently, so a calibrating underdog can face an established favorite without either side's multiplier affecting the other.

<blockquote class="info">
<strong>Why 8 games?</strong><br/>
Given the overall structure of OWCS's regional stages, 8 games for calibration is the sweetspot for the new teams that come from Open Qualifiers and/or from Promotion/Relegation as it gives enough data to observe a roster's true level across regional games with "established" teams, while limiting prolonged volatility.
</blockquote>

---

## 4. Margin of Victory

A 3-0 sweep is a stronger signal than a 4-3 nail-biter, so the **winner's** K (only the winner's) gets scaled by how lopsided the series was:

| Category     | Map-win ratio | Multiplier |
| :----------- | :------------ | :--------- |
| **Dominant** | ≥ 80%         | **1.20×**  |
| **Solid**    | 60% – 79.9%   | **1.00×**  |
| **Close**    | < 60%         | **0.85×**  |

<blockquote class="info">
<strong>3-2 is "Solid," not "Close"</strong><br/>
A best-of-5 finishing 3-2 has a map-win ratio of exactly 60% (3÷5) — which lands in the <strong>Solid</strong> tier, not Close, since the threshold is inclusive. The Close tier (&lt;60%) is only reachable in longer formats, like a 4-3 in a Bo7 (≈57%).
</blockquote>

The **loser's K is never adjusted** by margin of victory, it always stays at the flat base-times-calibration value. Combined with the asymmetric K-factors from §3, this is the second source of the system's non-zero-sum behavior (§9.1).

---

## 5. Regional Baselines & Season Calibration

### 5.1 Current Baselines

Every team starts at its region's baseline the first time it appears in a match. These are the live values for the 2026 OWCS season:

| Region                             | Baseline       |
| :--------------------------------- | :------------- |
| **EMEA**                           | 1159           |
| **Korea**                          | 1153           |
| **China**                          | 1134           |
| **North America**                  | 1132           |
| **Japan**                          | 1101           |
| **Pacific**                        | 1084           |
| _Unrecognized / cross-region only_ | 1200 (default) |

### 5.2 How Baselines Are Calculated

Baselines are recalculated each season by simulating the _entire previous season from scratch_ with every team starting at 1200, where for each team that finishes with **at least 8 games and 2 wins**, the script computes a **calibration rating**:

- If the team never had a roster overhaul, that's just their final simulated rating.
- If they _did_ have an overhaul, it's their **pre-reset peak** instead. (the highest rating they sustained for at least 3 games before the reset) This is to ensure that one team's mid-season roster implosion doesn't drag down its whole region's baseline. (i.e NTMR post-Champions Clash in 2025)

Teams below an 800 calibration rating are dropped from the pool entirely. The remaining teams per region feed two signals:

1. **International Ceiling (60% weight).** We take the team with the best normalized over-performance at Major events specifically (actual result minus the model's expected result), averaged across their Major matches, scaled by ±200. A region with no Major data defaults this signal to 1200.
2. **Domestic Depth (40% weight).** Its the average calibration rating across the region's qualified teams, minus a variance penalty (30% of the standard deviation, capped at 50 points) applied only when the average is above 1200. A very top-heavy region with very few competitive teams (i.e Japan/China) gets penalized relative to one with consistent depth. (i.e EMEA)

$$
\text{seed} = 1200 + \big(0.6 \cdot \text{intl} + 0.4 \cdot \text{depth} - 1200\big) \times 0.6
$$

That final ×0.6 is a regression factor, where it pulls every region's seed 40% of the way back toward 1200 so no single season's data can push a baseline to an extreme.

---

## 6. Roster Continuity (Jaccard Fingerprinting)

OWCS rosters are very susceptible to major changes in the lineup, and a 5-player overhaul shouldn't inherit the team's old rating. The algorithm detects this automatically, thanks to something called "Jaccard fingerprinting".

### 6.1 Detecting an Overhaul

Every match, the algorithm reads the reported lineup for each team. If it has **3 or more named players**, it's compared against the team's stored fingerprint (also capped at 3+ players) using Jaccard similarity:

$$
J(A, B) = \frac{|A \cap B|}{|A \cup B|}
$$

If $J$ drops **below 0.40** (meaning less than 40% player overlap with the last known lineup) and the team hasn't already been reset on or after this match's date, it's flagged as a roster overhaul.

### 6.2 The Soft Reset

An overhaul doesn't wipe the rating to the regional baseline, it just applies a soft reset based on the regional baseline:

$$
R' = (\text{baseline} \times 0.50) + (R \times 0.50)
$$

`gamesInCurrentRoster` resets to 0, which also re-enters the team into the calibration multiplier from §3.2 starting at its full 1.8× boost.

### 6.3 Data-Quality Safeguards

If a given match's data doesn't report at least 3 players for a team (common for older or lower-visibility matches), the fingerprint is **left untouched** rather than overwritten with a partial lineup, since a sparse data point can't accidentally look like a roster overhaul, and it can't accidentally erase a good fingerprint either.

---

## 7. Inactivity Decay & Leaderboard Filtering

### 7.1 The Decay Curve

A team that stops competing in OWCS (because they got relegated or they don't exist anymore) shouldn't sit at its peak rating forever, but a short break also shouldn't be punished. There's a 3-week grace period, then a gradual weekly decay floored at 70% of the rating it had when last active:

$$
\text{decay} = \max\big(0.70,\ 0.97^{\,(\text{weeksInactive} - 3)}\big)
$$

This is recalculated on every sync and only ever ratchets in one direction: once a team's decay factor is locked in, a smaller (more decayed) value can replace it, but it never relaxes back up except by playing a new match, which resets the decay factor to 1.0 immediately.

### 7.2 Removal From the Leaderboard

A team is hidden from the public Global Standings if any of the following are true:

- It has never had a processed match.
- Its last match was more than **180 days** ago.
- Its rating has dropped below the **900** floor.

---

## 8. Team Identity: Aliases & Normalization

Two cleanup steps run before any team is looked up or created:

- **Suffix stripping:** trailing parenthetical text (e.g. a disambiguator like _"(Korean Team)"_) is removed from the raw name.
- **Rebrand aliases:** a small hand-maintained map redirects an org's old name to its new one, so history carries over instead of starting a second, empty entry. (i.e \_Anyone's Legend → 1234)

---

## 9. System Properties

### 9.1 Why the System Isn't Zero-Sum

Classic ELO is zero-sum: whatever one side gains, the other loses, in equal amounts. In the TGS we deliberately breaks this in two ways:

- **Calibration asymmetry.** If a calibrating roster (multiplier up to 1.8×) beats an established one (1.0×), the winner can gain more than the loser drops, inflating the system's "total power" grow as new talent enters the scene, rather than slowly deflating toward 1000 as in a strict zero-sum model that may be mathematically accurate, but it does not capture the "context" of the teams playing in the OWCS.
- **Winner-only margin of victory.** Since the MoV multiplier from §4 never touches the loser's K, a close win's gain and loss aren't mirror images of each other. A heavy underdog winning a nail-biter, for instance, nets noticeably less than the favorite loses for the same match, as the win was still an upset, but a narrow one.

### 9.2 Upset Classification

A match is flagged as an **upset** whenever the winner's pre-match expected score was below **35%** ($E < 0.35$). These surface in the "Recent Matches" and "Historical Upsets" sections of the UI, and the biggest ones (by expected-score margin) get pulled out separately at the Majors.

---

## 10. Worked Example

### Scenario: The Giant Slayer

- **Team A (underdog):** 1150 rating, EMEA, established roster.
- **Team B (favorite):** 1450 rating, Korea, established roster.
- **Tournament:** OWCS Midseason Championship — a Major, so $K_{\text{base}} = 48$ for both.
- **Result:** Team A wins a best-of-7 grand final, 4-3.

**Step 1 — Expected score**

$$
E_A = \frac{1}{1 + 10^{(1450-1150)/400}} \approx 0.1510 \ \text{(15.1\%)}
$$

**Step 2 — Margin of victory**

A 4-3 finish is a 4÷7 ≈ 57.1% map-win ratio — under the 60% line, so this lands in the **Close** tier: **×0.85**, applied only to Team A's K since A is the winner.

$$
K_A = 48 \times 1.0 \times 0.85 = 40.8 \qquad K_B = 48 \times 1.0 \times 1.0 = 48
$$

(Both teams use a calibration multiplier of 1.0× — neither has a recent roster reset.)

**Step 3 — Rating change**

$$
\Delta A = 40.8 \times (1 - 0.1510) \approx +34.6
$$

$$
\Delta B = 48 \times (0 - 0.8490) \approx -40.8
$$

**Result:** Team A climbs from **1150 → ~1184.6**, while Team B drops from **1450 → ~1409.2**. Notice the asymmetry from §9.1 in action: the underdog's gain (+34.6) is smaller in magnitude than the favorite's loss (-40.8) for the exact same match, purely because the win was narrow enough to fall into the Close MoV tier — a dominant 4-0 sweep in the same spot would have pushed Team A's gain _above_ 48, past what Team B lost.
