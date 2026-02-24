const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// ---- SONG DATABASE ----
const SONGS = [
  { id:1,title:"Bohemian Rhapsody",artist:"Queen",year:1975,q:"Bohemian Rhapsody Queen" },
  { id:2,title:"Billie Jean",artist:"Michael Jackson",year:1982,q:"Billie Jean Michael Jackson" },
  { id:3,title:"Smells Like Teen Spirit",artist:"Nirvana",year:1991,q:"Smells Like Teen Spirit Nirvana" },
  { id:4,title:"Shape of You",artist:"Ed Sheeran",year:2017,q:"Shape of You Ed Sheeran" },
  { id:5,title:"Rolling in the Deep",artist:"Adele",year:2010,q:"Rolling in the Deep Adele" },
  { id:6,title:"Sweet Child O' Mine",artist:"Guns N' Roses",year:1987,q:"Sweet Child O Mine Guns N Roses" },
  { id:7,title:"Wonderwall",artist:"Oasis",year:1995,q:"Wonderwall Oasis" },
  { id:8,title:"Take On Me",artist:"a-ha",year:1985,q:"Take On Me a-ha" },
  { id:9,title:"Blinding Lights",artist:"The Weeknd",year:2019,q:"Blinding Lights Weeknd" },
  { id:10,title:"Stayin' Alive",artist:"Bee Gees",year:1977,q:"Stayin Alive Bee Gees" },
  { id:11,title:"Like a Virgin",artist:"Madonna",year:1984,q:"Like a Virgin Madonna" },
  { id:12,title:"Lose Yourself",artist:"Eminem",year:2002,q:"Lose Yourself Eminem" },
  { id:13,title:"Crazy in Love",artist:"Beyoncé",year:2003,q:"Crazy in Love Beyonce" },
  { id:14,title:"Mr. Brightside",artist:"The Killers",year:2003,q:"Mr Brightside Killers" },
  { id:15,title:"Don't Stop Believin'",artist:"Journey",year:1981,q:"Dont Stop Believin Journey" },
  { id:16,title:"Thriller",artist:"Michael Jackson",year:1982,q:"Thriller Michael Jackson" },
  { id:17,title:"Hotel California",artist:"Eagles",year:1976,q:"Hotel California Eagles" },
  { id:18,title:"I Will Always Love You",artist:"Whitney Houston",year:1992,q:"I Will Always Love You Whitney Houston" },
  { id:19,title:"Uptown Funk",artist:"Bruno Mars",year:2014,q:"Uptown Funk Bruno Mars" },
  { id:20,title:"Somebody That I Used to Know",artist:"Gotye",year:2011,q:"Somebody That I Used to Know Gotye" },
  { id:21,title:"Hey Jude",artist:"The Beatles",year:1968,q:"Hey Jude Beatles" },
  { id:22,title:"Superstition",artist:"Stevie Wonder",year:1972,q:"Superstition Stevie Wonder" },
  { id:23,title:"Dancing Queen",artist:"ABBA",year:1976,q:"Dancing Queen ABBA" },
  { id:24,title:"Under Pressure",artist:"Queen & David Bowie",year:1981,q:"Under Pressure Queen Bowie" },
  { id:25,title:"Every Breath You Take",artist:"The Police",year:1983,q:"Every Breath You Take Police" },
  { id:26,title:"With or Without You",artist:"U2",year:1987,q:"With or Without You U2" },
  { id:27,title:"Creep",artist:"Radiohead",year:1992,q:"Creep Radiohead" },
  { id:28,title:"Gangsta's Paradise",artist:"Coolio",year:1995,q:"Gangsta Paradise Coolio" },
  { id:29,title:"Say My Name",artist:"Destiny's Child",year:1999,q:"Say My Name Destinys Child" },
  { id:30,title:"In Da Club",artist:"50 Cent",year:2003,q:"In Da Club 50 Cent" },
  { id:31,title:"Toxic",artist:"Britney Spears",year:2003,q:"Toxic Britney Spears" },
  { id:32,title:"Umbrella",artist:"Rihanna",year:2007,q:"Umbrella Rihanna" },
  { id:33,title:"Poker Face",artist:"Lady Gaga",year:2008,q:"Poker Face Lady Gaga" },
  { id:34,title:"Get Lucky",artist:"Daft Punk",year:2013,q:"Get Lucky Daft Punk" },
  { id:35,title:"Old Town Road",artist:"Lil Nas X",year:2019,q:"Old Town Road Lil Nas X" },
  { id:36,title:"As It Was",artist:"Harry Styles",year:2022,q:"As It Was Harry Styles" },
  { id:37,title:"Respect",artist:"Aretha Franklin",year:1967,q:"Respect Aretha Franklin" },
  { id:38,title:"Imagine",artist:"John Lennon",year:1971,q:"Imagine John Lennon" },
  { id:39,title:"Stairway to Heaven",artist:"Led Zeppelin",year:1971,q:"Stairway to Heaven Led Zeppelin" },
  { id:40,title:"Rapper's Delight",artist:"Sugarhill Gang",year:1979,q:"Rappers Delight Sugarhill Gang" },
];

