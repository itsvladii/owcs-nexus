---
title: "OWCS Nexus ELO Ranking System"
description: "Complete technical documentation of the modified ELO algorithm powering the OWCS Nexus rankings"
lastUpdated: 2026-03-01
version: "1.0"
template: doc
---

# OWCS ELO Rating System — Technical Documentation

## Overview

This system ranks teams competing in the Overwatch Champions Series (OWCS) using a modified ELO algorithm designed for the specific characteristics of OW Esports: regional disparities in strength, roster volatility, and a structured annual season format.

The system processes all OWCS match results chronologically and updates team ratings after every match based on the outcome, tournament importance, scoreline, and competitive context. At the start of each season, regional baselines are recalculated from a full re-simulation of the previous year's data to account for how each region actually performed.

<blockquote class="warning">
⚠️ Disclaimer

This ranking system is currently in its initial deployment phase. Users should treat the data as a "rough estimate" rather than absolute truth, as discrepancies may exist while we refine regional weights, roster continuity mapping and team rebranding records.

</blockquote>

---

## Data Sources

Match data is pulled from the [Official Liquipedia API](https://liquipedia.net/api). Only matches from official OWCS tournaments are eligible for calculation:

**✅ Eligible matches**
- Regional Stages (Round Robin, Playoffs, Seeding Deciders, Promotion/Relegation etc.)
- Major LAN tournaments (Group Stages and Playoffs)
- Qualification tournaments for Major LAN events (Last Chance Qualifiers, cross-regional qualifiers such as the OWCS Asia Stage Championship)

**❌ Ineligible matches**
- Matches from Overwatch Collegiate
- Matches from Calling All Heroes (CAH)
- Matches from the Overwatch World Cup (OWWC)
- Matches from the FACEIT League (Masters/Expert/Open of any region)
- Showmatches, OWCS Pre-Season Bootcamp and other miscellaneous events

Additionally, the algorithm only processes **completed matches with definitive scores**. Eventual forfeits, walkovers, and matches with missing scores are skipped entirely in order to keep the ratings as clean and meaningful as possible.

---

## Mathematical Foundations

### The ELO Rating System

ELO is a method for calculating relative skill levels in competitive settings. Originally developed by Arpad Elo for chess, it has been adapted across many domains, from international football with the [FIFA's Men's World Rankings](https://inside.fifa.com/fifa-world-ranking/men) to esports like the [League of Legends Global Power Rankings](https://lolesports.com/it-IT/gpr/2025/worlds).

The core principle of ELO is that each player (or team in this case) has a numerical rating representing their skill level. After each match, the ratings are updated based on the actual result compared to the expected result, which is derived from the rating difference between the two teams.

### Expected Score (Win Probability)

The core of this system is the "expected score" function, which predicts the probability of a team winning, given the current ratings of both teams. It uses the **logistic distribution**:

$$
E_A = \frac{1}{1 + 10^{(R_B - R_A)/400}}
$$

Where:
- $E_A$ = Expected score for Team A (win probability, $0 \leq E_A \leq 1$)
- $R_A$ = Current rating of Team A
- $R_B$ = Current rating of Team B
- The constant $400$ sets the scale: a 400-point difference means the stronger team wins ~91% of the time

The expected score for Team B is always the complement:

$$
E_B = 1 - E_A
$$

**Interpretation examples:**

| Rating Difference ($R_A - R_B$) | Win Probability ($E_A$) | Interpretation |
|---|---|---|
| $0$ | $50\%$ | Even match |
| $+100$ | $\approx 64\%$ | Slight favourite |
| $+200$ | $\approx 76\%$ | Clear favourite |
| $+400$ | $\approx 91\%$ | Heavy favourite |
| $+600$ | $\approx 97\%$ | Near-certain winner |

---

## Rating Update Formula

After each match, ratings are updated based on how much the actual result differed from what was expected:

$$
R_A^{\text{new}} = R_A^{\text{old}} + K_A \cdot (S_A - E_A)
$$

$$
R_B^{\text{new}} = R_B^{\text{old}} + K_B \cdot (S_B - E_B)
$$

Where:
- $K$ = K-factor (controls how much ratings move — explained in detail below)
- $S$ = Actual result (1 for winner, 0 for loser)
- $E$ = Expected score (win probability from above)

The term $(S - E)$ represents the "surprise" of the result: if a team wins when it was expected to lose (e.g. $S=1$ but $E=0.2$), it gains more points than if it wins as expected (e.g. $S=1$ and $E=0.8$). Conversely, losing when expected to win results in a larger rating drop.

**Note on zero-sum:** Because each team uses its own K-factor (which may differ), the total rating points in the system are not strictly conserved. This is intentional and is explained further under [System Properties](#system-properties--limitations).

---

## Starting Ratings by Region

Not all OWCS regions are built equally. As some regions have historically performed better on the international stage than others, each region starts with a different baseline ELO scores at the beginning of the season. This baseline ELO scores serves as the default rating for new teams from that region and as the reset point for teams undergoing roster changes.

For OWCS 2026, the starting baselines are as follows:

| Region | Starting ELO ($R_0$) | Notes |
|---|---|---|
| Korea | 1219 | Consistently dominant: Falcons and CR won 2 of 3 Major events in 2025 and consistently on the podium |
| EMEA | 1223 | Breakout year: performing better than expected, all-EMEA World Finals Grand Final, Twisted Minds world champions |
| North America | 1199 | Solid region with great talents but no Major podium or silverware unlike EMEA or Korea |
| China | 1195 | Recently back in OW Esports as an official region, very top heavy region because of Weibo Gaming |
| Japan | 1178 | Emerging strength, both regionally and internationally thanks to VARREL's partecipations in Major events |
| Pacific | 1162 | Developing region, very limited Major representation in 2025 |
| Default | 1200 | Fallback for unclassified or unrecognized teams |

### Why these specific numbers?

These baselines are derived from a full re-simulation of the 2025 season. The same ELO algorithm is used as for the live rankings, but with all teams starting at 1200 to eliminate underlying regional biases. The final baselines are calculated using a combination of two signals:

**1st Signal — International Performances (60% weight):** How well did this region's best representatives perform at Major events relative to expectations? This is measured as the normalized per-match overperformance: the sum of `(actual result − expected win probability)` across all major matches, divided by total major matches played. 

**Reason**: This captures the "ceiling" of each region's competitive strength on the international stage, which is the most relevant factor for cross-regional matchups. A region with a top team that consistently overperforms at Majors should have a higher baseline than a region whose best team underperforms, even if their domestic depth is similar.

**2nd Signal — Domestic Depth (40% weight):** How competitive and even is the region internally? This is the average calibration rating of all qualified teams, minus a variance penalty for lopsided distributions. This ensures that a region where one team dominates and everyone else is far behind is penalized relative to a region where multiple teams fight for the regional Stage title. 

These two signals are then combined, and the result is compressed 60% toward the 1200 baseline via a soft reset formula:

$$
R_{\text{baseline}} = 1200 + (\text{combinedScore} - 1200) \times 0.6
$$

It is important to note that only teams meeting all three qualifying thresholds are considered in the baseline calculations:
- At least 8 total games played
- At least 2 wins
- Calibration rating ≥ 1000

**Reason**: This ensures that only teams with a meaningful track record of competitive performance contribute to the regional baseline, preventing outliers with insufficient data from skewing the results.

### Handling roster resets in calibration

Teams that underwent a major roster change during the season (≥60% of the active roster changed) have their ELO reset during **live rankings**. 

However, using their post-reset rating for the **regional baseline** calculations would erase the performance of the original roster, which may have been the one that actually competed at Majors and contributed to the international signal. (e.g NTMR's miracle run at Champions Clash in 2025 before their roster rebuild for Stage 2)

For these teams, the calibration script uses their **peak pre-reset rating**, provided that peak was sustained for at least 3 matches (to filter out single-tournament hot streaks). For teams with no roster reset, the final end-of-season rating is used as it represents sustained performance across the season.

### Why 2025 as the starting point?

The 2026 baselines are calculated based on a re-simulation of 2025 rather than the inaugural 2024 season of OWCS. The primary reason for this is structural, as 2025 was the first year that China competed as an official OWCS region following the disbandment of the Overwatch League in 2023.

Using 2024 data would result in a Chinese baseline derived from a much (much) smaller and less competitive sample, which predates full regional parity. From 2027 onwards, baselines will roll forward annually, starting from 2025.

---

## The K-Factor System

The K-factor is a crucial component of the ELO system that determines how much a team's rating changes after each match. In this ranking system, the K-factor is dynamically calculated based on multiple factors to ensure that changes to ELO scores reflect the competitive context of each match.

### Step 1 — Tournament tier baseline

At the core of the K-factor system are two base values that represent the "importance" of the match:

$$
K_{\text{base}} =
\begin{cases}
60 & \text{if Major tournament} \\
20 & \text{otherwise}
\end{cases}
$$

**Major tournament classification** is determined by keyword matching on the tournament name, with exclusion rules applied first:

*Exclusions (these are never Majors regardless of other keywords):*
- Contains "qualifier" or "last chance"
- Contains "road to"

*Inclusions (only checked after exclusions pass):*
- Contains "champions clash"
- Contains "midseason championship"
- Contains "world finals"
- Contains "ewc" or "esports world cup"
- Contains "major"

**Reason**: The exclusion-first approach prevents compound tournament names (e.g. "Road to World Finals" or "Midseason LCQ") from being incorrectly classified as major events.

### Step 2 — Calibration phase for new rosters

For new teams with fewer than 6 matches on their current roster, K-factor starts high and decreases linearly as they accumulate results:

$$
K_{\text{calibration}}(n) = 50 - \frac{(50 - 20) \cdot n}{6}, \quad n < 6
$$

This produces the following progression:

| Games played ($n$) | K-factor |
|---|---|
| 0 | 50.0 (maximum volatility) |
| 1 | 45.0 |
| 2 | 40.0 |
| 3 | 35.0 |
| 4 | 30.0 |
| 5 | 25.0 |
| ≥6 | Standard K (step 1 applies) |

**Reason**: This phase acts as a built-in 'placement system', similar to the one in Overwatch's Competitive mode. This is because new rosters are more difficult to position due to a lack of previous data, therefore "wider swings" are needed for teams to reach their true ranking positions.


### Step 3 — Bully penalty (anti-farming)

Whenever the winning team holds a large rating advantage over the losing team, the K-factor for that match is halved to prevent "farming" of low-rated opponents:

$$
K_{\text{bully}} =
\begin{cases}
K \times 0.5 & \text{if } R_{\text{winner}} - R_{\text{loser}} > 250 \\
K & \text{otherwise}
\end{cases}
$$

**Reason**: Beating a local low-rated team is "expected behavior" from a regional powerhouse and yields almost no new information. This forces elite regional teams to get good international results in Major LAN events in order to climb further, while also "protecting" much weaker teams from being excessively punished for losing to much stronger opponents.

### Step 5 — Margin of Victory (MoV) multiplier

The scoreline of a match carries information about how dominant the actual performance was. The MoV (Margin of Victory) multiplier rewards convincing wins and reduces the impact of close matches:

$$
p_{\text{win}} = \frac{\max(s_A, s_B)}{s_A + s_B}
$$

$$
M(s_A, s_B) =
\begin{cases}
1.2 & \text{if } p_{\text{win}} \geq 0.80 \quad \text{(Dominant)} \\
1.0 & \text{if } 0.60 \leq p_{\text{win}} < 0.80 \quad \text{(Solid)} \\
0.8 & \text{if } p_{\text{win}} < 0.60 \quad \text{(Close)}
\end{cases}
$$

Applied to both teams' K-factors:

$$
K^* = K \times M(s_A, s_B)
$$

**Series format examples:**

| Format | Score | $p_{\text{win}}$ | Category | Multiplier |
|---|---|---|---|---|
| Bo3 | 2-0 | 1.00 | Dominant | 1.2× |
| Bo3 | 2-1 | 0.67 | Solid | 1.0× |
| Bo5 | 3-0 | 1.00 | Dominant | 1.2× |
| Bo5 | 3-1 | 0.75 | Solid | 1.0× |
| Bo5 | 3-2 | 0.60 | Solid | 1.0× |
| Bo7 | 4-0 | 1.00 | Dominant | 1.2× |
| Bo7 | 4-1 | 0.80 | Dominant | 1.2× |
| Bo7 | 4-2 | 0.67 | Solid | 1.0× |
| Bo7 | 4-3 | 0.57 | Close | 0.8× |


### Step 6 — Safety floor

Regardless of all other modifiers, the final K-factor is always at least 5:

$$
K_{\text{final}} = \max(K^*, 5)
$$

**Reason**: This ensures every match always has some impact on ratings.

### Complete K-factor formula

$$
K_{\text{final}} = \max\left(
\begin{cases}
K_{\text{calibration}}(n) \times M & \text{if } n < 6 \\
K_{\text{base}} \times \alpha_{\text{regional}} \times \alpha_{\text{bully}} \times M & \text{otherwise}
\end{cases}
, 5\right)
$$

Where:
- $\alpha_{\text{regional}} = 0.75$ if intra-regional non-Major, else $1.0$
- $\alpha_{\text{bully}} = 0.5$ if bully penalty applies, else $1.0$
- $M \in \{0.8, 1.0, 1.2\}$ based on margin of victory

---

## Complete Rating Update Process

### Step 1 — Calculate expected scores

$$
E_A = \frac{1}{1 + 10^{(R_B - R_A)/400}}, \quad E_B = 1 - E_A
$$

### Step 2 — Determine actual scores

$$
S_A = \begin{cases} 1 & \text{Team A won} \\ 0 & \text{Team A lost} \end{cases}, \quad S_B = 1 - S_A
$$

### Step 3 — Calculate K-factors

$$
K_A = f_K(n_A, \text{tournament}, \text{regions}, R_{\text{winner}}, R_{\text{loser}}, s_A, s_B)
$$

$$
K_B = f_K(n_B, \text{tournament}, \text{regions}, R_{\text{winner}}, R_{\text{loser}}, s_A, s_B)
$$

Both teams share the same tournament and match context inputs, but their individual game counts ($n_A$, $n_B$) may differ, producing asymmetric K-factors.

### Step 4 — Calculate rating changes

$$
\Delta R_A = K_A \cdot (S_A - E_A), \quad \Delta R_B = K_B \cdot (S_B - E_B)
$$

### Step 5 — Apply updates

$$
R_A^{\text{new}} = R_A^{\text{old}} + \Delta R_A, \quad R_B^{\text{new}} = R_B^{\text{old}} + \Delta R_B
$$

---

## Worked Examples

### Example 1: Major tournament, evenly matched teams

**Setup:** OWCS World Finals (Major). Team A: 1450 ELO, 25 games, Korea. Team B: 1420 ELO, 30 games, EMEA. Score: 3-1 Team A wins. International match.

**Expected scores:**
$$E_A = \frac{1}{1 + 10^{(1420-1450)/400}} = 0.543, \quad E_B = 0.457$$

**K-factors:** Both past calibration, Major, no bully penalty (diff = 30 < 250).
$$p_{\text{win}} = \frac{3}{4} = 0.75 \Rightarrow M = 1.0$$
$$K_A = K_B = 60 \times 1.0 = 60$$

**Rating changes:**
$$\Delta R_A = 60 \times (1 - 0.543) = +27.4$$
$$\Delta R_B = 60 \times (0 - 0.457) = -27.4$$

**Result:** $R_A = 1477.4$, $R_B = 1392.6$. Near zero-sum because K-factors are equal.

---

### Example 2: Regional match, dominant favourite

**Setup:** EMEA Regional Stage (not Major). Team A: 1550 ELO, 40 games, EMEA. Team B: 1250 ELO, 35 games, EMEA. Score: 3-0. Intra-regional.

**Expected scores:**
$$E_A = \frac{1}{1 + 10^{(1250-1550)/400}} = 0.849, \quad E_B = 0.151$$

**K-factors:** Same region → regional compression. Rating diff = 300 > 250 → bully penalty. 3-0 → $p_{\text{win}} = 1.0$ → $M = 1.2$.
$$K_A = K_B = 20 \times 0.75 \times 0.5 \times 1.2 = 9.0$$

**Rating changes:**
$$\Delta R_A = 9.0 \times (1 - 0.849) = +1.4$$
$$\Delta R_B = 9.0 \times (0 - 0.151) = -1.4$$

**Result:** $R_A = 1551.4$, $R_B = 1248.6$. The dominant favourite gains very little due to the bully penalty and regional compression, while the underdog loses very little for an expected defeat.

---

### Example 3: New team upsets a veteran

**Setup:** OWCS Asia Qualifiers (not Major). Team A (new): 1200 ELO, 2 games, Pacific. Team B (veteran): 1450 ELO, 50 games, Korea. Score: 3-2 Team A wins. International.

**Expected scores:**
$$E_A = \frac{1}{1 + 10^{(1450-1200)/400}} = 0.192, \quad E_B = 0.808$$

**K-factors:** Team A in calibration ($n=2$): $K_A = 50 - (30 \times 2/6) = 40$. Team B standard: $K_B = 20$. No bully penalty (underdog won). $p_{\text{win}} = 3/5 = 0.60$ → $M = 1.0$.
$$K_A^* = 40, \quad K_B^* = 20$$

**Rating changes:**
$$\Delta R_A = 40 \times (1 - 0.192) = +32.3$$
$$\Delta R_B = 20 \times (0 - 0.808) = -16.2$$

**Analysis:** The new team gains 32.3 points (high calibration K + large surprise factor). The veteran loses only 16.2 (lower established K). The system adds a net +16.1 points, a non-zero-sum outcome due to the asymmetric K-factors.

---

## Upset Detection

A match is classified as an **upset** when the winning team had less than 35% win probability going into the match:

$$
\text{Upset} \iff E_{\text{winner}} < 0.35
$$

This threshold corresponds to a rating difference of approximately -120 points:

| Rating diff (winner vs loser) | Winner's expected score | Classified as upset? |
|---|---|---|
| $-50$ | $0.43$ | No |
| $-100$ | $0.36$ | No |
| $-120$ | $0.33$ | Yes |
| $-200$ | $0.24$ | Yes |
| $-300$ | $0.15$ | Yes (major upset) |

**Note**: For the public statistics, only upsets from Major tournaments are shown. WhileRegional upsets are tracked internally, they're not featured as they are less meaningful in the context of a "global" team ranking system.

---

## Ranking Filters

To be included in the public rankings table, teams must meet the following criteria:

$$
\text{Ranked} \iff (R \geq 1000) \land (W \geq 1) \land (\Delta t_{\text{inactive}} < 90 \text{ days})
$$

Where:
- $R$ = Current rating
- $W$ = Total wins
- $\Delta t_{\text{inactive}}$ = Days since their last match

**Note**: The 90-day inactivity cutoff is calculated from the date of the most recent match in the database, not the current calendar date. This means the cutoff advances with the season rather than running in real-time.

---

## Special Cases & Edge Handling

### Team aliases

Some teams appear in Liquipedia with parenthetical disambiguators (e.g. "Team CC (Chinese orgless team)") or change names over time (e,g WAY becoming WAE). The system strips these suffixes and maps any known aliases to a canonical team name before processing, in order to maintain a certain level of consistency between team names in the ranking table.

### Roster resets

When a team changes ≥60% of its active roster, it is treated as a "new" team for ranking purposes. This means their ELO is reset to a specified value (the regional baseline for live rankings, otherwise 1200 for the regional baseline calculations) and they re-enter the calibration phase with elevated K-factors for their first 6 matches.

**Note**: Roster resets are defined manually, specifying the team name, the date the reset takes effect, and the ELO value to reset to. In a perfect world, this would be an automated process based on player transfer data but due to the lack of a clean and reliable data source from Liquipedia, it is currently handled manually.

### Region inference

A team's region is determined by the tournament name of their most recently played match. This handles teams that move between regions mid-season:

$$
\text{region}(T) =
\begin{cases}
\text{Korea} & \text{if "Korea" in } T \\
\text{North America} & \text{if "North America" or "NA" in } T \\
\text{EMEA} & \text{if "EMEA" or "Europe" in } T \\
\text{China} & \text{if "China" in } T \\
\text{Japan} & \text{if "Japan" in } T \text{ and "Pacific" not in } T \\
\text{Pacific} & \text{if "Pacific" in } T \text{ and "Japan" not in } T \\
\text{null} & \text{otherwise (multi-region or unrecognized)}
\end{cases}
$$

When region is null, the match is treated as international (not regional), meaning no regional compression is applied.

### Forfeit and invalid score handling

Matches are skipped if any of the following conditions are detected:
- Opponent status includes "ff", "dq", "canceled", "forfeit", or "w/o"
- Raw score is "-1", "FF", or missing
- Parsed score is NaN after conversion

This ensures that only completed matches with definitive scores are included in the ratings calculations, maintaining the integrity of the rankings.

---

## System Properties & Limitations

### Non-zero-sum rating pool

Because K-factors are calculated independently per team, the total ELO in the system is not conserved. When a calibrating team (K=40) beats an established team (K=20), the calibrating team gains 40×(S−E) while the established team loses only 20×(S−E). The net effect is a pool injection of 20×(S−E) points.

**Reason**: By doing this, we allow new teams to climb faster when they perform well, while established teams are more resistant to volatility. However, it also means that the average ELO across all teams can drift over time, especially if there are many upsets or if the distribution of K-factors is skewed.

### Regional starting bias

Initial baselines create a prior belief about cross-regional match outcomes before any games are played. For 2026:

$$
P(\text{EMEA wins vs Pacific}) = \frac{1}{1 + 10^{(1165 - 1228)/400}} \approx 0.59
$$

**Reason**: This reflects the historical performance of these regions, but it also means that early-season matches may be influenced by these priors until enough data is collected to adjust ratings based on actual performance.

### International score uses best performer, not average

The international signal for regional baselines uses the single best-performing team from each region at Majors (highest normalized overperformance), rather than an average across all teams. This means a region's international ceiling is defined by its strongest representative, where one extraordinary team can anchor a region's baseline even if the rest performed poorly internationally. (e.g Japan with VARREL or China with Weibo Gaming) 

**Reason**: International competition is often top-heavy, with one or two standout teams carrying the region's reputation. Using the best performer captures this dynamic more accurately than an average, which could be diluted by weaker teams.

---

## Design Philosophy

### Core principles
1. **Rapid convergence:** New rosters reach their approximate true rating within ~6 matches via the calibration phase.
2. **Stability:** Established teams resist volatility: strong K asymmetry means they can't be badly damaged by a single result.
3. **Context sensitivity:** A win in a Major is worth more than a win in a regional stage, which is worth more than beating a much weaker local opponent.
4. **Anti-exploitation:** The bully penalty ensures elite teams must prove themselves internationally, not by farming weak regional opponents.
5. **Honest baselines:** Season-start ratings are derived from actual simulated performance, not assumptions, and are updated annually.
---

## Glossary

**ELO** — A rating system for skill assessment in competitive environments, originally developed by Arpad Elo.

**K-Factor** ($K$) — Volatility parameter that controls how much a team's rating changes after each match.

**Expected Score** ($E$) — Predicted win probability based on the rating difference between two teams, calculated using the logistic function.

**Calibration Phase** — The first 6 games on a new roster, during which K is elevated to help the team find its true skill level quickly.

**Bully Penalty** — A 50% K reduction applied when the winning team holds a 250+ point rating advantage over the losing team.

**MoV (Margin of Victory)** — Measured by the winner's map win percentage. Dominant victories earn a 1.2× multiplier; close matches apply 0.8×.

**Regional Compression** — Reduction of K from 20 to 15 for intra-regional non-Major matches, reflecting their lower information value globally.

**Soft Reset / Baseline Recalculation** — The annual process of recalculating regional starting ELOs from a fresh simulation of the previous season, combining international performance and domestic depth signals.

**International Score** — The normalized overperformance signal used in calibration: sum of (actual − expected win probability) per Major match, divided by total Major matches, scaled to ELO points.

**Depth Score** — The domestic competitiveness signal used in calibration: average calibration rating of all qualified teams in a region, minus a variance penalty for lopsided distributions.

**Upset** — A match result where the winning team had less than 35% expected win probability.

**Roster Reset** — A manual event triggered when a team changes ≥60% of its roster, resetting their ELO to a specified value and restarting the calibration phase.

**Region Inference** — The process of determining a team's current region from the tournament name of their most recently played match.
