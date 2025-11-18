
# OWCS For Dummies
A dynamic and comprehensive fan-made wiki for the Overwatch Champions Series (OWCS), made for both casual fans who want to learn more about the best teams in the world and for the more hardcore fans who want to "revise" their knowledge, all built with Astro. This site features detailed player profiles, team rosters, career timelines, and most recent Player POV's (courtesy of @ObsSojourn's Youtube channel for them, shoutout to the goat!) and interactive quizzes.

### Preview

![OWCS Wiki Homepage](<PASTE_A_LINK_TO_YOUR_HOMEPAGE_SCREENSHOT_HERE.jpg>)

## ✨ Features

* **Static Player Pages (SSG):** Pre-built pages for maximum speed and performance.
    * Fetches "Most Recent POV" from YouTube *at build time* to save API quota.
    * Detailed career timelines with accolades and general description of the player
    * Signature hero portraits.
* **Dynamic Team Pages (SSR):** Server-renders on request to provide live data.
    * **Random Team Quiz:** A different quiz is generated every time the page is loaded, to test your knowledge on your favourite team.
    * **Custom Banners:** Displays unique regional banners for each team and country flags for each player.
* **Interactive Player List:** A React "island" that lets users instantly search and filter all players by name, role, and team.
* **Content-Driven:** All player, team, and career data is managed in easy-to-edit Markdown files using Astro's Content Collections.

## 🛠️ Tech Stack

* **Framework:** [Astro](https://astro.build/)
* **UI:** [React](https://react.dev/) (for interactive islands like the Quiz and Player Filter)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/) (with the Vite plugin)
* **Content:** [Astro Content Collections](https://docs.astro.build/en/guides/content-collections/)
* **Deployment:** [Vercel](https://vercel.com/)

## 🚀 Getting Started

If you want to make your own fork of the project, or you're just curious about the structure of it, follow these steps to run the project locally:

### 0. Premise
This project a Google Cloud API key for the YouTube Player POV implementation in the .env file in the root. The site will still run without it, but the "Player POV" sections will not load data so if you plan on implementing the feature, remember to get an API key from Google Cloud!.

### 1. Clone the Repository

Paste this into your Terminal of choice:

```sh
git clone [https://github.com/your-username/owcs-wiki.git](https://github.com/your-username/owcs-wiki.git)
cd owcs-wiki
```
### 2. Run the Dev Server
Now that you've got the source code, you can localy run this site by pasting this in your Terminal:
```sh
npm run dev
```
If you want to test it on multiple devices, just add the "-- --host" flags on the command!

## ⚖️ Disclaimer

OWCS Wiki is an unofficial fan project. This site is not affiliated with, endorsed by, or sponsored by Blizzard Entertainment or the OWCS.

All Overwatch content © Blizzard Entertainment, Inc. All other trademarks, team logos, and player images are the property of their respective owners.

