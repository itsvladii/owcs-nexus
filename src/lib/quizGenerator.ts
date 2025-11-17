//funzione che "mischia" randomicamente le domande
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

//funzione che rimuove le emoji
function cleanAchievementText(text) {
  return text.replace(/^[🏆⭐🚀🛡️🥈🎯✚📈📊🔥⚖️🏅🤝]+\s*/, '');
}

// --- Main Generator Function (EXPORTED) ---
export function generateTeamQuiz(team, playersOnRoster, allPlayers, allTeams) {
  const questionPool = [];

  //DATI UTILIZZATI PER POPOLARE LE RISPOSTE
  const ALL_PLAYER_NAMES = allPlayers.map(p => p.data.name); //nomi giocatori
  const ALL_REGIONS = ['NA', 'EMEA', 'Korea', 'China','Pacific','Japan']; //regioni
  const ALL_ROLES = ['Tank', 'Flex DPS','Hitscan DPS', 'Main Support','Flex Support']; //ruoli
  const ALL_COUNTRIES = [...new Set(allPlayers.map(p => p.data.country).filter(Boolean))]; //paesi
  const ALL_TEAM_NAMES = allTeams.map(t => t.data.name); //nomi squadre
  const allRawAchievements = allTeams.flatMap(t => t.data.achievements || []); //risultati 
  const uniqueCleanAchievements = [...new Set(allRawAchievements.map(cleanAchievementText))]; //risultati "puliti" (senza emoji)
  const ALL_HERO_SLUGS = [
  'Ana', 'Ashe', 'Baptiste', 'Bastion', 'Brigitte', 'Cassidy', 'D.Va', 
  'Doomfist', 'Echo', 'Genji', 'Hanzo', 'Illari', 'Junker Queen', 'Junkrat', 
  'Kiriko', 'Lifeweaver', 'Lucio', 'Mauga', 'Mei', 'Mercy', 'Moira', 
  'Orisa', 'Pharah', 'Ramattra', 'Reaper', 'Reinhardt', 'Roadhog', 'Sigma', 
  'Sojourn', 'Soldier: 76', 'Sombra', 'Symmetra', 'Torbjörn', 'Tracer', 
  'Venture', 'Widowmaker', 'Winston', 'Wrecking Ball', 'Zarya', 'Zenyatta'
]; //tutti gli eroi

// --- CREAZIONE DOMANDE ---
  // --- Tipologia 1: Regione Squadra ---
  const correctRegion = team.data.region;
  const regionDistractors = getDistractors(ALL_REGIONS, correctRegion, 2);
  const regionOptions = shuffle([correctRegion, ...regionDistractors]);
  questionPool.push({
    text: `What region does ${team.data.name} play in?`,
    options: regionOptions,
    correctAnswerIndex: regionOptions.indexOf(correctRegion),
  });

  // ---Tipologia 2: Squadra del giocatore ---
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

  // --- Generazione per ogni giocatore della squadra---
  for (const player of playersOnRoster) {
    
    // --- Tipologia 3: Ruolo giocatore ---
    const correctRole = player.data.role;
    const roleDistractors = getDistractors(ALL_ROLES, correctRole, 2);
    const roleOptions = shuffle([correctRole, ...roleDistractors]);
    questionPool.push({
      text: `What is ${player.data.name}'s primary role?`,
      options: roleOptions,
      correctAnswerIndex: roleOptions.indexOf(correctRole),
    });

    // --- Tipologia 4: Paese giocatore ---
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
    
    // --- Tipoliga 5: Signature hero---
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

    // --- Tipologia 6: Dove il giocatore NON ha giocato" ---
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

    // --- Tipologia 7: Risultati squadra" ---
    if (team.data.achievements && team.data.achievements.length > 0) {
    //ricavo gli achievements del team
    const teamCleanAchievements = team.data.achievements.map(cleanAchievementText);
    
    // prendo quello corretto
    const correctCleanAchievement = teamCleanAchievements[Math.floor(Math.random() * teamCleanAchievements.length)];
    
    // prendo le risposte errate 
    const achievementDistractors = getDistractors(
      uniqueCleanAchievements.filter(ach => !teamCleanAchievements.includes(ach)),
      correctCleanAchievement,
      2
    );
    
    // costruisco la domanda
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
  
  // --- mischio le domande ---
  return shuffle(questionPool).slice(0, 5);
}