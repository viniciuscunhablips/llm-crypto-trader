"""
Market data fetching module.
"""

import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
import pandas as pd
import numpy as np
from binance.client import Client
from requests.exceptions import RequestException, Timeout


class MarketDataFetcher:
    """Handles fetching market data from Binance."""

    def __init__(self, api_key: Optional[str] = None, api_secret: Optional[str] = None, testnet: bool = True):
        self.client: Optional[Client] = None
        self.testnet = testnet
        if api_key and api_secret:
            try:
                self.client = Client(api_key, api_secret, testnet=testnet)
                if testnet:
                    self.client.API_URL = 'https://testnet.binance.vision/api'
                    
                network = "TESTNET" if testnet else "PRODUCTION"
                logging.info(f"Binance client initialized in {network} mode.")
            except Exception as e:
                logging.error(f"Failed to initialize Binance client: {e}")
                self.client = None

    def fetch_candles(self, symbol: str, interval: str = "3m", limit: int = 200) -> Optional[pd.DataFrame]:
        """Fetch historical klines for a symbol."""
        if not self.client:
            logging.warning("Binance client not available.")
            return None

        try:
            klines = self.client.get_klines(symbol=symbol, interval=interval, limit=limit)
            df = pd.DataFrame(
                klines,
                columns=[
                    "timestamp", "open", "high", "low", "close", "volume",
                    "close_time", "quote_volume", "trades", "taker_base",
                    "taker_quote", "ignore",
                ],
            )
            numeric_cols = ["open", "high", "low", "close", "volume"]
            df[numeric_cols] = df[numeric_cols].astype(float)
            df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms")
            return df
        except Exception as e:
            logging.error(f"Error fetching candles for {symbol}: {e}")
            return None

    def get_current_price(self, symbol: str) -> Optional[float]:
        """Get current price for a symbol."""
        if not self.client:
            return None

        try:
            ticker = self.client.get_symbol_ticker(symbol=symbol)
            return float(ticker["price"])
        except Exception as e:
            logging.error(f"Error getting current price for {symbol}: {e}")
            return None

    def get_funding_rate(self, symbol: str) -> Optional[float]:
        """Get latest funding rate for perpetual futures."""
        if not self.client:
            return None

        try:
            funding_info = self.client.futures_funding_rate(symbol=symbol, limit=1)
            if funding_info:
                return float(funding_info[0]["fundingRate"])
        except Exception as e:
            logging.debug(f"Funding rate unavailable for {symbol}: {e}")
        return None