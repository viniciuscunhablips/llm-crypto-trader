"""
Position management module.
"""

import logging
from typing import Dict, Any, List, Optional
from decimal import Decimal


class PositionManager:
    """Manages trading positions, P&L, and equity."""

    def __init__(self, initial_balance: float = 10000.0):
        self.balance = initial_balance
        self.positions: Dict[str, Dict[str, Any]] = {}
        self.trade_history: List[Dict[str, Any]] = []

    def calculate_unrealized_pnl(self, coin: str, current_price: float) -> float:
        """Calculate unrealized P&L for a position."""
        if coin not in self.positions:
            return 0.0

        pos = self.positions[coin]
        quantity = pos["quantity"]
        entry_price = pos["entry_price"]

        if pos["side"] == "long":
            return (current_price - entry_price) * quantity
        else:  # short
            return (entry_price - current_price) * quantity

    def calculate_total_equity(self, current_prices: Dict[str, float]) -> float:
        """Calculate total equity including unrealized P&L."""
        equity = self.balance
        for coin, pos in self.positions.items():
            current_price = current_prices.get(coin)
            if current_price is None:
                current_price = pos["entry_price"]
            equity += self.calculate_unrealized_pnl(coin, current_price)
        return equity

    def open_position(self, coin: str, side: str, quantity: float, entry_price: float,
                     stop_loss: float, profit_target: float, leverage: float = 1.0,
                     margin: float = 0.0, fees: float = 0.0) -> bool:
        """Open a new position."""
        if coin in self.positions:
            logging.warning(f"Position already exists for {coin}")
            return False

        self.positions[coin] = {
            "side": side,
            "quantity": quantity,
            "entry_price": entry_price,
            "stop_loss": stop_loss,
            "profit_target": profit_target,
            "leverage": leverage,
            "margin": margin,
            "fees_paid": fees,
            "entry_justification": "",
        }

        self.balance -= margin + fees
        logging.info(f"Opened {side} position for {coin}: {quantity} @ {entry_price}")
        return True

    def close_position(self, coin: str, exit_price: float, reason: str = "") -> Optional[Dict[str, Any]]:
        """Close an existing position."""
        if coin not in self.positions:
            logging.warning(f"No position to close for {coin}")
            return None

        pos = self.positions[coin]
        pnl = self.calculate_unrealized_pnl(coin, exit_price)
        exit_fees = pos["quantity"] * exit_price * 0.000275  # Taker fee
        net_pnl = pnl - pos["fees_paid"] - exit_fees

        self.balance += pos["margin"] + net_pnl

        trade_record = {
            "coin": coin,
            "action": "close",
            "side": pos["side"],
            "quantity": pos["quantity"],
            "entry_price": pos["entry_price"],
            "exit_price": exit_price,
            "pnl": net_pnl,
            "reason": reason,
        }
        self.trade_history.append(trade_record)

        del self.positions[coin]
        logging.info(f"Closed position for {coin}: Net P&L {net_pnl}")
        return trade_record

    def check_stop_loss_take_profit(self, current_prices: Dict[str, float]) -> List[Dict[str, Any]]:
        """Check and execute stop loss/take profit."""
        closed_trades = []
        for coin in list(self.positions.keys()):
            pos = self.positions[coin]
            current_price = current_prices.get(coin, pos["entry_price"])

            if pos["side"] == "long":
                if current_price <= pos["stop_loss"]:
                    trade_record = self.close_position(coin, pos["stop_loss"], "Stop loss hit")
                    if trade_record:
                        closed_trades.append(trade_record)
                elif current_price >= pos["profit_target"]:
                    trade_record = self.close_position(coin, pos["profit_target"], "Take profit hit")
                    if trade_record:
                        closed_trades.append(trade_record)
            else:  # short
                if current_price >= pos["stop_loss"]:
                    trade_record = self.close_position(coin, pos["stop_loss"], "Stop loss hit")
                    if trade_record:
                        closed_trades.append(trade_record)
                elif current_price <= pos["profit_target"]:
                    trade_record = self.close_position(coin, pos["profit_target"], "Take profit hit")
                    if trade_record:
                        closed_trades.append(trade_record)
        return closed_trades