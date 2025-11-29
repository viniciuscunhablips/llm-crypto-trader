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
                 gemini_api_key: str = "", system_prompt: str = "", testnet: bool = True, config: dict = None):
        self.symbols = symbols
        self.interval = interval
        self.check_interval = check_interval

        # Store configuration
        self.config = config or {}
        self.stop_loss_pct = self.config.get('stop_loss_pct', 5.0)
        self.take_profit_pct = self.config.get('take_profit_pct', 5.0)
        self.leverage = self.config.get('leverage', 1.0)
        self.risk_per_trade = self.config.get('risk_per_trade', 2.0)
        self.max_positions = self.config.get('max_positions', 3)

        self.testnet = testnet
        self.market_fetcher = MarketDataFetcher(api_key, api_secret, testnet=testnet)
        network = "TESTNET" if testnet else "PRODUCTION"
        logging.info(f"Trading bot initialized in {network} mode")

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
        self.positions_csv = self.data_dir / "active_positions.csv"

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
                writer.writerow(['timestamp', 'coin', 'signal', 'side', 'quantity', 'leverage', 'stop_loss', 'take_profit', 'reasoning'])

        if not self.market_csv.exists():
            with open(self.market_csv, 'w', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(['timestamp', 'symbol', 'price', 'ema20', 'rsi', 'macd', 'macd_signal', 'funding_rate'])
        
        if not self.positions_csv.exists():
            with open(self.positions_csv, 'w', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(['timestamp', 'coin', 'side', 'quantity', 'entry_price', 'current_price', 'unrealized_pnl', 'stop_loss', 'profit_target'])

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

        # Get current number of positions
        num_positions = len(self.position_manager.positions)

        prompt = f"""
Current Time: {datetime.now().isoformat()}
Total Equity: ${total_equity:.2f}
Total Return: {total_return:.2f}%

Risk Management Configuration:
- Default Leverage: {self.leverage}x
- Stop Loss: {self.stop_loss_pct}%
- Take Profit: {self.take_profit_pct}%
- Max Positions: {self.max_positions}
- Current Positions: {num_positions}/{self.max_positions}
- Risk per Trade: {self.risk_per_trade}%

Market Data:
{json.dumps(market_data, indent=2)}

Positions:
{json.dumps(self.position_manager.positions, indent=2)}

Provide trading decisions in JSON format for each coin. Use the leverage configuration above as default unless market conditions suggest otherwise.
"""
        return prompt

    def execute_decisions(self, decisions: Dict[str, Any], current_prices: Dict[str, float]):
        """Execute trading decisions."""
        for coin, decision in decisions.items():
            signal = decision.get("decision")
            if signal == "entry":
                # Check max positions limit
                if len(self.position_manager.positions) >= self.max_positions:
                    logging.warning(f"Max positions limit ({self.max_positions}) reached. Skipping entry for {coin}.")
                    continue

                # Use configured values with AI override
                side = decision.get("side", "long")
                quantity = decision.get("quantity", 1.0)
                price = current_prices.get(coin, 0)

                # Use configured stop loss/take profit percentages
                if side == "long":
                    stop_loss = decision.get("stop_loss", price * (1 - self.stop_loss_pct / 100))
                    profit_target = decision.get("profit_target", price * (1 + self.take_profit_pct / 100))
                else:  # short
                    stop_loss = decision.get("stop_loss", price * (1 + self.stop_loss_pct / 100))
                    profit_target = decision.get("profit_target", price * (1 - self.take_profit_pct / 100))

                # Use configured leverage as default
                leverage = decision.get("leverage", self.leverage)
                margin = (quantity * price) / leverage
                fees = quantity * price * 0.000275

                logging.info(f"Opening {side} position for {coin} with leverage {leverage}x")
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

        try:
            # Fetch market data
            current_prices = {}
            market_snapshots = {}
            for symbol in self.symbols:
                coin = symbol.replace("USDT", "")
                try:
                    snapshot = self.fetch_market_snapshot(symbol)
                    if snapshot:
                        market_snapshots[coin] = snapshot
                        current_prices[coin] = snapshot.get("price", 0)
                except Exception as e:
                    logging.error(f"Error fetching data for {symbol}: {e}")

            if not market_snapshots:
                logging.warning("No market data fetched. Skipping iteration.")
                return

            # Save market snapshots
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
            else:
                logging.warning("No trading decisions received from LLM.")

            # Log state
            self._log_state()
            
            # Persist active positions
            self._persist_active_positions(current_prices)

        except Exception as e:
            logging.error(f"Unexpected error during iteration: {e}", exc_info=True)

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
        """Persist LLM decisions to CSV with full details."""
        with open(self.decisions_csv, 'a', newline='') as f:
            writer = csv.writer(f)
            timestamp = datetime.now().isoformat()
            for coin, decision in decisions.items():
                signal = decision.get("decision", "hold")
                side = decision.get("side", "")
                quantity = decision.get("quantity", "")
                leverage = decision.get("leverage", "")
                stop_loss = decision.get("stop_loss", "")
                take_profit = decision.get("profit_target", decision.get("take_profit", ""))
                reasoning = decision.get("reasoning", decision.get("justification", ""))
                writer.writerow([timestamp, coin, signal, side, quantity, leverage, stop_loss, take_profit, reasoning])

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

    def _persist_active_positions(self, current_prices: Dict[str, float]):
        """Persist active positions to CSV."""
        timestamp = datetime.now().isoformat()
        with open(self.positions_csv, 'a', newline='') as f:
            writer = csv.writer(f)
            # If no positions, write nothing or write a marker? 
            # Actually, if we want to show "current positions" in UI, we need to know when the list is empty.
            # But for now, let's just log what we have. The UI can filter by latest timestamp.
            
            if not self.position_manager.positions:
                # Optional: write a row with empty values to indicate "no positions" at this timestamp?
                # Or just rely on the fact that no rows with recent timestamp = no positions.
                pass

            for coin, pos in self.position_manager.positions.items():
                current_price = current_prices.get(coin, pos["entry_price"])
                pnl = self.position_manager.calculate_unrealized_pnl(coin, current_price)
                
                writer.writerow([
                    timestamp,
                    coin,
                    pos["side"],
                    pos["quantity"],
                    pos["entry_price"],
                    current_price,
                    pnl,
                    pos["stop_loss"],
                    pos["profit_target"]
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
                logging.error(f"Critical error in trading loop: {e}", exc_info=True)
                time.sleep(60)