
# OWCS For Nexus
A dynamic and comprehensive fan-made showcase of the major teams of the Overwatch Champions Series (OWCS), made in mind for both casual fans who want to learn more about the best teams in the world and for the more hardcore fans who want to "revise" their knowledge. 



### Preview

![OWCS Wiki Homepage](<PASTE_A_LINK_TO_YOUR_HOMEPAGE_SCREENSHOT_HERE.jpg>)

## ✨ Features
* **Detailed player profiles**, with:
    * Career timelines and acomplishments.
    * Signature heroes.
    * Most recent Player POV's so you can catch all the most recent action! (courtesy of [ObsSojourn's Youtube channel](https://www.youtube.com/@ObsSojourn) for them, shoutouts to the GOAT!)
* **Detailed Team Rosters**, with the latest updates and info about your favourite team! 
* **Interactive Player List:** A React "island" that lets users instantly search and filter all players by name, role, and team.
* **Content-Driven:** All player, team, and career data is managed in easy-to-edit Markdown files using Astro's Content Collections.

## 📔 TODO list
* [ ] Coaching staff for all the teams
* [ ] Updated Player and Team Info
* [ ] Player and Team Comparison
* [ ] Team Power Rankings (a la LoL Esports)

## 🛠️ Tech Stack

* **Framework:** [Astro](https://astro.build/)
* **UI:** [React](https://react.dev/) (for interactive islands like the Quiz and Player Filter)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/) (with the Vite plugin)
* **Content:** [Astro Content Collections](https://docs.astro.build/en/guides/content-collections/)
* **Deployment:** [Vercel](https://vercel.com/)

## 🚀 Getting Started

If you want to make your own fork of the project, or you're just curious about the structure of it, follow these steps to run the project locally:

### 0. Premise
This project uses a Google Cloud API key for the YouTube Player POV implementation in the .env file in the root. The site will still run without it, but the "Player POV" sections will not load data so if you plan on implementing the feature, remember to get a "YouTube Data API v3" API key from Google Cloud!

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
* **Video Content:** Player Point-of-View (POV) videos are embedded from YouTube and remain the intellectual property of their original creators and broadcasters (including the official [Overwatch Esports](https://www.youtube.com/@ow_esports) and [ObsSojourn](https://www.youtube.com/@ObsSojourn) channels). This site does not host or claim ownership of any video content.

This project is built for educational and community purposes under [Fair Use](https://www.copyright.gov/fair-use/) principles.

