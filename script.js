document.getElementById('start-game').addEventListener('click', startGame);
document.getElementById('back-to-menu').addEventListener('click', backToMenu);

let playedSongs = new Set();
let currentSong = null;
let audio = new Audio();
let progressBarTimeout;
let snowEnabled = true;
let snowflakes = [];

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
    fetchSongs();
}

function backToMenu() {
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('main-screen').style.display = 'flex';
    audio.pause();
    clearTimeout(progressBarTimeout);
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
        playRandomSong(songs);
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
    audio.volume = 0.5;
    audio.play();

    startProgressBar();
    displayChoices(songs, randomSong);


    clearTimeout(progressBarTimeout);
    progressBarTimeout = setTimeout(() => {
        audio.pause();
        checkAnswer(null, currentSong);
    }, 10000);
}

function startProgressBar() {
    const progressBar = document.getElementById('progress-bar');
    progressBar.style.transition = 'none';
    progressBar.style.width = '100%';

    progressBar.offsetWidth;
    progressBar.style.transition = 'width 10s linear';
    progressBar.style.width = '0%';
}

function displayChoices(songs, correctSong) {
    const choicesDiv = document.getElementById('choices');
    choicesDiv.innerHTML = '';
    const choices = [correctSong, ...getRandomSongs(songs, 3)];
    choices.sort(() => Math.random() - 0.5);

    choices.forEach(choice => {
        const button = document.createElement('button');
        button.textContent = choice.title;
        button.addEventListener('click', () => checkAnswer(choice, correctSong));
        choicesDiv.appendChild(button);
    });
}

function getRandomSongs(songs, count) {
    const shuffled = songs.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

function checkAnswer(selectedSong, correctSong) {
    clearTimeout(progressBarTimeout);
    if (selectedSong === correctSong) {
        alert('Correct!');
    } else {
        alert('Wrong! The correct answer was ' + correctSong.title);
    }
    startGame();
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