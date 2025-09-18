const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcrypt');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const port = 2598;
const app = express();

// Middleware
app.use(express.static(__dirname));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session Setup
app.use(session({
  secret: 'travelbot_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'strict'
  }
}));

// MongoDB Connections
mongoose.connect('mongodb://127.0.0.1:27017/userinfo')
  .then(() => console.log(' Connected to MongoDB (userinfo)'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const travelConnection = mongoose.createConnection('mongodb://127.0.0.1:27017/traveldb');
travelConnection.once('open', () => console.log(' Connected to MongoDB (traveldb)'));
travelConnection.on('error', err => console.error('❌ travelDB connection error:', err));

// Schemas
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  pass: String
});
const Users = mongoose.model('data', userSchema);

const citySchema = new mongoose.Schema({
  city: String,
  hotspots: [
    {
      name: String,
      image: String,
      description: String,
      hotels: [String]
    }
  ]
});
const City = travelConnection.model('City', citySchema);

const bookingSchema = new mongoose.Schema({
  userEmail: String,
  type: String,
  details: Object,
  date: { type: Date, default: Date.now }
});
const Booking = mongoose.model('Booking', bookingSchema);

// HTML Routes
app.get(['/', '/login', '/signup'], (req, res) => {
  res.sendFile(path.join(__dirname, 'chatbot.html'));
});

// Session Checker
app.get('/session-status', (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

// Protect flight.html
app.get('/flight.html', (req, res, next) => {
  if (!req.session.user) {
    return res.send(`<script>alert("You must be logged in to access this page."); window.location.href='/login';</script>`);
  }
  next();
});

// Signup
app.post('/signup', async (req, res) => {
  const { name, email, pass, pass2 } = req.body;
  try {
    if (pass !== pass2) {
      return res.send(`<script>alert("Passwords do not match"); window.history.back();</script>`);
    }
    const existingUser = await Users.findOne({ email });
    if (existingUser) {
      return res.send(`<script>alert("Email is already registered"); window.history.back();</script>`);
    }
    const hashedPass = await bcrypt.hash(pass, 10);
    const user = new Users({ name, email, pass: hashedPass });
    await user.save();
    return res.send(`
      <script>
        alert("Signup successful!");
        window.location.href = "/chatbot.html?page=login";
      </script>
    `);
  } catch (err) {
    console.error(' Signup error:', err);
    return res.status(500).send(`<script>alert("Server error"); window.history.back();</script>`);
  }
});

// Login
app.post('/login', async (req, res) => {
  const { email, pass } = req.body;
  try {
    const user = await Users.findOne({ email });
    if (!user || !(await bcrypt.compare(pass, user.pass))) {
      return res.send(`<script>alert("Invalid email or password"); window.history.back();</script>`);
    }
    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email
    };
    return res.send(`
      <script>
        alert("Login successful!");
        window.location.href = "/flight.html";
      </script>
    `);
  } catch (err) {
    console.error(' Login error:', err);
    return res.status(500).send(`<script>alert("Server error"); window.history.back();</script>`);
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).send('Logout failed');
    res.redirect('/');
  });
});

// Cities
app.get('/cities', async (req, res) => {
  try {
    const cities = await City.find({});
    res.json(cities);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
});

app.get('/cities/search/:name', async (req, res) => {
  try {
    const cities = await City.find({ city: new RegExp(req.params.name, 'i') });
    res.json(cities);
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// Flight API
app.get("/testFlightAPI", async (req, res) => {
  const origin = "LAXA";
  const destination = "LOND";
  const date = "2024-07-10";
  const passengers = 1;

  const legs = encodeURIComponent(JSON.stringify([{ origin, destination, date }]));
  const url = `https://sky-scrapper.p.rapidapi.com/api/v1/flights/getFlightDetails?legs=${legs}&adults=${passengers}&currency=USD&locale=en-US&market=en-US&cabinClass=economy&countryCode=US`;

  const options = {
    method: 'GET',
    headers: {
      'x-rapidapi-key': 'e5c0805bbfmsh1cdce252418ab33p14bd81jsn453da6ab0de5',
      'x-rapidapi-host': 'sky-scrapper.p.rapidapi.com'
    }
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(" API fetch error:", err);
    res.status(500).json({ error: "API call failed", details: err.message });
  }
});

// Bookings
app.post('/book', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }

  const { type, details } = req.body;
  const email = req.session.user.email;

  try {
    const booking = new Booking({ userEmail: email, type, details });
    await booking.save();
    res.status(200).json({ message: 'Booking saved successfully' });
  } catch (err) {
    console.error('Booking save error:', err);
    res.status(500).json({ error: 'Failed to save booking' });
  }
});

app.get('/bookings', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }

  try {
    const bookings = await Booking.find({ userEmail: req.session.user.email });
    res.status(200).json(bookings);
  } catch (err) {
    console.error('Fetch bookings error:', err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

app.delete('/delete-booking/:id', async (req, res) => {
  if (!req.session.user || !req.session.user.email) {
    return res.status(401).json({ message: 'Unauthorized: Please login' });
  }

  const bookingId = req.params.id;

  try {
    const result = await Booking.deleteOne({
      _id: bookingId,
      userEmail: req.session.user.email
    });

    if (result.deletedCount === 1) {
      res.json({ message: 'Booking deleted successfully' });
    } else {
      res.status(404).json({ message: 'Booking not found or already deleted' });
    }
  } catch (err) {
    console.error("Error deleting booking:", err);
    res.status(500).json({ message: 'Server error' });
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).send('404 - Page Not Found');
});

// Start Server
app.listen(port, () => {
  console.log(` Server running at: http://localhost:${port}`);
});
