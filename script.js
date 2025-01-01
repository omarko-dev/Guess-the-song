// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAiIrOvbuXw_eFo3H9l7s4QULqrPSqOPFU",
    authDomain: "guess-the-song-dd37a.firebaseapp.com",
    databaseURL: "https://guess-the-song-dd37a-default-rtdb.firebaseio.com",
    projectId: "guess-the-song-dd37a",
    storageBucket: "guess-the-song-dd37a.appspot.com",
    messagingSenderId: "672368690487",
    appId: "1:672368690487:web:367ad06d5acebb73d2c6b2",
    measurementId: "G-4KRYL8QZ15"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let playerName = localStorage.getItem('playerName') || '';

// Save score to leaderboard
function saveScore(username, score) {
    const leaderboardRef = database.ref('leaderboard');
    leaderboardRef.orderByChild('username').equalTo(username).once('value', snapshot => {
        if (snapshot.exists()) {
            const userData = snapshot.val();
            const userKey = Object.keys(userData)[0];
            const userScore = userData[userKey].score;
            if (score > userScore) {
                leaderboardRef.child(userKey).update({ score: score });
            }
        } else {
            const newScoreRef = leaderboardRef.push();
            newScoreRef.set({
                username: username,
                score: score
            });
        }
    });
}

// Retrieve leaderboard data
function getLeaderboard(callback) {
    const leaderboardRef = database.ref('leaderboard').orderByChild('score').limitToLast(10);
    leaderboardRef.once('value', snapshot => {
        const leaderboard = [];
        snapshot.forEach(childSnapshot => {
            leaderboard.push(childSnapshot.val());
        });
        callback(leaderboard.reverse());
    });
}

document.getElementById('start-game').addEventListener('click', startGame);
document.getElementById('back-to-menu').addEventListener('click', backToMenu);
document.getElementById('restart-game').addEventListener('click', restartGame);
document.getElementById('volume-slider').addEventListener('input', updateVolume);
document.getElementById('pause-button').addEventListener('click', togglePause);
document.getElementById('resume-button').addEventListener('click', togglePause);
document.getElementById('leaderboard-button').addEventListener('click', () => {
    getLeaderboard(leaderboard => {
        const leaderboardList = document.getElementById('leaderboard-list');
        leaderboardList.innerHTML = '';
        leaderboard.forEach((entry, index) => {
            const listItem = document.createElement('li');
            let medal = '';
            if (index === 0) {
                medal = '🥇'; // Gold medal
            } else if (index === 1) {
                medal = '🥈'; // Silver medal
            } else if (index === 2) {
                medal = '🥉'; // Bronze medal
            }
            listItem.textContent = `${index + 1}. ${medal} ${entry.username}: ${entry.score}`;
            leaderboardList.appendChild(listItem);
        });
        document.getElementById('leaderboard-modal').style.display = 'block';
    });
});
document.getElementById('leaderboard-close-button').addEventListener('click', () => {
    document.getElementById('leaderboard-modal').style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === document.getElementById('leaderboard-modal')) {
        document.getElementById('leaderboard-modal').style.display = 'none';
    }
});

let playedSongs = new Set();
let currentSong = null;
let audio = new Audio();
let progressBarTimeout;
let snowEnabled = true;
let snowflakes = [];
let streak = 0;
let isPaused = false;
let remainingTime = 10000;
let pauseStartTime;
let progressBarWidth;

window.onload = function() {
    const modal = document.getElementById('notice-modal');
    const closeButton = document.querySelector('.close-button');

    closeButton.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    initSnow();
    animateSnow();
};

