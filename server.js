const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const axios = require('axios');
const Transaction = require('./models/Transaction');

dotenv.config();

const app = express();

app.use(express.json());

// Serve static files
app.use(express.static('public'));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('Failed to connect to MongoDB', err);
});

// Route to Fetch and Store Transactions
app.post('/api/transactions', async (req, res) => {
  const { address } = req.body;

  if (!address) {
    return res.status(400).json({ error: 'Address is required' });
  }

  try {
    const response = await axios.get(`https://api.etherscan.io/api?module=account&action=txlist&address=${address}&sort=asc&apikey=${process.env.ETHERSCAN_API_KEY}`);

    const transactions = response.data.result;

    // Add the address to each transaction before saving
    transactions.forEach(tx => {
      tx.address = address;
    });

    // Save transactions to MongoDB
    await Transaction.insertMany(transactions);

    res.status(200).json({ message: 'Transactions fetched and stored successfully' });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Basic Route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Start the Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
