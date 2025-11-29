#!/usr/bin/env python3
"""
LLM Crypto Trading Bot
"""

import os
import sys
import logging
import json
from pathlib import Path
from dotenv import load_dotenv

from src.trading_bot import TradingBot

# Load environment variables
load_dotenv()

def load_bot_config():
    """Load bot configuration from JSON file."""
    config_file = Path("data") / "bot_config.json"

    # Default configuration
    default_config = {
        "symbols": ["BTCUSDT", "ETHUSDT", "BNBUSDT"],
        "interval": "3m",
        "check_interval": 180,
        "initial_balance": 10000.0,
        "testnet": True,
        "stop_loss_pct": 5.0,
        "take_profit_pct": 5.0,
        "max_positions": 3,
        "risk_per_trade": 2.0,
        "leverage": 1.0,
        "system_prompt": """You are a crypto trading expert. Analyze market data and positions to decide:
- "hold": Keep current position
- "entry": Open new position with side, quantity, stop_loss, profit_target, leverage
- "close": Close existing position

Return JSON with decisions for each coin."""
    }

    if config_file.exists():
        try:
            with open(config_file, 'r') as f:
                data = json.load(f)
                # Return the config from the versioned structure
                return data.get('config', default_config)
        except Exception as e:
            logging.warning(f"Failed to load config from {config_file}: {e}")
            return default_config

    return default_config

# Load configuration from file
config = load_bot_config()

# API Keys (still from environment for security)
BINANCE_API_KEY = os.getenv("BN_API_KEY", "")
BINANCE_API_SECRET = os.getenv("BN_SECRET", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

def setup_logging():
    """Configure logging."""
    log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    logging.basicConfig(
        level=logging.INFO,
        format=log_format,
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )

def main():
    setup_logging()
    logger = logging.getLogger(__name__)

    # Validate API Keys
    missing_keys = []
    if not BINANCE_API_KEY:
        missing_keys.append("BN_API_KEY")
    if not BINANCE_API_SECRET:
        missing_keys.append("BN_SECRET")
    if not GEMINI_API_KEY:
        missing_keys.append("GEMINI_API_KEY")

    if missing_keys:
        logger.error(f"Missing required environment variables: {', '.join(missing_keys)}")
        logger.error("Please check your .env file.")
        sys.exit(1)

    # Log configuration
    logger.info(f"Starting bot with symbols: {config['symbols']}")
    network = "TESTNET" if config['testnet'] else "PRODUCTION"
    logger.info(f"Using Binance {network}")
    logger.info(f"Configuration: Interval={config['interval']}, Leverage={config['leverage']}x, "
                f"Stop Loss={config['stop_loss_pct']}%, Take Profit={config['take_profit_pct']}%")

    bot = TradingBot(
        symbols=config['symbols'],
        interval=config['interval'],
        check_interval=config['check_interval'],
        initial_balance=config['initial_balance'],
        api_key=BINANCE_API_KEY,
        api_secret=BINANCE_API_SECRET,
        gemini_api_key=GEMINI_API_KEY,
        system_prompt=config['system_prompt'],
        testnet=config['testnet'],
        config=config  # Pass full config to bot
    )

    bot.run()


if __name__ == "__main__":
    main()
