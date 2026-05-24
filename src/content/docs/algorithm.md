---
title: "ELO Ranking System"
description: "The complete technical manual and mathematical specification of the OWCS Nexus ELO algorithm."
lastUpdated: 2026-05-24
version: "1.2"
template: doc
---

# Complete Technical Manual

This document serves as the exhaustive reference for the OWCS Nexus ELO ranking system. It covers the mathematical foundations, the dynamic volatility engine, regional calibration philosophy, and the specific edge-case handling logic that ensures ranking integrity.

<blockquote class="warning">
⚠️ Disclaimer

This ranking system is pretty much a version 1.0. Users should treat the data as a "rough estimate" rather than absolute truth on the abilities of the teams/regions, as discrepancies may exist while regional weights, roster continuity mapping and team rebranding get adjusted.

</blockquote>

---

## 1. Mathematical Foundations

The Teams Global Standings's ELO system is an interpretation of the ELO rating system for the Overwatch Champions Series, that treats match outcomes and seasonal context as discrete samples of a team's power level in the international.

### 1.1 Expected Score (Win Probability)

The core of the system is the prediction of match outcomes. Given two teams with ratings $R_A$ and $R_B$, the expected score $E_A$ (probability of winning) for Team A is calculated using a logistic curve:

$$
E_A = \frac{1}{1 + 10^{(R_B - R_A)/400}}
$$

**The Constant 400:**
The denominator of 400 determines the "spread" of the ratings. 
- A **100-point** difference implies a **~64%** win probability for the favorite.
- A **200-point** difference implies a **~76%** win probability.
- A **400-point** difference (one standard deviation in our model) implies a **~91%** win probability.

### 1.2 The Update Equation

After a match, the ratings are updated based on the "surprise" factor—the difference between the actual result $S_A$ (1 for win, 0 for loss) and the expected result $E_A$:

$$
R_A' = R_A + K \cdot (S_A - E_A)
$$

This ensures that:
- **Expected wins** result in small gains.
- **Upsets** result in large gains for the underdog and large losses for the favorite.
- **Total skill transfer** is scaled by the $K$-factor.

---

## 2. The Dynamic K-Factor Engine

The $K$-factor is the most critical parameter in any ELO system. It controls the **volatility**—how much a single match can change a team's standing. Nexus uses a multi-variable dynamic $K$ engine.

### 2.1 Tournament Tiering ($K_{\text{base}}$)

Not all matches carry the same weight. We distinguish between regional play and global championships:

- **Major Events ($K=60$):** Midseason Championships, World Finals, Champions Clash, EWC. These are the highest-stakes matches and provide the most accurate signal of global strength.
- **Regional Events ($K=20$):** Standard OWCS Stages, regional playoffs. These establish the local hierarchy.

### 2.2 The Calibration Phase (Rookie Volatility)

New rosters or teams with significant changes lack a stable rating history. To help them reach their "true" rank faster, we apply a linear decay to their $K$-factor over their first 6 games:

$$
K_{\text{calib}}(n) = 50 - \frac{(50 - 20) \cdot n}{6}
$$

where $n$ is the number of games played on the current roster. This creates a "placement" experience where early wins accelerate a team's climb.

### 2.3 Regional Compression

To prevent regional "bubble" inflation, intra-regional matches (where both teams belong to the same region) that are **not** part of a Major have their $K$-factor dampened:

$$
K_{\text{adj}} = K_{\text{base}} \times 0.75
$$

**Reasoning:** In a closed regional ecosystem, skill transfer is "zero-sum" relative to the region's total power. This dampening ensures that regional standings remain stable while global standings only shift significantly during cross-regional play.

---

## 3. Advanced Multipliers

### 3.1 Bully Penalty (Anti-Farming)

Professional Overwatch occasionally sees extremely lopsided matchups (e.g., a top-seeded team vs. a trial team). To prevent elite teams from "farming" low-tier teams for tiny ELO gains:

> **The 250-Point Rule:** If the winner's rating is more than **250 points** higher than the loser's, the $K$-factor for the winner is slashed by **50%**.

### 3.2 Margin of Victory (MoV)

A 3-0 "stomp" provides a stronger signal of dominance than a 3-2 "nail-biter." We apply a multiplier to the final rating change based on the map win percentage ($p_{\text{win}}$):

| Category | Criteria | Multiplier |
| :--- | :--- | :--- |
| **Dominant** | $p_{\text{win}} \geq 80\%$ (e.g., 3-0, 4-1) | **1.2x** |
| **Solid** | $60\% \leq p_{\text{win}} < 80\%$ (e.g., 3-1, 2-0) | **1.0x** |
| **Close** | $p_{\text{win}} < 60\%$ (e.g., 3-2, 4-3, 2-1) | **0.8x** |

---

