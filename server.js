const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const axios = require('axios');
const Transaction = require('./models/Transaction');
const Price = require('./models/Price'); 

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

// Function to fetch Ethereum price from CoinGecko
async function fetchEthereumPrice() {
    try {
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=inr');
        const ethPriceInINR = response.data.ethereum.inr;

        // Save the price to MongoDB
        const newPrice = new Price({
            currency: 'INR',
            price: ethPriceInINR,
        });

        await newPrice.save();
        console.log(`Ethereum price in INR: ${ethPriceInINR} saved to database.`);
    } catch (error) {
        console.error('Error fetching Ethereum price:', error);
    }
}

// Set an interval to fetch the price every 10 minutes
setInterval(fetchEthereumPrice, 10 * 60 * 1000); // 10 minutes in milliseconds

// Function to calculate expenses
app.get('/api/expenses', async (req, res) => {
    const { address } = req.query;
  
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }
  
    try {
      // Fetch transactions for the provided address
      const transactions = await Transaction.find({ address });
  
      if (transactions.length === 0) {
        return res.status(404).json({ error: 'No transactions found for this address' });
      }
  
      // Calculate total expenses (sum of value fields, assuming "value" is in Wei)
      const totalExpensesWei = transactions.reduce((acc, tx) => acc + BigInt(tx.value), BigInt(0));
      const totalExpensesEth = Number(totalExpensesWei) / 1e18; // Convert Wei to Ether
  
      // Fetch the latest Ethereum price in INR
      const latestPrice = await Price.findOne().sort({ timestamp: -1 });
  
      if (!latestPrice) {
        return res.status(404).json({ error: 'Ethereum price not found' });
      }
  
      // Calculate the total expenses in INR
      const totalExpensesInINR = totalExpensesEth * latestPrice.price;
  
      // Return the calculated expenses and current Ethereum price
      res.status(200).json({
        totalExpensesInEth: totalExpensesEth.toFixed(5),
        totalExpensesInINR: totalExpensesInINR.toFixed(2),
        ethPriceInINR: latestPrice.price,
      });
    } catch (error) {
      console.error('Error calculating expenses:', error);
      res.status(500).json({ error: 'Failed to calculate expenses' });
    }
  });
  

// Basic Route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Route to fetch all stored Ethereum prices
app.get('/api/prices', async (req, res) => {
    try {
      const prices = await Price.find().sort({ timestamp: -1 }); // Fetch all prices, sorted by the most recent
      res.status(200).json(prices);
    } catch (error) {
      console.error('Error fetching prices:', error);
      res.status(500).json({ error: 'Failed to fetch prices' });
    }
  });
  

// Start the Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
