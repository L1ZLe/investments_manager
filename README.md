# Project Name: Cryptocurrency Trend Detector and Trader

## Description

This project detects trends in cryptocurrency prices and makes automated trading decisions based on the detected trends. It fetches data from CoinAPI and interacts with the Binance API for trading (or the other brokers supported by CoinAPI && ccxt).

## How It Works

The project follows these steps:

1. **Data Fetching**: It fetches historical price data for cryptocurrencies from CoinAPI using REST API requests.

2. **Trend Detection**: Based on the fetched data, the project detects whether the current trend in the cryptocurrency's price is an uptrend or a downtrend.

3. **Trading Decision**:

   - If the trend shifts from an uptrend to a downtrend, it sells the cryptocurrency.
   - If the trend shifts from a downtrend to an uptrend, it buys the cryptocurrency.

4. **Trading Execution**: The project interacts with the Binance API to execute trading orders.

## Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install axios ccxt dotenv
   ```
3. Set up environment variables by creating a `.env` file and adding the following:
   ```
   BINANCE_ApiKey=your_binance_api_key
   BINANCE_SecretKey=your_binance_secret_key
   CoinAPI_Key=your_coinapi_key
   ```
4. Run the script:
   ```bash
   node index.js
   ```

### Requirements

- Node.js
- npm
- Binance API key and secret key
- CoinAPI key

## Usage

The script fetches cryptocurrency data, detects trends, and makes trading decisions accordingly.

## Support

For help or questions, please open an issue on GitHub.

## Roadmap

- Implement combining trends from different timeframes.
- Enhance buying and selling strategies.
- Implement buying and selling at the Break of Structure (BOS) using limit orders.

## Contributing

Contributions are welcome. Please follow the guidelines outlined in the repository.
