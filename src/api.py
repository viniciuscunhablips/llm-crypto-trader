from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from pathlib import Path
import json
from typing import List, Dict, Any
from datetime import datetime

app = FastAPI(title="LLM Crypto Trader API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path("data")

def read_csv_tail(filename: str, n: int = 100) -> List[Dict[str, Any]]:
    """Read the last n lines of a CSV file."""
    file_path = DATA_DIR / filename
    if not file_path.exists():
        return []
    try:
        df = pd.read_csv(file_path)
        # Replace NaN/None with empty string for JSON compatibility
        df = df.fillna('')
        # Convert to records and ensure no NaN values remain
        records = df.tail(n).to_dict(orient="records")
        # Double-check each record for NaN values
        for record in records:
            for key, value in record.items():
                if pd.isna(value) or (isinstance(value, float) and (value != value)):  # NaN check
                    record[key] = ''
        return records
    except Exception as e:
        print(f"Error reading {filename}: {e}")
        return []

@app.get("/api/status")
async def get_status():
    """Get latest portfolio status."""
    states = read_csv_tail("portfolio_state.csv", 1)
    if not states:
        return {"status": "waiting_for_data"}

    status_data = states[0]
    # Add initial_balance field (default 10000 from bot config)
    status_data['initial_balance'] = 10000
    return status_data

@app.get("/api/trades")
async def get_trades(limit: int = 50):
    """Get recent trades."""
    return read_csv_tail("trade_history.csv", limit)

@app.get("/api/positions")
async def get_positions():
    """Get current active positions."""
    file_path = DATA_DIR / "active_positions.csv"
    if not file_path.exists():
        return []
    
    try:
        df = pd.read_csv(file_path)
        if df.empty:
            return []
        
        # Convert timestamp to datetime
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # Get the latest timestamp
        latest_ts = df['timestamp'].max()
        
        # Filter for rows with that timestamp
        latest_positions = df[df['timestamp'] == latest_ts]
        
        # Replace NaN with None
        latest_positions = latest_positions.where(pd.notnull(latest_positions), None)
        
        return latest_positions.to_dict(orient="records")
    except Exception as e:
        print(f"Error reading positions: {e}")
        return []

@app.get("/api/decisions")
async def get_decisions(limit: int = 20):
    """Get recent AI decisions."""
    return read_csv_tail("ai_decisions.csv", limit)

@app.get("/api/market/{symbol}")
async def get_market_data(symbol: str, limit: int = 100):
    """Get market data for a specific symbol."""
    snapshots = read_csv_tail("market_snapshots.csv", limit * 6) # Fetch more to filter
    # Filter by symbol
    filtered = [s for s in snapshots if s.get("symbol") == symbol]
    return filtered[-limit:]

@app.get("/api/market_overview")
async def get_market_overview():
    """Get latest snapshot for all symbols."""
    snapshots = read_csv_tail("market_snapshots.csv", 50)
    # Group by symbol and take latest
    latest = {}
    for s in snapshots:
        latest[s['symbol']] = s
    return list(latest.values())

@app.get("/api/history/equity")
async def get_equity_history(limit: int = 500):
    """Get historical equity data for charting."""
    data = read_csv_tail("portfolio_state.csv", limit)
    return [{"timestamp": row["timestamp"], "total_equity": row["total_equity"]} for row in data]

@app.get("/api/stats/daily_trades")
async def get_daily_trades():
    """Get count of trades per day."""
    file_path = DATA_DIR / "trade_history.csv"
    if not file_path.exists():
        return []
    try:
        df = pd.read_csv(file_path)
        if df.empty:
            return []
        
        # Ensure timestamp is datetime
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        # Group by date (YYYY-MM-DD)
        daily_counts = df.groupby(df['timestamp'].dt.date).size().reset_index(name='count')
        
        return [
            {"date": str(row["timestamp"]), "count": int(row["count"])} 
            for _, row in daily_counts.iterrows()
        ]
    except Exception as e:
        print(f"Error calculating daily trades: {e}")
        return []

@app.get("/api/analytics/indicators")
async def get_indicators():
    """Get latest technical indicators for all symbols."""
    snapshots = read_csv_tail("market_snapshots.csv", 100)
    # Group by symbol and take latest
    latest = {}
    for s in snapshots:
        # Ensure we have the fields we need
        if 'rsi' in s and 'macd' in s:
            latest[s['symbol']] = {
                "symbol": s['symbol'],
                "price": s['price'],
                "rsi": s['rsi'],
                "macd": s['macd'],
                "macd_signal": s.get('macd_signal', 0),
                "macd_hist": s.get('macd_hist', 0),
                "ema20": s.get('ema20', 0),
                "timestamp": s['timestamp']
            }
    return list(latest.values())

@app.get("/api/analytics/performance")
async def get_performance():
    """Calculate performance metrics from trade history."""
    file_path = DATA_DIR / "trade_history.csv"
    if not file_path.exists():
        return {"win_rate": 0, "profit_factor": 0, "max_drawdown": 0, "sharpe_ratio": 0}
    
    try:
        df = pd.read_csv(file_path)
        if df.empty:
            return {"win_rate": 0, "profit_factor": 0, "max_drawdown": 0, "sharpe_ratio": 0}
        
        # Filter for closed trades (where we have PnL)
        # Assuming 'action' might indicate close or we just look at non-zero PnL
        # In this simulator, 'pnl' is likely populated on 'close' or 'sell' actions
        closed_trades = df[df['pnl'].notnull() & (df['pnl'] != 0)]
        
        if closed_trades.empty:
             return {"win_rate": 0, "profit_factor": 0, "max_drawdown": 0, "sharpe_ratio": 0}

        wins = closed_trades[closed_trades['pnl'] > 0]
        losses = closed_trades[closed_trades['pnl'] <= 0]
        
        win_rate = (len(wins) / len(closed_trades)) * 100 if len(closed_trades) > 0 else 0
        
        gross_profit = wins['pnl'].sum()
        gross_loss = abs(losses['pnl'].sum())
        profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else float('inf')
        
        # Simplified Max Drawdown (using cumulative PnL)
        closed_trades = closed_trades.copy() # Avoid SettingWithCopyWarning
        closed_trades['cumulative_pnl'] = closed_trades['pnl'].cumsum()
        closed_trades['peak'] = closed_trades['cumulative_pnl'].cummax()
        closed_trades['drawdown'] = closed_trades['cumulative_pnl'] - closed_trades['peak']
        max_drawdown = closed_trades['drawdown'].min() if not closed_trades.empty else 0
        
        # Simplified Sharpe (Mean / StdDev of returns) - assuming risk free rate 0
        mean_return = closed_trades['pnl'].mean()
        std_return = closed_trades['pnl'].std()
        sharpe = (mean_return / std_return) if std_return > 0 else 0
        
        return {
            "win_rate": round(win_rate, 2),
            "profit_factor": round(profit_factor, 2),
            "max_drawdown": round(max_drawdown, 2),
            "sharpe_ratio": round(sharpe, 2),
            "total_trades": len(closed_trades)
        }
        
    except Exception as e:
        print(f"Error calculating performance: {e}")
        return {"win_rate": 0, "profit_factor": 0, "max_drawdown": 0, "sharpe_ratio": 0}

@app.get("/api/market/snapshots/recent")
async def get_recent_snapshots(hours: int = 6):
    """Get market snapshots from the last N hours."""
    file_path = DATA_DIR / "market_snapshots.csv"
    if not file_path.exists():
        return []

    try:
        df = pd.read_csv(file_path)
        if df.empty:
            return []

        # Convert timestamp to datetime
        df['timestamp'] = pd.to_datetime(df['timestamp'])

        # Filter for last N hours
        cutoff_time = pd.Timestamp.now() - pd.Timedelta(hours=hours)
        recent = df[df['timestamp'] >= cutoff_time]

        # Replace NaN with None for valid JSON
        recent = recent.where(pd.notnull(recent), None)

        # Sort by timestamp descending (most recent first)
        recent = recent.sort_values('timestamp', ascending=False)

        return recent.to_dict(orient="records")

    except Exception as e:
        print(f"Error reading recent snapshots: {e}")
        return []

@app.get("/api/orders/open")
async def get_open_orders(limit: int = 50):
    """Get currently active/open positions (trades that have been opened but not yet closed)."""
    trades = read_csv_tail("trade_history.csv", limit * 4)  # Get more to analyze properly

    # Build a map to track which positions have been closed
    # Key: (coin, side) - represents a unique position
    positions = {}

    for trade in trades:
        coin = trade.get('coin')
        side = trade.get('side')
        action = trade.get('action')

        if not coin or not side or not action:
            continue

        key = (coin, side)

        if action == 'open':
            # Add to open positions (will be overwritten if already exists)
            positions[key] = trade
        elif action == 'close':
            # Remove from open positions if it exists
            if key in positions:
                del positions[key]

    # Get the remaining open positions
    open_positions = list(positions.values())

    # Sort by timestamp descending and limit
    open_positions = sorted(
        open_positions,
        key=lambda x: x.get('timestamp', ''),
        reverse=True
    )[:limit]

    return open_positions

@app.post("/api/orders/close")
async def close_position(coin: str, side: str):
    """Close an open position by adding a close trade entry."""
    try:
        # Read existing trades
        file_path = DATA_DIR / "trade_history.csv"

        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Trade history not found")

        df = pd.read_csv(file_path)

        # Find the open position for this coin and side
        open_position = df[(df['coin'] == coin) & (df['side'] == side) & (df['action'] == 'open') & (df['pnl'] == 0)]

        if open_position.empty:
            raise HTTPException(status_code=404, detail=f"No open position found for {coin} {side}")

        # Get the latest open position
        latest_open = open_position.iloc[-1]

        # Create a close trade entry
        from datetime import datetime
        close_trade = {
            'timestamp': datetime.now().isoformat(),
            'coin': coin,
            'action': 'close',
            'side': side,
            'quantity': latest_open['quantity'],
            'price': latest_open['price'],  # In real scenario, this would be current market price
            'pnl': 0,  # PnL would be calculated based on current price vs entry price
            'reason': 'Manual close from dashboard'
        }

        # Append to CSV
        new_row = pd.DataFrame([close_trade])
        df = pd.concat([df, new_row], ignore_index=True)
        df.to_csv(file_path, index=False)

        return {"status": "success", "message": f"Position {coin} {side} closed successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/orders/executed")
async def get_executed_orders(limit: int = 50):
    """Get recently executed orders (closed positions with PnL)."""
    trades = read_csv_tail("trade_history.csv", limit * 2)

    # Filter for closed orders (action='close' with pnl != 0)
    executed_orders = [
        trade for trade in trades
        if trade.get('action') == 'close' and trade.get('pnl') != 0
    ]

    # Sort by timestamp descending and limit
    executed_orders = sorted(
        executed_orders,
        key=lambda x: x.get('timestamp', ''),
        reverse=True
    )[:limit]

    return executed_orders

@app.get("/api/positions/detailed")
async def get_detailed_positions():
    """Get detailed positions with entry price, current price, and PnL percentage."""
    positions = await get_positions()
    market_overview = await get_market_overview()

    # Create a price lookup dictionary
    price_lookup = {snap['symbol']: snap['price'] for snap in market_overview}

    detailed_positions = []
    for pos in positions:
        coin = pos['coin']
        symbol = f"{coin}USDT"
        entry_price = float(pos['entry_price'])
        current_price = float(pos.get('current_price', price_lookup.get(symbol, entry_price)))

        # Calculate PnL percentage
        if pos['side'] == 'long':
            pnl_pct = ((current_price - entry_price) / entry_price) * 100
        else:  # short
            pnl_pct = ((entry_price - current_price) / entry_price) * 100

        detailed_positions.append({
            **pos,
            'current_price': current_price,
            'pnl_pct': round(pnl_pct, 2)
        })

    return detailed_positions

# Configuration Management Endpoints
CONFIG_FILE = DATA_DIR / "bot_config.json"
CONFIG_VERSIONS_FILE = DATA_DIR / "config_versions.json"

def load_config():
    """Load current configuration."""
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, 'r') as f:
            return json.load(f)
    return {
        "version": 1,
        "timestamp": datetime.now().isoformat(),
        "config": {
            "symbols": ["BTCUSDT", "ETHUSDT", "BNBUSDT"],
            "interval": "3m",
            "check_interval": 180,
            "initial_balance": 10000,
            "testnet": True,
            "stop_loss_pct": 5.0,
            "take_profit_pct": 5.0,
            "max_positions": 3,
            "risk_per_trade": 2.0,
            "leverage": 1.0,
            "system_prompt": ""
        }
    }

