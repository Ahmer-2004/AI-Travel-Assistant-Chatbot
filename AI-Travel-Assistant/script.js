const express = require('express');
const path = require('path');
const mongoose = require('mongoose');

const port = 2598;
const app = express();

// Middleware
app.use(express.static(__dirname));
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/userinfo');
const db = mongoose.connection;
db.once('open', () => console.log(' Connected to MongoDB'));

// Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: {
    type: String,
    unique: true
  },
  pass: String
});
const Users = mongoose.model('data', userSchema);

// Serve chatbot.html
app.get(['/', '/login', '/signup'], (req, res) => {
  res.sendFile(path.join(__dirname, 'chatbot.html'));
});

// Handle signup form
app.post('/signup', async (req, res) => {
  const { name, email, pass, pass2 } = req.body;

  try {
    if (pass !== pass2) {
      return res.send(`<script>alert(" Passwords do not match"); window.history.back();</script>`);
    }

    const existingUser = await Users.findOne({ email });
    if (existingUser) {
      return res.send(`<script>alert(" Email is already registered"); window.history.back();</script>`);
    }

    const user = new Users({ name, email, pass });
    await user.save();
    console.log(' User saved:', user);

    return res.send(`<script>alert(" Signup successful!"); window.location.href='/login';</script>`);
  } catch (err) {
    console.error(' Error during signup:', err);
    return res.status(500).send(`<script>alert(" Server error"); window.history.back();</script>`);
  }
});

// Handle login form
app.post('/login', async (req, res) => {
  const { email, pass } = req.body;

  try {
    const user = await Users.findOne({ email });

    if (!user || user.pass !== pass) {
      return res.send(`<script>alert(" Invalid email or password"); window.history.back();</script>`);
    }

    return res.send(`<script>alert(" Login successful!"); window.location.href='/';</script>`);
  } catch (err) {
    console.error(' Error during login:', err);
    return res.status(500).send(`<script>alert(" Server error"); window.history.back();</script>`);
  }
});

app.listen(port, () => {
  console.log(` Server running at: http://localhost:${port}`);
});


// mapboxgl.accessToken = 'sk.eyJ1IjoiYWhtZXIxMSIsImEiOiJjbWJtMjR0eHAxNWF6MmlxeHVuamRzYXphIn0.ie0J78gO50HPeru0ToMYLg';

  document.getElementById("searchForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const origin = document.getElementById("departureCity").value;
    const destination = document.getElementById("arrivalCity").value;
    const date = document.getElementById("departureDate").value;
    const passengers = document.getElementById("passengers").value;

    const searchResults = document.getElementById("searchResults");
    searchResults.innerHTML = "<p>Searching for flights...</p>";

    try {
        const res = await fetch("/searchFlights", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ origin, destination, date, passengers }),
        });

        const data = await res.json();
        if (data.error) {
            searchResults.innerHTML = `<p class="text-danger">${data.error}</p>`;
        } else {
            const flightsHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
            searchResults.innerHTML = flightsHTML;
        }
    } catch (err) {
        searchResults.innerHTML = `<p class="text-danger">Error: ${err.message}</p>`;
    }


      }

    

);