function startGame() {
    document.getElementById('main-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'flex';
    document.getElementById('restart-game').style.display = 'none';
    document.getElementById('game-over-message').style.display = 'none';
    fetchSongs();
}

function backToMenu() {
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('main-screen').style.display = 'flex';
    audio.pause();
    clearTimeout(progressBarTimeout);
}

function restartGame() {
    streak = 0;
    updateStreakCounter();
    startGame();
}

async function fetchSongs() {
    try {
        const response = await fetch('https://cors-anywhere.herokuapp.com/https://api.deezer.com/chart');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        const songs = data.tracks.data.map(track => ({
            title: track.title,
            url: track.preview
        }));
        const additionalResponse = await fetch('https://cors-anywhere.herokuapp.com/https://api.deezer.com/editorial/0/charts');
        if (!additionalResponse.ok) {
            throw new Error('Network response was not ok');
        }
        const additionalData = await additionalResponse.json();
        const additionalSongs = additionalData.tracks.data.map(track => ({
            title: track.title,
            url: track.preview
        }));
        const allSongs = [...songs, ...additionalSongs];
        playRandomSong(allSongs);
    } catch (error) {
        displayErrorMessage();
        console.error('Error fetching songs:', error);
    }
}

function playRandomSong(songs) {
    let randomSong;
    do {
        randomSong = songs[Math.floor(Math.random() * songs.length)];
    } while (playedSongs.has(randomSong.title) && playedSongs.size < songs.length);

    playedSongs.add(randomSong.title);
    currentSong = randomSong;

    audio.src = currentSong.url;
    audio.currentTime = 0;
    audio.volume = document.getElementById('volume-slider').value;
    audio.play();

    clearTimeout(progressBarTimeout);
    remainingTime = 10000; // Reset remaining time to 10 seconds
    startProgressBar();
    displayChoices(songs, randomSong);

    progressBarTimeout = setTimeout(() => {
        audio.pause();
        checkAnswer(null, currentSong);
    }, remainingTime);
}

function startProgressBar() {
    const progressBar = document.getElementById('progress-bar');
    progressBar.style.transition = 'none';
    progressBar.style.width = '100%';

    progressBar.offsetWidth;
    progressBar.style.transition = `width ${remainingTime / 1000}s linear`;
    progressBar.style.width = '0%';
}

function displayChoices(songs, correctSong) {
    const choicesDiv = document.getElementById('choices');
    choicesDiv.innerHTML = '';
    const choices = [correctSong, ...getRandomSongs(songs, 3)];
    const uniqueChoices = Array.from(new Set(choices.map(choice => choice.title)))
        .map(title => choices.find(choice => choice.title === title));

    // If we have less than 4 unique choices, add more random unique songs
    while (uniqueChoices.length < 4) {
        const additionalChoices = getRandomSongs(songs, 1);
        if (!uniqueChoices.some(choice => choice.title === additionalChoices[0].title)) {
            uniqueChoices.push(additionalChoices[0]);
        }
    }

    uniqueChoices.sort(() => Math.random() - 0.5);

    uniqueChoices.forEach(choice => {
        const button = document.createElement('button');
        button.textContent = choice.title;
        button.addEventListener('click', () => checkAnswer(choice, correctSong));
        choicesDiv.appendChild(button);
    });
}

function getRandomSongs(songs, count) {
    const shuffled = songs.filter(song => song.title !== currentSong.title).sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

function checkAnswer(selectedSong, correctSong) {
    clearTimeout(progressBarTimeout);
    if (selectedSong === correctSong) {
        streak++;
        updateStreakCounter();
        playCorrectSound();
        startEmojiRain();
        setTimeout(() => {
            stopEmojiRain();
            startGame();
        }, 3000);
    } else {
        displayGameOverMessage(correctSong.title);
    }
}

function updateStreakCounter() {
    const streakCounter = document.getElementById('streak-counter');
    streakCounter.textContent = 'Streak: ' + streak;
}

function displayGameOverMessage(correctAnswer) {
    const gameOverMessage = document.getElementById('game-over-message');
    const correctAnswerSpan = document.getElementById('correct-answer');
    correctAnswerSpan.textContent = correctAnswer;
    gameOverMessage.style.display = 'block';
    document.getElementById('restart-game').style.display = 'block';

    if (playerName) {
        saveScore(playerName, streak);
    } else {
        document.getElementById('name-input-container').style.display = 'block';
        document.getElementById('submit-name').addEventListener('click', () => {
            const username = document.getElementById('username-input').value;
            if (username) {
                playerName = username;
                localStorage.setItem('playerName', playerName);
                saveScore(playerName, streak);
                document.getElementById('name-input-container').style.display = 'none';
                document.getElementById('game-over-message').style.display = 'none';
                document.getElementById('restart-game').style.display = 'block';
            }
        });
    }
}

function displayErrorMessage() {
    const choicesDiv = document.getElementById('choices');
    choicesDiv.innerHTML = '<p>Please <a href="https://cors-anywhere.herokuapp.com/corsdemo" target="_blank">request temporary access</a> to the CORS Anywhere demo server and refresh the page.</p>';
}

function initSnow() {
    const canvas = document.getElementById('snow-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    for (let i = 0; i < 100; i++) {
        snowflakes.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 4 + 1,
            speed: Math.random() * 1 + 0.5
        });
    }
}