function shuffle(arr) {
  const s = [...arr];
  for (let i = s.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [s[i], s[j]] = [s[j], s[i]];
  }
  return s;
}

function genCode() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let r = "";
  for (let i = 0; i < 5; i++) r += c[Math.floor(Math.random() * c.length)];
  return r;
}

// ---- DEEZER PROXY ENDPOINT ----
app.get("/deezer", async (req, res) => {
  const q = req.query.q;
  if (!q) return res.json({ error: "No query" });
  try {
    const resp = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=1`);
    const data = await resp.json();
    res.json(data);
  } catch (e) {
    res.json({ error: "Deezer request failed" });
  }
});

// Health check
app.get("/", (req, res) => {
  res.json({ status: "Hitster server running", rooms: Object.keys(rooms).length });
});

// ---- GAME STATE ----
const rooms = {}; // { code: { host, rounds, players[], songs[], currentRound, guesses{}, state, timer } }

function broadcastRoom(code) {
  const room = rooms[code];
  if (!room) return;
  const playerList = room.players.map((p) => ({
    id: p.id,
    name: p.name,
    isLeader: p.id === room.host,
    score: p.score,
  }));
  io.to(code).emit("room:update", { players: playerList, rounds: room.rounds, code });
}

function broadcastGameState(code) {
  const room = rooms[code];
  if (!room) return;
  const song = room.songs[room.currentRound - 1];
  const guessCount = Object.keys(room.guesses).length;
  const playerCount = room.players.length;

  io.to(code).emit("game:state", {
    round: room.currentRound,
    totalRounds: room.rounds,
    songQuery: song.q,
    state: room.state, // "loading", "playing", "reveal", "results"
    guessCount,
    playerCount,
    secondsLeft: room.secondsLeft,
  });
}

function startRoundTimer(code) {
  const room = rooms[code];
  if (!room) return;
  room.secondsLeft = 30;
  room.state = "playing";

  broadcastGameState(code);

  if (room.timer) clearInterval(room.timer);
  room.timer = setInterval(() => {
    room.secondsLeft--;
    io.to(code).emit("game:tick", { secondsLeft: room.secondsLeft });

    if (room.secondsLeft <= 0) {
      clearInterval(room.timer);
      room.timer = null;
      endRound(code);
    }
  }, 1000);
}

function endRound(code) {
  const room = rooms[code];
  if (!room || room.state === "results") return;

  if (room.timer) {
    clearInterval(room.timer);
    room.timer = null;
  }

  room.state = "results";
  const song = room.songs[room.currentRound - 1];

  // Calculate results
  const results = room.players.map((p) => {
    const guess = room.guesses[p.id] || null;
    return { playerId: p.id, name: p.name, guess };
  });

  // Sort by distance (null = worst)
  const withGuess = results.filter((r) => r.guess !== null);
  const noGuess = results.filter((r) => r.guess === null);
  withGuess.sort((a, b) => Math.abs(a.guess - song.year) - Math.abs(b.guess - song.year));

  const total = room.players.length;
  const scored = [
    ...withGuess.map((r, i) => ({ ...r, points: Math.max(1, total - i) })),
    ...noGuess.map((r) => ({ ...r, points: 0 })),
  ];

  // Update scores
  scored.forEach((r) => {
    const player = room.players.find((p) => p.id === r.playerId);
    if (player) player.score += r.points;
  });

  io.to(code).emit("round:results", {
    song: { title: song.title, artist: song.artist, year: song.year },
    results: scored,
    round: room.currentRound,
    totalRounds: room.rounds,
    players: room.players.map((p) => ({ id: p.id, name: p.name, score: p.score, isLeader: p.id === room.host })),
  });
}

// ---- SOCKET EVENTS ----
io.on("connection", (socket) => {
  console.log("Connected:", socket.id);
  let currentRoom = null;
  let playerName = null;

  // CREATE ROOM
  socket.on("room:create", ({ name, rounds }) => {
    const code = genCode();
    const songs = shuffle(SONGS).slice(0, Math.min(rounds, SONGS.length));
    rooms[code] = {
      host: socket.id,
      rounds,
      players: [{ id: socket.id, name, score: 0 }],
      songs,
      currentRound: 0,
      guesses: {},
      state: "lobby",
      timer: null,
      secondsLeft: 30,
    };
    currentRoom = code;
    playerName = name;
    socket.join(code);
    socket.emit("room:created", { code });
    broadcastRoom(code);
    console.log(`Room ${code} created by ${name}`);
  });

  // JOIN ROOM
  socket.on("room:join", ({ name, code }) => {
    const room = rooms[code];
    if (!room) {
      socket.emit("error", { message: "Raum nicht gefunden" });
      return;
    }
    if (room.state !== "lobby") {
      socket.emit("error", { message: "Spiel läuft bereits" });
      return;
    }
    if (room.players.find((p) => p.name === name)) {
      socket.emit("error", { message: "Name bereits vergeben" });
      return;
    }

    room.players.push({ id: socket.id, name, score: 0 });
    currentRoom = code;
    playerName = name;
    socket.join(code);
    socket.emit("room:joined", { code });
    broadcastRoom(code);
    console.log(`${name} joined room ${code}`);
  });

  // START GAME
  socket.on("game:start", () => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const room = rooms[currentRoom];
    if (room.host !== socket.id) return;
    if (room.players.length < 2) return;

    room.currentRound = 1;
    room.guesses = {};
    room.state = "loading";

    const song = room.songs[0];
    io.to(currentRoom).emit("game:start", {
      round: 1,
      totalRounds: room.rounds,
      songQuery: song.q,
    });
    console.log(`Game started in room ${currentRoom}`);
  });

  // HOST SIGNALS AUDIO IS READY -> START TIMER
  socket.on("game:audioReady", () => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const room = rooms[currentRoom];
    if (room.host !== socket.id) return;
    startRoundTimer(currentRoom);
  });

  // SUBMIT GUESS
  socket.on("game:guess", ({ year }) => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const room = rooms[currentRoom];
    if (room.state !== "playing") return;
    if (room.guesses[socket.id] !== undefined) return; // already guessed

    room.guesses[socket.id] = year;

    // Notify everyone about guess count
    io.to(currentRoom).emit("game:guessCount", {
      guessCount: Object.keys(room.guesses).length,
      playerCount: room.players.length,
    });

    // If all players guessed, end round early
    if (Object.keys(room.guesses).length >= room.players.length) {
      endRound(currentRoom);
    }
  });

  // SKIP (host only)
  socket.on("game:skip", () => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const room = rooms[currentRoom];
    if (room.host !== socket.id) return;
    endRound(currentRoom);
  });

  // NEXT ROUND (host only)
  socket.on("game:next", () => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const room = rooms[currentRoom];
    if (room.host !== socket.id) return;

    const nextRound = room.currentRound + 1;
    if (nextRound > room.rounds || nextRound > room.songs.length) {
      // Game over
      io.to(currentRoom).emit("game:final", {
        players: room.players.map((p) => ({ id: p.id, name: p.name, score: p.score, isLeader: p.id === room.host })),
      });
      room.state = "final";
      return;
    }

    room.currentRound = nextRound;
    room.guesses = {};
    room.state = "loading";

    const song = room.songs[nextRound - 1];
    io.to(currentRoom).emit("game:start", {
      round: nextRound,
      totalRounds: room.rounds,
      songQuery: song.q,
    });
  });

  // PLAY AGAIN
  socket.on("game:restart", () => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const room = rooms[currentRoom];
    if (room.host !== socket.id) return;

    room.songs = shuffle(SONGS).slice(0, Math.min(room.rounds, SONGS.length));
    room.currentRound = 0;
    room.guesses = {};
    room.state = "lobby";
    room.players.forEach((p) => (p.score = 0));

    io.to(currentRoom).emit("game:backToLobby");
    broadcastRoom(currentRoom);
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
    if (!currentRoom || !rooms[currentRoom]) return;
    const room = rooms[currentRoom];
    room.players = room.players.filter((p) => p.id !== socket.id);

    if (room.players.length === 0) {
      // Room empty, clean up
      if (room.timer) clearInterval(room.timer);
      delete rooms[currentRoom];
      console.log(`Room ${currentRoom} deleted (empty)`);
    } else {
      // If host left, assign new host
      if (room.host === socket.id) {
        room.host = room.players[0].id;
        console.log(`New host in ${currentRoom}: ${room.players[0].name}`);
      }
      broadcastRoom(currentRoom);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Hitster server running on port ${PORT}`);
});
