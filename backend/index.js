const express = require('express');
const fs = require('fs');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const port = 5000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

const dataFile = './toilets.json';

function loadToilets() {
  if (!fs.existsSync(dataFile)) return [];
  const data = fs.readFileSync(dataFile);
  return JSON.parse(data);
}

function saveToilets(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

app.get('/api/toilets', (req, res) => {
  res.json(loadToilets());
});

app.post('/api/toilets', (req, res) => {
  const { name, description, lat, lng } = req.body;
  const toilets = loadToilets();
  const newToilet = {
    id: Date.now(),
    name,
    description,
    lat,
    lng,
    ratings: [],
    comments: [],
    reports: [],
    votes: 0
  };
  toilets.push(newToilet);
  saveToilets(toilets);
  res.json(newToilet);
});

app.delete('/api/toilets/:id', (req, res) => {
  const id = parseInt(req.params.id);
  let toilets = loadToilets();
  toilets = toilets.filter(t => t.id !== id);
  saveToilets(toilets);
  res.json({ success: true });
});

app.get('/api/toilets/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const toilets = loadToilets();
  const toilet = toilets.find(t => t.id === id);
  if (!toilet) return res.status(404).json({ message: 'Not found' });
  res.json(toilet);
});

app.post('/api/toilets/:id/rate', (req, res) => {
  const id = parseInt(req.params.id);
  const { rating } = req.body;

  const toilets = loadToilets();
  const toilet = toilets.find(t => t.id === id);
  if (!toilet) return res.status(404).json({ message: 'Not found' });

  if (!Array.isArray(toilet.ratings)) {
    toilet.ratings = [];
  }

  toilet.ratings.unshift(rating); // latest rating shown first
  saveToilets(toilets);

  io.emit('ratingUpdated', toilet); // Send full updated toilet
  res.json(toilet);
});

app.post('/api/toilets/:id/comment', (req, res) => {
  const id = parseInt(req.params.id);
  const { comment } = req.body;

  const toilets = loadToilets();
  const toilet = toilets.find(t => t.id === id);
  if (!toilet) return res.status(404).json({ message: 'Not found' });

  if (!Array.isArray(toilet.comments)) {
    toilet.comments = [];
  }

  toilet.comments.push(comment);
  saveToilets(toilets);
  res.json(toilet);
});

app.post('/api/toilets/:id/report', (req, res) => {
  const id = parseInt(req.params.id);
  const { issue } = req.body;

  const toilets = loadToilets();
  const toilet = toilets.find(t => t.id === id);
  if (!toilet) return res.status(404).json({ message: 'Not found' });

  if (!Array.isArray(toilet.reports)) {
    toilet.reports = [];
  }

  toilet.reports.push(issue);
  saveToilets(toilets);
  res.json(toilet);
});

app.post('/api/toilets/:id/vote', (req, res) => {
  const id = parseInt(req.params.id);

  const toilets = loadToilets();
  const toilet = toilets.find(t => t.id === id);
  if (!toilet) return res.status(404).json({ message: 'Not found' });

  if (typeof toilet.votes !== 'number') {
    toilet.votes = 0;
  }

  toilet.votes++;
  saveToilets(toilets);
  res.json(toilet);
});

server.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
