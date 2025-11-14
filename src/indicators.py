"""
Technical indicators calculation module.
"""

import pandas as pd
import numpy as np
from typing import List, Optional, Tuple


class IndicatorCalculator:
    """Calculates technical indicators."""

    @staticmethod
    def calculate_rsi(series: pd.Series, period: int = 14) -> pd.Series:
        """Calculate RSI using Wilder's smoothing."""
        delta = series.diff()
        gain = delta.where(delta > 0, 0.0)
        loss = -delta.where(delta < 0, 0.0)
        alpha = 1 / period
        avg_gain = gain.ewm(alpha=alpha, adjust=False).mean()
        avg_loss = loss.ewm(alpha=alpha, adjust=False).mean()
        rs = avg_gain / avg_loss.replace(0, np.nan)
        return 100 - 100 / (1 + rs)

    @staticmethod
    def calculate_ema(series: pd.Series, span: int) -> pd.Series:
        """Calculate Exponential Moving Average."""
        return series.ewm(span=span, adjust=False).mean()

    @staticmethod
    def calculate_macd(series: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9) -> pd.DataFrame:
        """Calculate MACD indicator."""
        ema_fast = series.ewm(span=fast, adjust=False).mean()
        ema_slow = series.ewm(span=slow, adjust=False).mean()
        macd_line = ema_fast - ema_slow
        signal_line = macd_line.ewm(span=signal, adjust=False).mean()
        return pd.DataFrame({"macd": macd_line, "signal": signal_line})

    @staticmethod
    def calculate_atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
        """Calculate Average True Range."""
        high = df["high"]
        low = df["low"]
        close = df["close"].shift(1)
        tr = pd.concat([high - low, (high - close).abs(), (low - close).abs()], axis=1).max(axis=1)
        alpha = 1 / period
        return tr.ewm(alpha=alpha, adjust=False).mean()

    def add_indicators(self, df: pd.DataFrame, ema_periods: Optional[List[int]] = None,
                      rsi_periods: Optional[List[int]] = None, macd_params: Optional[Tuple[int, int, int]] = None) -> pd.DataFrame:
        """Add indicators to dataframe."""
        result = df.copy()
        close = result["close"]

        if ema_periods:
            for period in ema_periods:
                result[f"ema{period}"] = self.calculate_ema(close, period)

        if rsi_periods:
            for period in rsi_periods:
                result[f"rsi{period}"] = self.calculate_rsi(close, period)

        if macd_params:
            fast, slow, signal = macd_params
            macd_df = self.calculate_macd(close, fast, slow, signal)
            result["macd"] = macd_df["macd"]
            result["macd_signal"] = macd_df["signal"]

        return result