
# OWCS Nexus
A dynamic and comprehensive fan-made showcase of the major teams of the Overwatch Champions Series (OWCS), made in mind for both casual fans who want to learn more about the best teams in the world and for the more hardcore fans who want to "revise" their knowledge. 

### Preview

![OWCS Wiki Homepage](<PASTE_A_LINK_TO_YOUR_HOMEPAGE_SCREENSHOT_HERE.jpg>)

## ✨ Features
* **Global Team Power Rankings:** An (un)official global leaderboard of the Top 30 teams across all official OWCS regions based on their performances in international stages and in their respective regions.
* **OWCS Transfer Hub:** Be updated with all the transfer moves that happen across all of OWCS!
* **OWCS Stock Market Simulator:** Show that you're ahead of the curve in a stock market simulator where you can buy/sell stocks of your favourite OWCS teams! (no real money involved whatsoever.)


## 📔 TODO list
* [x] Team Power Rankings (a la LoL Esports)
* [x] OWCS Transfer Hub
* [x] OWCS "Stock Market" Simulator

## 🛠️ Tech Stack

* **Framework:** [Astro](https://astro.build/)
* **UI:** [React](https://react.dev/) (for interactive components the Player/Team Filter)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/) (with the Vite plugin)
* **Content:** [Astro Content Collections](https://docs.astro.build/en/guides/content-collections/)
* **Deployment:** [Vercel](https://vercel.com/)

## 🚀 Getting Started

If you want to make your own fork of the project, or you're just curious about the structure of it, follow these steps to run the project locally:

### 0. Premise
This project uses the Liquipedia API for all the necessary data fetching for the Transfer Hub and especially for the Team Power Rankings. Make sure you have a Liquipedia API Key in order to replicate this project at home!

### 1. Clone the Repository

Paste this into your Terminal of choice:

```sh
git clone [https://github.com/your-username/owcs-nexus.git](https://github.com/your-username/owcs-nexus.git)
cd owcs-wiki
```
### 2. Run the Dev Server
Now that you've got the source code, you can localy run this site by pasting this in your Terminal:
```sh
npm run dev
```
If you want to test it on multiple devices, just add the "-- --host" flags on the command!

## ⚖️ Disclaimer & Credits

**OWCS Nexus** is a non-commercial, unofficial fan project dedicated to the Overwatch Champions Series.

* **Blizzard:** This site is not affiliated with, endorsed by, or sponsored by Blizzard Entertainment, Inc. or the Overwatch Champions Series (OWCS). Overwatch and all related assets are trademarks or registered trademarks of Blizzard Entertainment, Inc.
* **Teams & Players:** All team logos, player names, and player likenesses are the property of their respective organizations and owners.
* **Multimedia Content:** All images and videos that appear on the site are the property of their respective owners. This site does not host or claim ownership of any video content.
* **Match Data:** This website uses data pulled from Liquipedia by the official Liquipedia API, a community-driven wiki for esports competitions. Tournament names, team names, tournament logos, team logos, tournament bracket details and images are sourced from [Liquipedia](https://liquipedia.net) and are used under the [CC-BY-SA 3.0 license](https://creativecommons.org/licenses/by-sa/3.0/).

This project is built for educational and community purposes under [Fair Use](https://www.copyright.gov/fair-use/) principles.

