import axios from "axios"
import fs from "fs"
import ccxt from "ccxt"
import "dotenv/config"
import nodemailer from "nodemailer"

////////////////////////////////////////////// MAIL CONFIGURATION //////////////////////////////////////////////

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
  },
})

////////////////////////////////////////////// DEFINITION OF BROKERS //////////////////////////////////////////////
const BINANCE = new ccxt.binance({
  apiKey: process.env.BINANCE_ApiKey,
  secret: process.env.BINANCE_SecretKey,
})

const GATEIO = new ccxt.gateio({
  apiKey: process.env.GATEIO_ApiKey,
  secret: process.env.GATEIO_SecretKey,
  options: {
    createMarketBuyOrderRequiresPrice: false,
  },
})
const MEXC = new ccxt.mexc({
  apiKey: process.env.MEXC_ApiKey,
  secret: process.env.MEXC_SecretKey,
})
////////////////////////////////////////////// FETCHING DATA USING COINAPI //////////////////////////////////////////////
async function fetchOHLCV(
  symbolId,
  periodId,
  timeStart,
  timeEnd,
  limit = 100,
  includeEmptyItems = false
) {
  try {
    const config = {
      method: "get",
      maxBodyLength: Infinity,
      url: `https://rest.coinapi.io/v1/ohlcv/${symbolId}/history`,
      headers: {
        Accept: "application/json",
        "X-CoinAPI-Key": process.env.CoinAPI_Key,
      },
      params: {
        period_id: periodId,
        time_start: timeStart,
        time_end: timeEnd,
        limit: limit,
        include_empty_items: includeEmptyItems,
      },
    }

    const response = await axios(config)

    fs.writeFileSync("data.json", JSON.stringify(response.data), () =>
      console.log(
        `Fetched ${symbolId} data from CoinAPI and saved to data.json`
      )
    )
    return response.data
  } catch (error) {
    console.error("Error fetching crypto OHLC data:", error)
    return null
  }
}
////////////////////////////////////////////// UPTREND || DOWNTREND DETECTION //////////////////////////////////////////////
async function detectTrend(data, extrems_date, trend, close_readfiles) {
  try {
    const latestClose = data[data.length - 1].price_close // this is the latest close price there is no data.length
    if (trend && latestClose < close_readfiles) {
      trend = false
      data = data.filter((d) => d.time_period_start >= extrems_date)
    }

    if (!trend && latestClose > close_readfiles) {
      trend = true
      data = data.filter((d) => d.time_period_start >= extrems_date)
    }

    console.log(`The Final trend is : ${trend}`)

    return { newTrend: trend, data } // WHAT THIS DOES IS RETURN THE DATA AND THE TREND AS NEWTREND
  } catch (error) {
    console.log(error)
  }
}
////////////////////////////////////////////// READING FILES && CREATING NEW OBJECT IF IT DOES NOT EXIST //////////////////////////////////////////////
async function readJson(trend, ticker) {
  const filePath = "hlc.json"
  let high, low, close
  try {
    const content = await fs.promises.readFile(filePath, "utf-8")
    const tickers = JSON.parse(content)
    const foundTicker = tickers.find((t) => t.ticker === ticker)
    if (!foundTicker) {
      if (trend) {
        high = -Infinity
        close = -Infinity
        low = Infinity
      } else {
        high = -Infinity
        close = Infinity
        low = Infinity
      }

      return { high, low, close }
    }

    high = foundTicker.high
    low = foundTicker.low
    close = foundTicker.close
    return { high, low, close }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error)
  }
}
////////////////////////////////////////////// GETTING CLOSE + (HIGH || LOW) //////////////////////////////////////////////
async function getLatestHighAndLow(
  data,
  start_date,
  extrems_date,
  initialTrend,
  newTrend,
  high,
  low,
  close
) {
  try {
    let i = 1
    let temp

    if (initialTrend && !newTrend) {
      // if the trend shifted then we need to reset the variables
      low = Infinity
      close = Infinity
      high = null
      start_date = extrems_date // this will assign the extreme date to the start date
    }
    if (!initialTrend && newTrend) {
      high = -Infinity
      close = -Infinity
      low = null
      start_date = extrems_date // this will assign the extreme date to the start date
    }

    // if the trend is up
    if (newTrend) {
      //finding the high starting from the current price leg we are at
      for (i; i < data.length; i++) {
        // find the highest point in the current leg
        if (high <= data[i]?.price_high) {
          high = data[i]?.price_high
          extrems_date = data[i - 1]?.time_period_start
          temp = i - 1 // this will makes it start from the previous day (if temp = i -1 ) or from today (if temp = i)
        }
      }
      //finding the close that preceded the high starting from the previous day (latest price swing)
      for (temp; temp > 0; --temp) {
        // once we find the highest point we start from the previous day to find the close (we go backwards from the highest point)
        if (close == data[temp]?.price_close) {
          break
        }
        if (
          data[temp - 1].price_close > data[temp]?.price_close &&
          data[temp - 1] &&
          data[temp + 1].price_close > data[temp]?.price_close
        ) {
          close = data[temp]?.price_close
          break
        }
      }
    }
    // same as above but for the low if the trend is down
    if (!newTrend) {
      for (i; i < data.length; i++) {
        if (low >= data[i]?.price_low) {
          low = data[i]?.price_low
          extrems_date = data[i - 1]?.time_period_start
          temp = i - 1
        }
      }
      for (temp; temp > 0; --temp) {
        if (close == data[temp]?.price_close) {
          break
        }
        if (
          data[temp - 1].price_close < data[temp]?.price_close &&
          data[temp - 1] &&
          data[temp + 1].price_close < data[temp]?.price_close
        ) {
          close = data[temp]?.price_close
          break
        }
      }
    }

    if (close == null || close == Infinity || close == -Infinity) {
      console.log(
        "\x1b[33m",
        "we assume that close is the starting point",
        "\x1b[0m"
      )
      close = data[0].price_close
    }

    return { high, low, close, start_date, extrems_date }
  } catch (err) {
    console.error(err)
    return {
      high: null,
      low: null,
      close: null,
      start_date: null,
    }
  }
}
////////////////////////////////////////////// WRITE JSON DATA TO FILE //////////////////////////////////////////////
async function writeJsonFiles(
  newTrend,
  start_date,
  extrems_date,
  ticker,
  high,
  low,
  close
) {
  try {
    if (close == null || ticker == null) {
      console.log("No data available to write to the file")
      return
    }

    // Read the content of the hlc and trend files
    const hlcFilePath = "hlc.json"
    const trendFilePath = "trend.json"
    const hlcData = JSON.parse(fs.readFileSync(hlcFilePath, "utf8"))
    const trendData = JSON.parse(fs.readFileSync(trendFilePath, "utf8"))

    // Find the coin with the matching ticker in the hlcData array
    const coinIndex = hlcData.findIndex((coin) => coin.ticker === ticker)
    const coinTrendIndex = trendData.findIndex((coin) => coin.ticker === ticker)

    // If the coin is found, remove it from the arrays
    if (coinIndex !== -1) {
      hlcData.splice(coinIndex, 1)
    }
    if (coinTrendIndex !== -1) {
      trendData.splice(coinTrendIndex, 1)
    }

    // Append the new coin object to the arrays

    const newCoin = { ticker, high, low, close }
    start_date = start_date.substring(0, 19)
    extrems_date = extrems_date.substring(0, 19)
    console.log({
      ticker: ticker,
      newTrend: newTrend,
      "the high": high,
      "the low": low,
      "the close": close,
      "the start_date - 1 day": start_date,
      "the extrems_date - 1 day": extrems_date,
    })
    hlcData.push(newCoin)
    const newTrendData = {
      ticker,
      upTrend: newTrend,
      start_date: start_date,
      extrems_date: extrems_date,
    }
    trendData.push(newTrendData)

    // Write the updated hlc and trend files
    fs.writeFileSync(hlcFilePath, JSON.stringify(hlcData, null, 2))
    fs.writeFileSync(trendFilePath, JSON.stringify(trendData, null, 2))
  } catch (err) {
    console.error(err)
  }
}
////////////////////////////////////////////// SELL || BUY IF TREND CHANGES //////////////////////////////////////////////

