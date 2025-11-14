# LLM Crypto Trader

A modular Python backend for LLM-based cryptocurrency trading using Binance market data and Google Gemini AI.

## Features

- Fetches market data from Binance REST API every 3 minutes
- Calculates technical indicators (EMA, RSI, MACD)
- Uses Google Gemini 2.0 Flash (via google-genai SDK) for trading decisions
- Manages positions, P&L, and equity
- Persists data to CSV files
- Modular design for maintainability
- Cloud Run compatible

## How It Works

### Decision Making Process

The bot makes trading decisions through an iterative process:

1. **Market Data Collection**: At each iteration (every 3 minutes), the bot fetches the latest market data for configured symbols from Binance, including current prices, candlestick data, and funding rates.

2. **Technical Analysis**: Calculates technical indicators including:
   - EMA (20-period)
   - RSI (14-period)
   - MACD (12, 26, 9 parameters)

   **Indicator Explanations:**
   - **EMA (Exponential Moving Average)**: A weighted average that gives more importance to recent prices, making it more responsive to price changes than simple moving averages.
     - *Calculation*: EMA_t = (Price_t × multiplier) + (EMA_{t-1} × (1 - multiplier)), where multiplier = 2/(period + 1)
   
   - **RSI (Relative Strength Index)**: A momentum oscillator that measures the speed and change of price movements on a scale of 0-100, helping identify overbought (>70) or oversold (<30) conditions.
     - *Calculation*: RSI = 100 - (100 / (1 + RS)), where RS = Average Gain / Average Loss over the specified period
   
   - **MACD (Moving Average Convergence Divergence)**: Shows the relationship between two exponential moving averages, used to identify momentum changes, trend direction, and potential reversal points.
     - *Calculation*: MACD Line = EMA(12) - EMA(26), Signal Line = EMA(9) of MACD Line, Histogram = MACD Line - Signal Line

3. **LLM Analysis**: Constructs a comprehensive prompt containing:
   - Current timestamp
   - Total portfolio equity and return percentage
   - Market data snapshot for each symbol (price, indicators, funding rate)
   - Current open positions

4. **AI Decision Generation**: Sends the prompt to Google Gemini AI, which returns trading decisions in JSON format for each cryptocurrency.

### Trading Signals

The AI generates the following types of signals:

- **"entry"**: Open a new position
  - `side`: "long" (buy) or "short" (sell)
  - `quantity`: Amount to trade
  - `stop_loss`: Price level to close position at a loss
  - `profit_target`: Price level to close position at a profit
  - `leverage`: Leverage multiplier (default 1.0)
  - Additional parameters like margin and fees are calculated automatically

- **"close"**: Close an existing position
  - `justification`: Reason for closing the position

### Portfolio State Updates

At the end of each trading iteration, the bot updates the portfolio state:

1. **Equity Calculation**: Recalculates total portfolio equity by valuing all open positions at current market prices plus available cash balance.

2. **Return Calculation**: Computes the total return percentage as `((total_equity - initial_balance) / initial_balance) * 100`.

3. **State Persistence**: Logs the current state to `data/portfolio_state.csv` with:
   - Timestamp
   - Total balance (cash)
   - Total equity (cash + position values)
   - Total return percentage

This ensures a complete audit trail of portfolio performance over time.

## Setup

1. Install uv package manager
2. Clone the repository
3. Install dependencies: `uv sync`
4. Create a `.env` file with your API keys:
   ```
   BN_API_KEY=your_binance_api_key
   BN_SECRET=your_binance_secret
   GEMINI_API_KEY=your_gemini_api_key
   ENVIRONMENT=development  # or 'production' for less verbose logging
   ```
5. Run the bot: `uv run python main.py`

## Architecture

- `src/market_data.py`: Market data fetching from Binance
- `src/indicators.py`: Technical indicator calculations
- `src/llm_client.py`: Google Gemini AI integration (updated to use google-genai SDK)
- `src/position_manager.py`: Position and P&L management
- `src/trading_bot.py`: Main bot orchestration
- `main.py`: Entry point

## Configuration

- Symbols: ETH, SOL, XRP, BTC, DOGE, BNB
- Interval: 3 minutes
- Initial balance: $10,000 (paper trading)

## Logging

The bot supports different logging levels based on the `ENVIRONMENT` variable:

- **Production Mode** (`ENVIRONMENT=production`): Standard logging with basic operation info and errors
- **Development Mode** (`ENVIRONMENT=development`): Verbose logging including full LLM responses for debugging and analysis

Set the environment variable in your `.env` file to control logging verbosity.

## Paper Trading Simulation

This bot operates as a **paper trading simulation** - no real money is at risk, and all trades are virtual. The simulation makes several simplifying assumptions compared to real market conditions:

### Execution Assumptions
- **Perfect Execution**: All orders execute immediately at the exact price requested, with no slippage
- **Full Quantity Available**: Any quantity can be traded without liquidity constraints
- **Instant Order Filling**: No waiting for orders to fill - everything happens instantly

### Market Assumptions
- **Always Open Markets**: Trading runs 24/7 with no market closures, holidays, or maintenance windows
- **Perfect Data Feed**: Real-time price data is always available with no gaps, delays, or API failures
- **No Network Issues**: Perfect connectivity to Binance API with zero latency

### Trading Cost Assumptions
- **Fixed Fee Only**: Only accounts for Binance futures trading fee (0.0275% hardcoded)
- **No Borrowing Costs**: Leveraged positions don't incur borrowing interest or funding rate costs
- **No Spread Costs**: No bid-ask spread impact on execution
- **No Hidden Fees**: No withdrawal fees, deposit fees, or other platform costs

### Risk Management Assumptions
- **Perfect Stop Loss/Take Profit**: Triggers execute instantly when price levels are reached
- **No Gap Risk**: Prices don't gap past stop levels (common in crypto markets)
- **No Partial Fills**: Positions are opened/closed in full, not partially
- **No Liquidation Risk**: Margin requirements are simplified - no forced liquidations

### Technical Analysis Assumptions
- **Perfect Historical Data**: 200 candles of perfect, gap-free historical data always available
- **Precise Calculations**: All indicators (EMA, RSI, MACD) calculated with perfect floating-point precision
- **No Look-Ahead Bias**: Indicators use only past data, no future information leakage

### Real-World Considerations
The simulation provides a good baseline for testing trading strategies, but real trading involves additional complexity and risk factors not modeled here, including market impact, slippage, API limitations, network latency, partial fills, and extreme volatility events.

## Data Persistence

- `data/portfolio_state.csv`: Portfolio state over time
- `data/trade_history.csv`: Trade records
- `data/ai_decisions.csv`: AI decision logs
- `data/market_snapshots.csv`: Market data snapshots with technical indicators