## 4. Regional Calibration & Baselines

Each season begins with **Regional Baselines**. These are the starting ELO values for every team in a region, designed to reflect the region's global standing.

<blockquote class="info">
<strong>Regional Variance Note</strong><br/>
Baselines are not absolute measures of "better" or "worse" regions, but rather mathematical priors derived from thousands of simulated match outcomes. They are intended to provide the most accurate starting point for cross-regional ELO calculations and are recalibrated annually to reflect the evolving competitive landscape.
</blockquote>

### 4.1 Calibration Methodology

Every year, we run a "Ground Zero" simulation of the entire previous season. In this simulation, **all teams start at 1200**. We then analyze the final distribution of scores to calculate two distinct signals:

1.  **International Ceiling (60% weight):** We measure the "normalized overperformance" of the region's best teams at Major events. If a region's top team consistently beats higher-rated opponents from other regions, the baseline rises.
2.  **Domestic Depth (40% weight):** We take the average calibration rating of the qualified teams, minus a **variance penalty** for lopsided distributions. A region where the top 8 teams are all highly skilled is "deeper" and receives a higher baseline than a "top-heavy" region.

### 4.2 Current Baselines (2026 Season)

| Region | Baseline | Logic |
| :--- | :--- | :--- |
| **EMEA** | 1223 | Highest depth; World Finals finalists. |
| **Korea** | 1219 | Consistently high ceiling; multiple Major winners. |
| **North America** | 1199 | Solid core, but lacks the international trophies of Korea/EMEA. |
| **China** | 1195 | Extremely top-heavy; high ceiling but lower domestic depth. |
| **Japan** | 1178 | Emerging region with strong "underdog" performance signals. |
| **Pacific** | 1162 | Developing region; currently lacks consistent Major presence. |

---

## 5. Roster Management & Integrity

Overwatch is a game of constant roster changes. The algorithm must be "roster-aware" to remain accurate.

### 5.1 Roster Resets

A **Roster Reset** is triggered manually when a team changes **more than 3 players** (approx. 60% of the roster).
- **Effect:** The team's rating is reset to the current Regional Baseline.
- **Recalibration:** The team re-enters the **Calibration Phase** ($K=50$ for the next 6 games).

### 5.2 Inactivity Decay

To keep the leaderboards "fresh," we apply an inactivity filter.
- **The 90-Day Rule:** Any team that has not played an official OWCS match within the last **90 days** is hidden from the rankings.
- **Disbandment:** If a team is inactive for a full season, their history is archived and they are removed from the database.

### 5.3 Name Normalization & Aliases

To maintain historical continuity, the algorithm uses a **canonical name mapping**.
- **Normalization:** Parenthetical suffixes (e.g., "(Korean Team)") are stripped.
- **Aliases:** If a team rebrands (e.g., *Twisted Minds* $\rightarrow$ *Twisted Minds Esports*), the algorithm maps both names to the same historical entity to preserve their ELO history.

---

## 6. System Properties

### 6.1 Non-Zero-Sum Inflation

Unlike the Chess ELO system, the Nexus system is **not strictly zero-sum**. 
- **Calibration Asymmetry:** If a team in calibration ($K=50$) wins against an established team ($K=20$), the winner gains more points than the loser drops. 
- **Reasoning:** This allows the "total power" of the ecosystem to grow as new talent enters, preventing "ELO deflation" where everyone's rating eventually sinks toward 1000.

### 6.2 Upset Classification

We define an **Upset** as any match where the winner had an expected win probability of **less than 35%** ($E_A < 0.35$). These matches are flagged for special display in the "Recent Matches" and "Historical Upsets" sections of the UI.

---

## 7. Worked Example

### Scenario: The Giant Slayer

**The Setup:**
- **Team A (Underdog):** 1150 ELO (EMEA, established).
- **Team B (Favorite):** 1450 ELO (Korea, established).
- **Tournament:** OWCS Midseason Championship (Major, $K=60$).
- **Result:** Team A wins 3-2 (Close victory).

**Step 1: Calculate Expectations**
$$E_A = \frac{1}{1 + 10^{(1450-1150)/400}} = \frac{1}{1 + 10^{0.75}} \approx 0.151 \text{ (15.1\%)}$$

**Step 2: Determine K-Factors**
- Baseline Major $K = 60$.
- No calibration.
- MoV multiplier for 3-2 score = **0.8x**.
- **Final K** = $60 \times 0.8 = 48$.

**Step 3: Calculate Rating Change**
- **Team A Change:** $48 \times (1 - 0.151) = +40.7$
- **Team B Change:** $48 \times (0 - 0.849) = -40.7$

**Conclusion:** 
Team A gains **41 points** for the massive upset, vaulting them nearly 2 tiers up the leaderboard, while the favorite drops the same amount for the unexpected loss.
