"""
Main trading bot module.
"""

import time
import logging
from typing import Dict, Any, List
from datetime import datetime
from pathlib import Path
import json
import csv

from .market_data import MarketDataFetcher
from .indicators import IndicatorCalculator
from .llm_client import LLMClient
from .position_manager import PositionManager


class TradingBot:
    """Main trading bot orchestrator."""

    def __init__(self, symbols: List[str], interval: str = "3m", check_interval: int = 180,
                 initial_balance: float = 10000.0, api_key: str = "", api_secret: str = "",
                 gemini_api_key: str = "", system_prompt: str = ""):
        self.symbols = symbols
        self.interval = interval
        self.check_interval = check_interval

        self.market_fetcher = MarketDataFetcher(api_key, api_secret)
        self.indicator_calc = IndicatorCalculator()
        self.llm_client = LLMClient(gemini_api_key)
        self.position_manager = PositionManager(initial_balance)

        self.system_prompt = system_prompt
        self.data_dir = Path("data")
        self.data_dir.mkdir(exist_ok=True)

        # CSV files
        self.state_csv = self.data_dir / "portfolio_state.csv"
        self.trades_csv = self.data_dir / "trade_history.csv"
        self.decisions_csv = self.data_dir / "ai_decisions.csv"
        self.market_csv = self.data_dir / "market_snapshots.csv"

        self._init_csv_files()

    def _init_csv_files(self):
        """Initialize CSV files."""
        if not self.state_csv.exists():
            with open(self.state_csv, 'w', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(['timestamp', 'total_balance', 'total_equity', 'total_return_pct'])

        if not self.trades_csv.exists():
            with open(self.trades_csv, 'w', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(['timestamp', 'coin', 'action', 'side', 'quantity', 'price', 'pnl', 'reason'])

        if not self.decisions_csv.exists():
            with open(self.decisions_csv, 'w', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(['timestamp', 'coin', 'signal', 'reasoning'])

        if not self.market_csv.exists():
            with open(self.market_csv, 'w', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(['timestamp', 'symbol', 'price', 'ema20', 'rsi', 'macd', 'macd_signal', 'funding_rate'])

    def fetch_market_snapshot(self, symbol: str) -> Dict[str, Any]:
        """Fetch market data and calculate indicators."""
        df = self.market_fetcher.fetch_candles(symbol, self.interval, 200)
        if df is None:
            return {}

        df = self.indicator_calc.add_indicators(df, ema_periods=[20], rsi_periods=[14],
                                               macd_params=(12, 26, 9))
        latest = df.iloc[-1]

        current_price = self.market_fetcher.get_current_price(symbol) or float(latest["close"])
        funding_rate = self.market_fetcher.get_funding_rate(symbol) or 0.0

        return {
            "symbol": symbol,
            "price": current_price,
            "ema20": float(latest["ema20"]),
            "rsi": float(latest["rsi14"]),
            "macd": float(latest["macd"]),
            "macd_signal": float(latest["macd_signal"]),
            "funding_rate": funding_rate,
        }

    def build_llm_prompt(self) -> str:
        """Build the prompt for LLM."""
        market_data = {}
        for symbol in self.symbols:
            coin = symbol.replace("USDT", "")
            market_data[coin] = self.fetch_market_snapshot(symbol)

        total_equity = self.position_manager.calculate_total_equity(
            {coin: data.get("price", 0) for coin, data in market_data.items()}
        )
        total_return = ((total_equity - self.position_manager.balance) / self.position_manager.balance) * 100

        prompt = f"""
Current Time: {datetime.now().isoformat()}
Total Equity: ${total_equity:.2f}
Total Return: {total_return:.2f}%

Market Data:
{json.dumps(market_data, indent=2)}

Positions:
{json.dumps(self.position_manager.positions, indent=2)}

Provide trading decisions in JSON format for each coin.
"""
        return prompt

    def execute_decisions(self, decisions: Dict[str, Any], current_prices: Dict[str, float]):
        """Execute trading decisions."""
        for coin, decision in decisions.items():
            signal = decision.get("decision")
            if signal == "entry":
                # Simplified entry logic
                side = decision.get("side", "long")
                quantity = decision.get("quantity", 1.0)
                price = current_prices.get(coin, 0)
                stop_loss = decision.get("stop_loss", price * 0.95)
                profit_target = decision.get("profit_target", price * 1.05)
                leverage = decision.get("leverage", 1.0)
                margin = (quantity * price) / leverage
                fees = quantity * price * 0.000275

                if self.position_manager.open_position(coin, side, quantity, price,
                                                  stop_loss, profit_target, leverage, margin, fees):
                    # Save trade record
                    self._persist_trade(coin, "open", side, quantity, price, 0, "")

            elif signal == "close":
                price = current_prices.get(coin, 0)
                trade_record = self.position_manager.close_position(coin, price, decision.get("justification", ""))
                if trade_record:
                    self._persist_trade(
                        trade_record["coin"], 
                        trade_record["action"], 
                        trade_record["side"], 
                        trade_record["quantity"], 
                        trade_record["exit_price"], 
                        trade_record["pnl"], 
                        trade_record["reason"]
                    )

    def run_iteration(self):
        """Run one trading iteration."""
        logging.info("Starting trading iteration")

        # Fetch market data
        current_prices = {}
        market_snapshots = {}
        for symbol in self.symbols:
            coin = symbol.replace("USDT", "")
            snapshot = self.fetch_market_snapshot(symbol)
            if snapshot:
                market_snapshots[coin] = snapshot
                current_prices[coin] = snapshot.get("price", 0)

        # Save market snapshots
        if market_snapshots:
            self._persist_market_snapshots(market_snapshots)

        # Check stop loss/take profit
        closed_trades = self.position_manager.check_stop_loss_take_profit(current_prices)
        for trade in closed_trades:
            self._persist_trade(
                trade["coin"], 
                trade["action"], 
                trade["side"], 
                trade["quantity"], 
                trade["exit_price"], 
                trade["pnl"], 
                trade["reason"]
            )

        # Get LLM decisions
        prompt = self.build_llm_prompt()
        decisions = self.llm_client.get_trading_decisions(prompt, self.system_prompt)

        if decisions:
            self._persist_decisions(decisions)
            self.execute_decisions(decisions, current_prices)

        # Log state
        self._log_state()

    def _log_state(self):
        """Log current state to CSV."""
        total_equity = self.position_manager.calculate_total_equity({})
        total_return = ((total_equity - self.position_manager.balance) / self.position_manager.balance) * 100

        with open(self.state_csv, 'a', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                datetime.now().isoformat(),
                self.position_manager.balance,
                total_equity,
                total_return,
            ])

    def _persist_decisions(self, decisions: Dict[str, Any]):
        """Persist LLM decisions to CSV."""
        with open(self.decisions_csv, 'a', newline='') as f:
            writer = csv.writer(f)
            timestamp = datetime.now().isoformat()
            for coin, decision in decisions.items():
                signal = decision.get("decision", "")
                reasoning = decision.get("reasoning", decision.get("justification", ""))
                writer.writerow([timestamp, coin, signal, reasoning])

    def _persist_market_snapshots(self, market_data: Dict[str, Dict[str, Any]]):
        """Persist market snapshots to CSV."""
        with open(self.market_csv, 'a', newline='') as f:
            writer = csv.writer(f)
            timestamp = datetime.now().isoformat()
            for coin, data in market_data.items():
                symbol = data.get("symbol", f"{coin}USDT")
                price = data.get("price", 0)
                ema20 = data.get("ema20", 0)
                rsi = data.get("rsi", 0)
                macd = data.get("macd", 0)
                macd_signal = data.get("macd_signal", 0)
                funding_rate = data.get("funding_rate", 0)
                writer.writerow([timestamp, symbol, price, ema20, rsi, macd, macd_signal, funding_rate])

    def _persist_trade(self, coin: str, action: str, side: str, quantity: float, price: float, pnl: float, reason: str):
        """Persist trade record to CSV."""
        with open(self.trades_csv, 'a', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                datetime.now().isoformat(),
                coin,
                action,
                side,
                quantity,
                price,
                pnl,
                reason,
            ])

    def run(self):
        """Main trading loop."""
        logging.info("Starting trading bot")
        while True:
            try:
                self.run_iteration()
                time.sleep(self.check_interval)
            except KeyboardInterrupt:
                logging.info("Shutting down bot")
                break
            except Exception as e:
                logging.error(f"Error in trading loop: {e}")
                time.sleep(60)

# Onboarding and Getting Started Instructions
#
# Once you join my website, you'll find the link to this repository in one of the courses there. Getting started is pretty straightforward—just follow the instructions in the README file. The README provides detailed steps on how to run this repository and explains some of the key concepts to help you hit the ground running.
#
# Step 1: Install UV. UV is a Python package manager and runtime manager. If you don't have UV on your machine, simply go to the UV website, download, and install it.
#
# Step 2: Once you have the link to the repo, clone it and run it on your local machine.
#
# Step 3: Use UV to install all dependencies by running 'uv sync'.
#
# Step 4: Create a .env file. You'll find a .env.example in the repository. You need two API keys:
#   - Binance API: Register for a free Binance account to get your API key. This lets you pull market data every 3 minutes.
#   - LLM Provider API: For demo purposes, I use Gemini 2.5 Flash. You can use Gemini 2.5 Pro or other LLMs via orchestrators like OpenRouter, or register and get API keys individually.
#
# Step 5: To run the bot, simply execute 'uv run python main.py'. This will get your bot up and running.
#
# Module Overview:
#   - Market Data Fetcher: Main pipeline that fetches data from Binance every 3 minutes, pulling candlestick data (timestamp, open, high, low, close, volume, etc.) to your local environment.
#   - Indicators Module: Calculates market indicators—Exponential Moving Average, Relative Strength Index, and Moving Average Convergence Divergence.
#   - LLM Client: Wrapper class for any LLM model. Takes market indicators as input and makes trading decisions.
#   - Position Manager: At the end of each trading cycle, calculates unrealized P&L and total equity. Provides summaries and calculations for each cycle.
#   - Trading Bot: Main orchestration/workflow module. Manages the overall trading process.