/*********** CAN BE MODIFIED TO SELL OR BUY AT THE BREAK OF STRUCT (MEANING THE CLOSE THAT WE BROKE BELLOW(sell) OR ABOVE (buy)) ***********/
async function sell(ticker, broker) {
  try {
    console.log(`Selling ${ticker} on ${broker}`)
    // Extract the base currency from the trading pair (EX: BTC/USDT -> BTC)
    const baseCurrency = ticker.split("/")[0]
    const selectedBroker =
      broker === "BINANCE"
        ? BINANCE
        : broker === "GATEIO"
        ? GATEIO
        : broker === "MEXC"
        ? MEXC
        : null

    if (!selectedBroker) {
      console.error("Invalid broker specified.")
    }
    // Fetch your balance for the base currency
    const balance = await selectedBroker.fetchBalance()
    const coinBalance = balance[baseCurrency]["free"]
    console.log(`Balance: ${coinBalance} ${baseCurrency}`)
    // Check if the balance is greater than 0 before attempting to sell
    if (coinBalance > 0) {
      // Create a market sell order for the entire available balance

      const order = await selectedBroker.createOrder(
        ticker,
        "market",
        "sell",
        coinBalance
      )
      console.log(`Sold: ${order.cost}$ of ${order.symbol}`)
    } else {
      console.log(`You have no balance of ${baseCurrency} to sell.`)
    }
  } catch (error) {
    console.error(`Error creating order: ${error}`)
  }
}
async function buy(amountToSpend, ticker, broker) {
  try {
    console.log(`Buying ${ticker} on ${broker}`)
    const selectedBroker =
      broker === "BINANCE"
        ? BINANCE
        : broker === "GATEIO"
        ? GATEIO
        : broker === "MEXC"
        ? MEXC
        : null
    if (selectedBroker === BINANCE) {
      const tickerData = await selectedBroker.fetchTicker(ticker)
      const Price = tickerData.last
      const Amount = amountToSpend / Price
      const order = await selectedBroker.createOrder(
        ticker,
        "market",
        "buy",
        Amount
      )
      console.log(`bought: ${order.cost}$ of ${order.symbol}`)
      return
    }
    const order = await selectedBroker.createOrder(
      ticker,
      "market",
      "buy",
      amountToSpend,
      undefined
    )
    console.log(`bought: ${order.cost}$ of ${order.symbol}`)
    return
  } catch (error) {
    console.error(`Error creating order: ${error.message}`)
  }
}
////////////////////////////////////////////// MAIN TO KEEP THINGS STRUCTURED //////////////////////////////////////////////
async function main() {
  const coinsData = JSON.parse(fs.readFileSync("./COINS.json"))
  const coinsTrends = JSON.parse(fs.readFileSync("trend.json", "utf-8"))

  for (const coinData of coinsData) {
    const symbolId = `${coinData.exchange_id}_SPOT_${coinData.ticker.replace(
      "/",
      "_"
    )}` // creating the symbol id from the JSON data (EX: BINANCE_SPOT_BTCUSDT)
    const periodId = coinData.timeframe // The timeframe we want to manage our coin in (EX: 1DAY)
    const ticker = coinData.ticker // The ticker of the coin (EX: BTC/USDT)
    console.log("\x1b[31m", symbolId, periodId, ticker, "\x1b[0m")

    const coinTrend = await coinsTrends.find((coin) => coin.ticker === ticker)

    if (!coinTrend) {
      console.error(`Coin ${ticker} not found in trend.json`)
      console.error("\x1b[31m", "Please add it to trend.json", "\x1b[0m")
    }
    const { upTrend: initialTrend, extrems_date: extrems } = coinTrend
    console.log(`The Original trend of ${ticker} was : ${initialTrend}`)

    const { start_date: timeStart } = coinTrend
    let timeEnd = new Date().toISOString()
    const [date, time] = timeEnd.split("T")
    const [hours, minutes, seconds, _] = time.split(":")
    timeEnd = `${date}T${String(Number(hours)).padStart(2, "0")}:00:00`

    const data1 = await fetchOHLCV(symbolId, periodId, timeStart, timeEnd) // Fetching the data from CoinAPI

    let {
      high: high_readfiles,
      low: low_readfiles,
      close: close_readfiles,
    } = await readJson(initialTrend, ticker) // Reading the hlc and trend files and creating new object if it does not exist

    let { newTrend, data } = await detectTrend(
      data1,
      extrems,
      initialTrend,
      close_readfiles
    ) // Detecting the new trend based on the previous close price and the new close we get from CoinAPI data
    const { high, low, close, start_date, extrems_date } =
      await getLatestHighAndLow(
        data,
        timeStart,
        extrems,
        initialTrend,
        newTrend,
        high_readfiles,
        low_readfiles,
        close_readfiles
      )

    writeJsonFiles(newTrend, start_date, extrems_date, ticker, high, low, close) // Writing the new data to the hlc.json and trend.json files

    if (initialTrend && !newTrend) {
      // if we shifted the trend from up to down, then we need to sell
      sell(ticker, coinData.exchange_id)
      // Send email
      const mailOptions = {
        from: process.env.MAIL_USERNAME,
        to: "samielyaagoubius@gmail.com",
        subject: "Investment Manager: " + timeEnd,
        text:
          "Investment Manager: " +
          ticker +
          " has been sold on the 4h Timeframe on " +
          coinData.exchange_id,
      }

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Error sending email:", error)
        } else {
          console.log("Email about selling is sent")
        }
      })
    }
    if (!initialTrend && newTrend) {
      // if we shifted the trend from down to up, then we need to buy
      const amountToSpend = 20 // the $ amount we want to spend on buying the coin. This can be changed based on how many coins we want to buy (from the coins.json file)
      buy(amountToSpend, ticker, coinData.exchange_id)
      // Send email
      const mailOptions = {
        from: process.env.MAIL_USERNAME,
        to: "samielyaagoubius@gmail.com",
        subject: "Investment Manager: " + timeEnd,
        text:
          "Investment Manager: " +
          ticker +
          " has been bought on the 4h Timeframe on " +
          coinData.exchange_id,
      }

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Error sending email:", error)
        } else {
          console.log("Email about buying is sent")
        }
      })
    }

    await new Promise((resolve) => setTimeout(resolve, 3000)) // Pause for 5 seconds
  }
}

main()

/*TODO:
- Calculate the $ amount we want to buy based on the number of coins we are interested in (aka the  number of coins in the coins.json file) and replace 10 with it (line 346)
- Combine the current timeframe trend with the higher timeframe trend to minimize risk
- Buy & Sell at the BOS (Break of Structure) using a limit order (aka letting the price return to the area of interest)
*/
