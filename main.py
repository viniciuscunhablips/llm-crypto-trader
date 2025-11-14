#!/usr/bin/env python3
"""
LLM Crypto Trading Bot
"""

import os
import logging
from dotenv import load_dotenv

from src.trading_bot import TradingBot

# Load environment variables
load_dotenv()

# Configuration
SYMBOLS = ["ETHUSDT", "SOLUSDT", "XRPUSDT", "BTCUSDT", "DOGEUSDT", "BNBUSDT"]
INTERVAL = "3m"
CHECK_INTERVAL = 180  # 3 minutes
INITIAL_BALANCE = 10000.0

# API Keys
BINANCE_API_KEY = os.getenv("BN_API_KEY", "")
BINANCE_API_SECRET = os.getenv("BN_SECRET", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# System prompt
SYSTEM_PROMPT = """
You are a crypto trading expert. Analyze market data and positions to decide:
- "hold": Keep current position
- "entry": Open new position with side, quantity, stop_loss, profit_target, leverage
- "close": Close existing position

Return JSON with decisions for each coin.
"""

def main():
    logging.basicConfig(level=logging.INFO)

    if not GEMINI_API_KEY:
        logging.error("GEMINI_API_KEY not set")
        return

    bot = TradingBot(
        symbols=SYMBOLS,
        interval=INTERVAL,
        check_interval=CHECK_INTERVAL,
        initial_balance=INITIAL_BALANCE,
        api_key=BINANCE_API_KEY,
        api_secret=BINANCE_API_SECRET,
        gemini_api_key=GEMINI_API_KEY,
        system_prompt=SYSTEM_PROMPT,
    )

    bot.run()


if __name__ == "__main__":
    main()