function animateSnow() {
    const canvas = document.getElementById('snow-canvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (snowEnabled) {
        snowflakes.forEach(snowflake => {
            snowflake.y += snowflake.speed;
            if (snowflake.y > canvas.height) {
                snowflake.y = 0;
                snowflake.x = Math.random() * canvas.width;
            }
            ctx.beginPath();
            ctx.arc(snowflake.x, snowflake.y, snowflake.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
        });
    }

    requestAnimationFrame(animateSnow);
}

function startEmojiRain() {
    const emojiRain = document.getElementById('emoji-rain');
    emojiRain.style.display = 'block';
    const emojis = ['🎄', '🎅', '❄️', '⛄', '🎁'];
    for (let i = 0; i < 50; i++) {
        const emoji = document.createElement('div');
        emoji.classList.add('emoji');
        emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        emoji.style.left = Math.random() * 100 + 'vw';
        emoji.style.animationDuration = Math.random() * 2 + 3 + 's';
        emojiRain.appendChild(emoji);
    }
}

function stopEmojiRain() {
    const emojiRain = document.getElementById('emoji-rain');
    emojiRain.style.display = 'none';
    emojiRain.innerHTML = '';
}

function playCorrectSound() {
    const correctSound = document.getElementById('correct-sound');
    correctSound.volume = document.getElementById('volume-slider').value;
    correctSound.play();
}

function updateVolume() {
    const volume = document.getElementById('volume-slider').value;
    audio.volume = volume;
    const correctSound = document.getElementById('correct-sound');
    correctSound.volume = volume;
    document.getElementById('volume-label').textContent = Math.round(volume * 100);
}

function togglePause() {
    const pauseOverlay = document.getElementById('pause-overlay');
    const progressBar = document.getElementById('progress-bar');
    if (isPaused) {
        pauseOverlay.style.display = 'none';
        const pauseEndTime = Date.now();
        remainingTime -= pauseEndTime - pauseStartTime;
        audio.play();
        progressBar.style.transition = 'none';
        progressBar.offsetWidth; // Trigger reflow
        progressBar.style.transition = `width ${remainingTime / 1000}s linear`;
        progressBar.style.width = '0%';
        progressBarTimeout = setTimeout(() => {
            audio.pause();
            checkAnswer(null, currentSong);
        }, remainingTime);
        isPaused = false;
    } else {
        pauseOverlay.style.display = 'flex';
        audio.pause();
        clearTimeout(progressBarTimeout);
        const computedStyle = window.getComputedStyle(progressBar);
        progressBarWidth = parseFloat(computedStyle.getPropertyValue('width')) / progressBar.parentElement.clientWidth * 100;
        progressBar.style.transition = 'none';
        progressBar.style.width = `${progressBarWidth}%`;
        pauseStartTime = Date.now();
        isPaused = true;
    }
}