def save_config_version(config_data):
    """Save configuration version to history."""
    versions = []
    if CONFIG_VERSIONS_FILE.exists():
        with open(CONFIG_VERSIONS_FILE, 'r') as f:
            versions = json.load(f)

    # Add new version
    versions.append(config_data)

    # Keep only last 50 versions
    versions = versions[-50:]

    with open(CONFIG_VERSIONS_FILE, 'w') as f:
        json.dump(versions, f, indent=2)

@app.get("/api/config/current")
async def get_current_config():
    """Get current bot configuration."""
    config_data = load_config()
    return config_data['config']

@app.get("/api/config/versions")
async def get_config_versions():
    """Get all configuration versions."""
    if not CONFIG_VERSIONS_FILE.exists():
        return []

    with open(CONFIG_VERSIONS_FILE, 'r') as f:
        versions = json.load(f)

    return sorted(versions, key=lambda x: x.get('timestamp', ''), reverse=True)

@app.post("/api/config/save")
async def save_config(config: dict):
    """Save new configuration version."""
    try:
        # Load current version number
        current = load_config()
        new_version = current.get('version', 0) + 1

        # Create version entry
        config_data = {
            "version": new_version,
            "timestamp": datetime.now().isoformat(),
            "config": config
        }

        # Save as current config
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config_data, f, indent=2)

        # Save to versions history
        save_config_version(config_data)

        return {"status": "success", "version": new_version}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/config/restore/{version}")
async def restore_config_version(version: int):
    """Restore a specific configuration version."""
    try:
        if not CONFIG_VERSIONS_FILE.exists():
            raise HTTPException(status_code=404, detail="No versions found")

        with open(CONFIG_VERSIONS_FILE, 'r') as f:
            versions = json.load(f)

        # Find the requested version
        target_version = None
        for v in versions:
            if v.get('version') == version:
                target_version = v
                break

        if not target_version:
            raise HTTPException(status_code=404, detail=f"Version {version} not found")

        # Restore as current config
        with open(CONFIG_FILE, 'w') as f:
            json.dump(target_version, f, indent=2)

        return target_version['config']
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
