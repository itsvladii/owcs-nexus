---
title: "OWCS Nexus ELO Ranking System"
description: "Complete technical documentation of our modified Elo algorithm for competitive Overwatch"
lastUpdated: 2025-01-10
version: "1.0"
---
# OWCS Nexus ELO Ranking System

## Table of Contents
1. [Overview](#overview)
2. [Core Algorithm](#core-algorithm)
3. [Three-Phase K-Factor System](#three-phase-k-factor-system)
4. [Regional Seeding](#regional-seeding)
5. [Margin of Victory Adjustments](#margin-of-victory-adjustments)
6. [Edge Cases & Special Rules](#edge-cases--special-rules)
7. [Implementation Details](#implementation-details)
8. [Validation & Testing](#validation--testing)

---

## Overview

The OWCS Nexus ranking system employs a modified Elo rating algorithm specifically calibrated for Overwatch Champions Series (OWCS) competitive play. Unlike traditional Elo implementations, our system accounts for:

- **Regional strength disparities** through differential starting ratings
- **Match importance hierarchy** via dynamic K-factor adjustment
- **Performance dominance** through margin-of-victory scaling
- **Roster instability** via controlled reset mechanisms
- **Seasonal boundaries** through soft compression resets

All ratings are derived exclusively from official OWCS Tier-1 tournament matches, sourced via Liquipedia's official API.

---

## Core Algorithm

### Expected Score Calculation

The "probability" that Team A defeats Team B is given by the logistic function:

$$
E_A = \frac{1}{1 + 10^{(R_B - R_A)/400}}
$$

Where:
- $E_A$ = Expected win probability for Team A (range: 0 to 1)
- $R_A$ = Current Elo rating of Team A
- $R_B$ = Current Elo rating of Team B
- $400$ = Scaling constant (standard in Elo systems)

**Interpretation:** A 400-point rating advantage corresponds to a 10:1 odds ratio, or approximately 91% win probability.

### Rating Update Formula

After a match concludes, ratings are updated according to:

$$
R_A^{\text{new}} = R_A^{\text{old}} + K \cdot (S_A - E_A)
$$

Where:
- $K$ = K-factor (volatility parameter, discussed below)
- $S_A$ = Actual score (1 if Team A wins, 0 if Team A loses)
- $(S_A - E_A)$ = Prediction error

**Key Property:** This is a zero-sum system when both teams use identical K-factors. However, our implementation uses asymmetric K-factors (see below), which intentionally introduces controlled rating inflation.

### Why Asymmetric K-Factors?

Traditional Elo enforces that, by using the same K-factor, the 2 teams will win/lose the same ammount of points:

$$
\Delta R_A + \Delta R_B = 0
$$

Our system violates this constraint deliberately. When a calibrating team $(K=50)$ defeats a stable veteran $(K=20)$:

$$
\begin{align}
\Delta R_{\text{new}} &= 50 \cdot (1 - 0.3) = +35 \\
\Delta R_{\text{veteran}} &= 20 \cdot (0 - 0.7) = -14 \\
\text{Net inflation} &= +35 - 14 = +21 \text{ points}
\end{align}
$$

**Design Rationale:** This allows new teams to "catch up" to their true rank without inflating (as much) the scores of established teams they play against. The inflation is managed via annual soft resets (see [Seasonal Compression](#seasonal-soft-reset)).

---

## Three-Phase K-Factor System

The K-factor determines rating volatility and, in a way, it reflects the various "phases" of a team during an OWCS season. Higher K-factors enable rapid adjustment but increase noise, so we employ a context-dependent three-phase approach:

### Phase 1: Calibration Period (Games 0–10)

$$
K_{\text{calibration}}(n) = K_{\max} - \left(\frac{n}{N_{\text{calib}}}\right) \cdot (K_{\max} - K_{\text{stable}})
$$

Where:
- $n$ = Number of games played (0 ≤ $n$ < 10)
- $N_{\text{calib}}$ = 10 (calibration window)
- $K_{\max}$ = 50 (maximum volatility)
- $K_{\text{stable}}$ = 20 (baseline volatility)

**Example Trajectory:**

| Games Played | K-Factor | Rating Change (50% upset) |
|--------------|----------|---------------------------|
| 0            | 50.0     | ±25.0                     |
| 5            | 35.0     | ±17.5                     |
| 10           | 20.0     | ±10.0                     |

**Design Justification:** OWCS regional stages typically consist of 8-game round-robins followed by 2-4 playoff matches. This 10-game window captures one complete competitive cycle, providing a controlled opponent sample for accurate placement.

### Phase 2: Stability Period (Games 10+)

$$
K_{\text{stable}} = 20
$$

**Design Justification:** After the first 10 games against regional competition, sufficient data exists to establish confidence in a team's rating. Lower K-factors prevent individual upsets from causing excessive rank turbulence.

### Phase 3: Major Tournament Override

$$
K_{\text{major}} = 60 \quad \text{(regardless of games played)}
$$

**Triggering Conditions:** During international LAN events the K-factor will jump up dramatically, highlighting how international competition represents the highest-stakes, most skill-revealing environment where a single Major upset is more informative to the broader OWCS landscape than multiple regional victories.

**Statistical Impact:** At K=60, a 30% underdog victory yields:

$$
\Delta R_{\text{upset}} = 60 \cdot (1 - 0.3) = +42 \text{ points}
$$

This can swing rankings dramatically, reflecting the outsized importance of international performance.

## Regional Match Compression

One of the key issues in a global ELO systems with regional leagues is the "regional farming", where teams can inflate their ratings by dominating weaker regional competition without proving themselves internationally. To address this, we apply a "directional penalty" based on ELO difference between two teams in the Regional Stage matches: 

#### Stage 1: Standard Compression (K=13)
After the calibration period (10+ games), any match between two teams from the **same region** occurring on regional Stages receives a reduced K-factor (35% reduction):

$$
K_{\text{regional}} = K_{\text{base}} \times 0.65 = 13
$$

#### Stage 2: The "Glass Ceiling"
To prevent teams from climbing indefinitely purely on regional dominance, we enforce a "bully penalty" where if in a regional Stage match the difference in ELO between the two teams is greater than **250**, one of the two scenarios will happen:
- If the higher rated team won the match, the K-Factor is getting slashed by 50%.
- If the lower rated team won the matchm the K-Factor won't be modified further.

$$
K_{\text{ceiling}} = K_{\text{regional}} \times 0.5
$$

**Rationale:** Beating a local 1200-rated team is "expected behavior" for a global powerhouse and yields almost no new information. This forces elite regional teams to get good international results in Major LAN events in order to climb further.

**Mathematical Impact:**
| Scenario | Matchup | K-Factor | Outcome |
| :--- | :--- | :--- | :--- |
| **Normal Regional** | 1250 vs 1250 | $K=13$ | Standard regional gains. |
| **Farming** | 1450 vs 1200 | $K=6.5$ | The 1450 team gains almost less points for winning. |
| **Upset** | 1450 vs 1200 | $K=13$ | The 1200 team gains full points for the upset. |
| **Major** | 1450 vs 1450 | $K=60$ | High stakes. Winner takes all. |

---

## Regional Seeding

Since OWCS regions do not have the same strength, teams are initialized at region-specific ELO baselines that reflect the historical competitive strength of the various regions. For example, the 2025 OWCS season's ELO leaderboard will have these region-specific ELO baselines:

| Region         | Starting Elo ($R_0$) | Basis                                           |
|----------------|----------------------|-------------------------------------------------|
| Korea          | 1304                 | Dominant history throughout all of OW Esports's history|
| North America  | 1264                 | Consistent Major representation                 |
| EMEA           | 1255                 | Deep talent pool, variable peaks                |
| Japan          | 1211                 | Emerging strength in the last couple of years   |
| China          | 1200                 | Baseline (returned to OW esports recently)      |
| Pacific        | 1189                 | Developing region                               |
| Default        | 1200                 | Fallback for unclassified teams                 |

These starting values are not arbitrary. They are derived from a complete re-simulation of the previous season to objectively measure regional strength:
1. First off, we re-calculate every official match of the previous season assuming zero prior regional bias (every team starts at a baseline of 1200 ELO).
2. Then, we assessed regional strength by calculating the average ELO of the Top 3 Teams in each region.
    1. **Why only Top 3?** In international competition, a region's ability to win championships is defined by its strongest representatives, not its median team. Including the bottom 50% of a region (who rarely compete internationally) dilutes the data with uncalibrated "local" ELO noise.
3. To allow for off-season roster changes and meta shifts, we applied a 50% Compression (decay) towards the baseline. This pulls dominant regions slightly down and weaker regions slightly up, ensuring the new season remains competitive while respecting historical hierarchy.

### Mathematical Impact

Consider a cross-regional matchup: Korea (1304) vs. Pacific (1189).

**Without regional seeding:** Both start at 1200, so the expected probability for Korea to win is:

$$
E_{\text{Korea}} = \frac{1}{1 + 10^{(1200 - 1200)/400}} = \frac{1}{1 + 10^{0/400}} = 0.5
$$
which is basically a coin flip (50% probability of Korea to win). This means that, while Korea is objectively the much stronger region, if they win the algorithm will treat the win as a "hard fought" 50/50 victory against Pacific and they'll get the full reward for beating a statistically weaker opponent because the system doesn't know they are weaker yet.

**With regional seeding:** Expected probability for Korea:

$$
E_{\text{Korea}} = \frac{1}{1 + 10^{(1189 - 1304)/400}} = \frac{1}{1 + 10^{-0.2875}} \approx 0.66
$$

Korea is favored but not overwhelmingly (the algorithm expects Korea to win 2 out of 3 times). This way, the algorithm forces dominant teams to earn their high rating by beating other high-rated teams, rather than letting them climb to 1600 by crushing lower-tier teams for full value.

### Region Assignment Logic

Teams are assigned to the OWCS competitive region they participate in:

1. **First match played:** Inferred from tournament name
2. **Subsequent regional matches:** Region updates if team transfers (i.e 99DIVINE moving from Pacific to Japan last season)
3. **International events:** Region unchanged (prevents false reassignment)

**Example:** Crazy Raccoon (Japanese org) playing in OWCS Korea → Assigned "Korea" region.

---

## Margin of Victory Adjustments

A 4-0 sweep reveals more about skill differential than a 3-2 overtime thriller. We scale K-factors by map differential:

$$
K_{\text{effective}} = K_{\text{base}} \cdot M(d)
$$

Where $M(d)$ is the MoV multiplier:

$$
M(d) = \begin{cases}
1.2 & \text{if } d \geq 3 \text{ (dominant win)} \\
1.0 & \text{if } d = 2 \text{ (solid win)} \\
0.8 & \text{if } d = 1 \text{ (close match)}
\end{cases}
$$

And $d = |S_A - S_B|$ is the map differential.

### Example Scenario

**Match:** Team A (1400) defeats Team B (1350), K=20 base

**Expected score:**
$$
E_A = \frac{1}{1 + 10^{(1350-1400)/400}} \approx 0.57
$$

**Case 1: 4-0 sweep ($d=4$, $M=1.2$)**
$$
\Delta R_A = 20 \cdot 1.2 \cdot (1 - 0.57) = 10.3 \text{ points}
$$

**Case 2: 3-2 nail-biter ($d=1$, $M=0.8$)**
$$
\Delta R_A = 20 \cdot 0.8 \cdot (1 - 0.57) = 6.9 \text{ points}
$$

**Interpretation:** The sweep awards 50% more Elo, reflecting the clearer demonstration of superiority.

---

## Edge Cases & Special Rules

### Minimum Games Filter

Teams must satisfy **all** of the following to appear in the global ELO rankings:

$$
\begin{cases}
R \geq 1000 \\
n_{\text{wins}} \geq 1 \\
t_{\text{last}} \geq t_{\text{now}} - 90 \text{ days}
\end{cases}
$$

Where:
- $R$ = Current rating
- $n_{\text{wins}}$ = Win count (prevents 0-10 teams)
- $t_{\text{last}}$ = Date of most recent match
- $t_{\text{now}}$ = Current date

**Rationale:** The algorithm filters out:
- Disbanded rosters (90-day inactivity)
- Rating floor violators (< 1000)
- Winless teams (statistical anomalies)

### Roster Reset Mechanism

When teams undergo complete roster overhauls, manual rating resets prevent rating inheritance:

**Example:**
- **NTMR** (May 1, 2025): Reset to 1264 following post-Stage 1 rebuild after Champions Clash

**Implementation:**
$$
R_{\text{team}}(t) = \begin{cases}
R_{\text{reset}} & \text{if } t_{\text{match}} \geq t_{\text{reset}} \text{ and not previously applied} \\
R_{\text{current}} & \text{otherwise}
\end{cases}
$$

**Future Consideration:** Automate detection via Liquipedia roster change metadata.

### Seasonal Soft Reset

At the transition from year $Y$ to $Y+1$, all ratings compress toward baseline:

$$
R_{Y+1}^{\text{initial}} = R_{\text{baseline}} + \alpha \cdot (R_Y^{\text{final}} - R_{\text{baseline}})
$$

Where:
- $R_{\text{baseline}} = 1200$ (neutral starting point)
- $\alpha = 0.75$ (retention coefficient)

**Example:**
- Team with 1600 rating: $1200 + 0.75 \cdot (1600 - 1200) = 1500$
- Team with 1000 rating: $1200 + 0.75 \cdot (1000 - 1200) = 1050$

**Design Justification:**
1. Counteracts cumulative inflation from asymmetric K-factors
2. Accounts for off-season roster changes
3. Prevents runaway rating divergence
4. Maintains competitive intrigue (everyone "resets" partially)

**Timing:** Triggered on first match processed in new calendar year.

---

## Implementation Details

### Data Pipeline Architecture

```
[Liquipedia API] 
    ↓ (Every 6 hours via Vercel Cron)
[Match Data Fetch]
    ↓
[Chronological Sort] (Oldest → Newest)
    ↓
[Sequential Elo Calculation]
    ├─ Initialize teams at regional baselines
    ├─ Apply roster resets (date-conditional)
    ├─ Calculate expected scores
    ├─ Apply K-factor (phase + MoV)
    ├─ Update ratings
    ├─ Record history snapshots
    └─ Check for year transition (soft reset)
    ↓
[Filter Rankings] (10+ games, 90-day active, etc.)
    ↓
[Static Page Generation] (Astro build-time)
    ↓
[CDN Deployment] (Vercel Edge)
```

### Computational Complexity

**Time Complexity:** $O(M \cdot T)$
- $M$ = Number of matches (~500)
- $T$ = Average teams per match (2)

**Space Complexity:** $O(T \cdot H)$
- $T$ = Number of teams (~50)
- $H$ = History snapshots per team (~50)

**Build Time:** ~2-5 seconds for full recalculation

### Rate Limit Management

**Liquipedia API Constraint:** 60 requests/hour

**Our Usage Pattern:**
- Match data: ~10 requests (paginated queries)
- Team metadata: ~5 requests (batch fetches)
- Tournament info: ~5 requests
- **Total: ~20 requests per rebuild**

**Rebuild Frequency:** Every 6 hours = 4 builds/day = 80 requests/day

**Headroom:** 3× safety margin (60 req/hr × 24 hr = 1440 req/day available)

### Historical Recomputation

**Strategy:** Full recalculation from match history on every build.

**Advantages:**
- ✅ Algorithm updates apply retroactively
- ✅ No database state to corrupt
- ✅ Reproducible at any git commit
- ✅ Easy rollback (redeploy previous version)

**Trade-offs:**
- ⚠️ Slower builds (but 5s is acceptable)
- ⚠️ Cannot do incremental updates (must reprocess all matches)

**When to Switch to Incremental:**
- Match count > 5,000
- Build time > 30 seconds
- Need sub-minute update frequency

---

## Validation & Testing

### Sanity Checks Implemented

1. **Rating Bounds:** No team should exceed $[800, 2000]$ range
2. **Zero-Sum Approximation:** Total system Elo should remain near $1200 \cdot N_{\text{teams}}$
3. **Monotonicity:** Team with 80% win rate should not rank below 50% win rate team
4. **Upset Detection:** Wins with $P(\text{win}) < 0.35$ logged for review

### Known Limitations

**What the system captures well:**
- Strength of schedule (via expected score)
- Consistency over time (via stability K-factor)
- Performance in high-stakes matches (via Major K-factor)

**What the system misses:**
- Individual player skill (team-level only, since individual player data is not easly retrivable)
- Map-specific strength (aggregate across all maps)
- Meta adaptation speed (Elo lags behind rapid shifts)
- Roster synergy (chemistry vs. raw talent)
---

## Future Enhancements Under Consideration

### 1. Rating Deviation (Glicko-style)

Track confidence intervals for each rating:

$$
R \pm \sigma
$$

Where $\sigma$ (rating deviation) decreases with games played.

**Benefit:** Visualize certainty (e.g., "1400 ± 50" vs. "1400 ± 150")

### 2. Head-to-Head Modifiers

If Team A consistently beats Team B despite similar ratings:

$$
E_A^{\text{adjusted}} = E_A + \beta \cdot H_{AB}
$$

Where $H_{AB}$ is the historical head-to-head advantage.

**Benefit:** Captures rock-paper-scissors dynamics

### 3. Map-Specific Ratings

Separate Elo tracks for Control, Escort, Hybrid, Push, Flashpoint.

**Benefit:** Better predictive accuracy for specific map pools

### 4. Time-Decay Weighting

Weight recent matches more heavily:

$$
\Delta R = K \cdot e^{-\lambda t} \cdot (S - E)
$$

Where $\lambda$ is decay constant and $t$ is time since match.

**Benefit:** Reflects current form vs. historical performance

---

## Appendix: Key Constants Reference

```typescript
// K-Factor Phases
const K_CALIBRATION = 50;  // Games 0-10
const K_STABILITY = 20;    // Games 10+
const K_MAJOR = 60;        // International tournaments

// Regional Starting Ratings
const STARTING_ELO = {
  "Korea": 1304,
  "North America": 1264,
  "EMEA": 1255,
  "Japan": 1211,
  "China": 1200,
  "Pacific": 1189,
  "default": 1200
};

// Filters
const MIN_GAMES_PLAYED = 10;
const INACTIVITY_DAYS = 90;
const RATING_FLOOR = 1000;

// Seasonal Reset
const SEASONAL_RETENTION = 0.75;
const STARTING_ELO_BASELINE = 1200;

// MoV Multipliers
const MOV_MULTIPLIERS = {
  dominant: 1.2,  // 3+ map diff
  solid: 1.0,     // 2 map diff
  close: 0.8      // 1 map diff
};
```

---

## Data Sources & Transparency

**Primary Data Source:** [Liquipedia Overwatch API](https://liquipedia.net/overwatch/api.php)

**Match Inclusion Criteria:**
- ✅ Official OWCS tournaments (Stages, Majors, Regional Playoffs, Promotion/Relegation)
- ✅ Tier-1 competition only
- ❌ Showmatches, FACEIT League matches, matches that are not completed ect.

**Update Frequency:** Automated rebuild every 6 hours via Vercel Cron

**Reproducibility:** Full match history and algorithm available in [documentation repository](#).
---

*Last Updated: January 2025*  
*Algorithm Version: 1.0*  
*Total Matches Processed: 918*  
*Active Teams Tracked: 30+*