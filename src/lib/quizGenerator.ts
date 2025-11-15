// --- Helper Functions (not exported, just used internally) ---
function shuffle(array) {
  let newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

function getDistractors(array, correctAnswer, count) {
  return shuffle(array.filter(item => item !== correctAnswer)).slice(0, count);
}

function cleanAchievementText(text) {
  // This regex removes one or more emojis from the start of the string, plus a space
  return text.replace(/^[🏆⭐🚀🛡️🥈🎯✚📈📊🔥⚖️🏅🤝]+\s*/, '');
}

// --- Data for Distractors ---
const ALL_HERO_SLUGS = [
  'Ana', 'Ashe', 'Baptiste', 'Bastion', 'Brigitte', 'Cassidy', 'D.Va', 
  'Doomfist', 'Echo', 'Genji', 'Hanzo', 'Illari', 'Junker Queen', 'Junkrat', 
  'Kiriko', 'Lifeweaver', 'Lucio', 'Mauga', 'Mei', 'Mercy', 'Moira', 
  'Orisa', 'Pharah', 'Ramattra', 'Reaper', 'Reinhardt', 'Roadhog', 'Sigma', 
  'Sojourn', 'Soldier: 76', 'Sombra', 'Symmetra', 'Torbjörn', 'Tracer', 
  'Venture', 'Widowmaker', 'Winston', 'Wrecking Ball', 'Zarya', 'Zenyatta'
];

// --- Main Generator Function (EXPORTED) ---
export function generateTeamQuiz(team, playersOnRoster, allPlayers, allTeams) {
  const questionPool = [];

  // Get dynamic data for distractors
  const ALL_PLAYER_NAMES = allPlayers.map(p => p.data.name);
  const ALL_REGIONS = ['NA', 'EMEA', 'Korea', 'China','Pacific','Japan'];
  const ALL_ROLES = ['Tank', 'Flex DPS','Hitscan DPS', 'Main Support','Flex Support'];
  const ALL_COUNTRIES = [...new Set(allPlayers.map(p => p.data.country).filter(Boolean))];
  const ALL_TEAM_NAMES = allTeams.map(t => t.data.name);
  // Create a pool of distractor achievements ---
  const allRawAchievements = allTeams.flatMap(t => t.data.achievements || []);
  const uniqueCleanAchievements = [...new Set(allRawAchievements.map(cleanAchievementText))];

  // --- Q-Type 1: Team Region ---
  const correctRegion = team.data.region;
  const regionDistractors = getDistractors(ALL_REGIONS, correctRegion, 2);
  const regionOptions = shuffle([correctRegion, ...regionDistractors]);
  questionPool.push({
    text: `What region does ${team.data.name} play in?`,
    options: regionOptions,
    correctAnswerIndex: regionOptions.indexOf(correctRegion),
  });

  // --- Q-Type 2: "Who is on this team?" ---
  if (playersOnRoster.length > 0) {
    const rosterNames = playersOnRoster.map(p => p.data.name);
    const correctPlayer = rosterNames[Math.floor(Math.random() * rosterNames.length)];
    const playerDistractors = getDistractors(ALL_PLAYER_NAMES.filter(p => !rosterNames.includes(p)), correctPlayer, 2);
    const playerOptions = shuffle([correctPlayer, ...playerDistractors]);
    questionPool.push({
      text: `Which of these players is on ${team.data.name}?`,
      options: playerOptions,
      correctAnswerIndex: playerOptions.indexOf(correctPlayer),
    });
  }

  // --- Generate questions for EACH player on the roster ---
  for (const player of playersOnRoster) {
    
    // --- Q-Type 3: Player Role ---
    const correctRole = player.data.role;
    const roleDistractors = getDistractors(ALL_ROLES, correctRole, 2);
    const roleOptions = shuffle([correctRole, ...roleDistractors]);
    questionPool.push({
      text: `What is ${player.data.name}'s primary role?`,
      options: roleOptions,
      correctAnswerIndex: roleOptions.indexOf(correctRole),
    });

    // --- Q-Type 4: Player Nationality ---
    if (player.data.country) {
      const correctCountry = player.data.country;
      const countryDistractors = getDistractors(ALL_COUNTRIES, correctCountry, 2);
      const countryOptions = shuffle([correctCountry, ...countryDistractors]);
      questionPool.push({
        text: `What is ${player.data.name}'s nationality?`,
        options: countryOptions,
        correctAnswerIndex: countryOptions.indexOf(correctCountry),
      });
    }
    
    // --- Q-Type 5: Signature Hero ---
    if (player.data.signatureHeroes && player.data.signatureHeroes.length > 0) {
      const correctHero = player.data.signatureHeroes[Math.floor(Math.random() * player.data.signatureHeroes.length)];
      const heroDistractors = getDistractors(ALL_HERO_SLUGS.map(s => s.charAt(0).toUpperCase() + s.slice(1)), correctHero, 2);
      const heroOptions = shuffle([correctHero, ...heroDistractors]);
      questionPool.push({
        text: `Which of these is a signature hero for ${player.data.name}?`,
        options: heroOptions,
        correctAnswerIndex: heroOptions.indexOf(correctHero),
      });
    }

    // --- Q-Type 6: "Did NOT play for" ---
    if (player.data.career && player.data.career.length >= 2) {
      const playedForTeams = player.data.career.map(entry => entry.team);
      const distractorTeam = ALL_TEAM_NAMES.find(name => !playedForTeams.includes(name));
      
      if (distractorTeam) {
        const wrongAnswers = shuffle(playedForTeams).slice(0, 2);
        const options = shuffle([distractorTeam, ...wrongAnswers]);

        questionPool.push({
          text: `On which of these teams did ${player.data.name} NOT play?`,
          options: options,
          correctAnswerIndex: options.indexOf(distractorTeam),
        });
      }
    }

    if (team.data.achievements && team.data.achievements.length > 0) {
    // 1. Get *only* the clean text of this team's achievements
    const teamCleanAchievements = team.data.achievements.map(cleanAchievementText);
    
    // 2. Pick a random clean achievement
    const correctCleanAchievement = teamCleanAchievements[Math.floor(Math.random() * teamCleanAchievements.length)];
    
    // 3. Find distractors (clean achievements this team *doesn't* have)
    const achievementDistractors = getDistractors(
      uniqueCleanAchievements.filter(ach => !teamCleanAchievements.includes(ach)),
      correctCleanAchievement,
      2
    );
    
    // 4. Build the question
    if (achievementDistractors.length === 2) {
      const achievementOptions = shuffle([correctCleanAchievement, ...achievementDistractors]);
      questionPool.push({
        text: `Which of these did ${team.data.name} achieve?`,
        options: achievementOptions, // e.g., ["Won 2024 World Finals", "Won 2023 OWL Finals"]
        correctAnswerIndex: achievementOptions.indexOf(correctCleanAchievement),
      });
    }
  }
  }
  
  // --- FINAL STEP: Shuffle the entire pool and pick 5 ---
  return shuffle(questionPool).slice(0, 5);
}