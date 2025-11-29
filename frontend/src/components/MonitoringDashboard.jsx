import { useState, useEffect, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { Activity, Brain, TrendingUp, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../api';
import './MonitoringDashboard.css';

// Real-time Monitoring Dashboard
const MonitoringDashboard = () => {
    const [trades, setTrades] = useState([]);
    const [snapshots, setSnapshots] = useState([]);
    const [decisions, setDecisions] = useState([]);
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [autoScroll, setAutoScroll] = useState(true);

    const tradesRef = useRef(null);
    const snapshotsRef = useRef(null);
    const decisionsRef = useRef(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statusData, tradesData, snapshotsData, decisionsData] = await Promise.all([
                    api.getStatus(),
                    api.getTrades(100),
                    api.getRecentSnapshots(50),
                    api.getDecisions(100)
                ]);

                setStatus(statusData);
                // Sort by timestamp descending (most recent first)
                setTrades([...tradesData].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
                setSnapshots([...snapshotsData].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
                setDecisions([...decisionsData].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
                setLoading(false);

                // Auto scroll to top on new data if enabled
                if (autoScroll) {
                    setTimeout(() => {
                        if (tradesRef.current) tradesRef.current.scrollTop = 0;
                        if (snapshotsRef.current) snapshotsRef.current.scrollTop = 0;
                        if (decisionsRef.current) decisionsRef.current.scrollTop = 0;
                    }, 100);
                }
            } catch (error) {
                console.error("Failed to fetch monitoring data", error);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 3000); // Update every 3 seconds
        return () => clearInterval(interval);
    }, [autoScroll]);

    if (loading) {
        return (
            <div className="monitoring-loading">
                <div className="monitoring-spinner"></div>
                <p>Loading Monitoring Dashboard...</p>
            </div>
        );
    }

    // Debug: Check if we have data
    console.log('Monitoring Dashboard - Status:', status);
    console.log('Monitoring Dashboard - Trades count:', trades.length);
    console.log('Monitoring Dashboard - Snapshots count:', snapshots.length);
    console.log('Monitoring Dashboard - Decisions count:', decisions.length);

    const equity = status ? parseFloat(status.total_equity) : 0;
    const lastUpdate = status ? format(parseISO(status.timestamp), 'HH:mm:ss') : '--';

    return (
        <div className="monitoring-container">
            {/* Header with Status */}
            <div className="monitoring-header">
                <div className="monitoring-header-left">
                    <Activity size={24} className="monitoring-icon-pulse" />
                    <div>
                        <h1>Real-Time Monitoring</h1>
                        <p className="monitoring-subtitle">Live Bot Activity Dashboard</p>
                    </div>
                </div>
                <div className="monitoring-header-right">
                    <div className="monitoring-status-card">
                        <div className="monitoring-status-label">Total Equity</div>
                        <div className="monitoring-status-value">${equity.toFixed(2)}</div>
                    </div>
                    <div className="monitoring-status-card">
                        <div className="monitoring-status-label">Last Update</div>
                        <div className="monitoring-status-value">{lastUpdate}</div>
                    </div>
                    <div className="monitoring-status-card">
                        <div className="monitoring-status-label">Auto Scroll</div>
                        <label className="monitoring-toggle">
                            <input
                                type="checkbox"
                                checked={autoScroll}
                                onChange={(e) => setAutoScroll(e.target.checked)}
                            />
                            <span className="monitoring-toggle-slider"></span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Three Column Layout */}
            <div className="monitoring-grid">
                {/* Column 1: Bot Actions (Trades) */}
                <div className="monitoring-panel">
                    <div className="monitoring-panel-header">
                        <div className="monitoring-panel-title">
                            <TrendingUp size={18} />
                            <span>Bot Actions</span>
                            <div className="monitoring-badge">{trades.length}</div>
                        </div>
                        <div className="monitoring-live-indicator">
                            <span className="monitoring-pulse-dot"></span>
                            LIVE
                        </div>
                    </div>
                    <div className="monitoring-panel-content" ref={tradesRef}>
                        {trades.map((trade, i) => {
                            const isOpen = trade.action === 'open';
                            const pnl = parseFloat(trade.pnl || 0);
                            const hasPnL = !isOpen && pnl !== 0;
                            const quantity = parseFloat(trade.quantity);
                            const price = parseFloat(trade.price);
                            const total = quantity * price;

                            return (
                                <div key={i} className={`monitoring-item ${isOpen ? 'action-buy' : 'action-sell'}`}>
                                    <div className="monitoring-item-header">
                                        <div className="monitoring-item-time">
                                            <Clock size={12} />
                                            {format(parseISO(trade.timestamp), 'HH:mm:ss')}
                                        </div>
                                        <div className={`monitoring-action-badge ${isOpen ? 'badge-buy' : 'badge-sell'}`}>
                                            {isOpen ? 'BUY' : 'SELL'}
                                        </div>
                                    </div>

                                    <div className="monitoring-item-body">
                                        <div className="monitoring-item-row">
                                            <span className="monitoring-item-coin">{trade.coin}</span>
                                            <span className={`monitoring-item-side ${trade.side === 'long' ? 'side-long' : 'side-short'}`}>
                                                {trade.side?.toUpperCase()}
                                            </span>
                                        </div>

                                        <div className="monitoring-item-row">
                                            <span className="monitoring-label">Quantity:</span>
                                            <span className="monitoring-value">{quantity.toFixed(4)} {trade.coin}</span>
                                        </div>

                                        <div className="monitoring-item-row">
                                            <span className="monitoring-label">Price:</span>
                                            <span className="monitoring-value">${price.toFixed(2)}</span>
                                        </div>

                                        <div className="monitoring-item-row">
                                            <span className="monitoring-label">Total:</span>
                                            <span className="monitoring-value-highlight">${total.toFixed(2)}</span>
                                        </div>

                                        {hasPnL && (
                                            <div className="monitoring-item-row">
                                                <span className="monitoring-label">PnL:</span>
                                                <span className={`monitoring-value-pnl ${pnl >= 0 ? 'pnl-positive' : 'pnl-negative'}`}>
                                                    {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                                                </span>
                                            </div>
                                        )}

                                        {trade.reason && (
                                            <div className="monitoring-item-footer">
                                                <span className="monitoring-label">Reason:</span>
                                                <span className="monitoring-reason">{trade.reason}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {trades.length === 0 && (
                            <div className="monitoring-empty">
                                <AlertCircle size={32} />
                                <p>No trades yet</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Column 2: Market Snapshots */}
                <div className="monitoring-panel">
                    <div className="monitoring-panel-header">
                        <div className="monitoring-panel-title">
                            <Activity size={18} />
                            <span>Market Snapshots</span>
                            <div className="monitoring-badge">{snapshots.length}</div>
                        </div>
                        <div className="monitoring-live-indicator">
                            <span className="monitoring-pulse-dot"></span>
                            LIVE
                        </div>
                    </div>
                    <div className="monitoring-panel-content" ref={snapshotsRef}>
                        {snapshots.map((snapshot, i) => {
                            const price = parseFloat(snapshot.price);
                            const change24h = parseFloat(snapshot.change_24h || 0);
                            const volume = parseFloat(snapshot.volume || 0);
                            const isPositive = change24h >= 0;

                            return (
                                <div key={i} className="monitoring-item">
                                    <div className="monitoring-item-header">
                                        <div className="monitoring-item-time">
                                            <Clock size={12} />
                                            {format(parseISO(snapshot.timestamp), 'HH:mm:ss')}
                                        </div>
                                        <span className="monitoring-item-coin">{snapshot.symbol}</span>
                                    </div>

                                    <div className="monitoring-item-body">
                                        <div className="monitoring-item-row">
                                            <span className="monitoring-label">Price:</span>
                                            <span className="monitoring-value-highlight">${price.toFixed(2)}</span>
                                        </div>

                                        <div className="monitoring-item-row">
                                            <span className="monitoring-label">24h Change:</span>
                                            <span className={`monitoring-value-pnl ${isPositive ? 'pnl-positive' : 'pnl-negative'}`}>
                                                {isPositive ? '+' : ''}{change24h.toFixed(2)}%
                                            </span>
                                        </div>

                                        {volume > 0 && (
                                            <div className="monitoring-item-row">
                                                <span className="monitoring-label">Volume:</span>
                                                <span className="monitoring-value">
                                                    {volume >= 1000000
                                                        ? `$${(volume / 1000000).toFixed(2)}M`
                                                        : `$${(volume / 1000).toFixed(2)}K`
                                                    }
                                                </span>
                                            </div>
                                        )}

                                        {snapshot.rsi && (
                                            <div className="monitoring-item-row">
                                                <span className="monitoring-label">RSI:</span>
                                                <span className={`monitoring-value ${
                                                    parseFloat(snapshot.rsi) > 70 ? 'text-warning' :
                                                    parseFloat(snapshot.rsi) < 30 ? 'text-danger' : ''
                                                }`}>
                                                    {parseFloat(snapshot.rsi).toFixed(2)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {snapshots.length === 0 && (
                            <div className="monitoring-empty">
                                <AlertCircle size={32} />
                                <p>No market data yet</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Column 3: AI Decisions */}
                <div className="monitoring-panel">
                    <div className="monitoring-panel-header">
                        <div className="monitoring-panel-title">
                            <Brain size={18} />
                            <span>AI Decisions</span>
                            <div className="monitoring-badge">{decisions.length}</div>
                        </div>
                        <div className="monitoring-live-indicator">
                            <span className="monitoring-pulse-dot"></span>
                            LIVE
                        </div>
                    </div>
                    <div className="monitoring-panel-content" ref={decisionsRef}>
                        {decisions.map((decision, i) => {
                            const action = decision.action?.toLowerCase();
                            const isHold = action === 'hold';
                            const isBuy = action === 'buy' || action === 'open';
                            const isSell = action === 'sell' || action === 'close';

                            return (
                                <div key={i} className={`monitoring-item ${
                                    isBuy ? 'decision-buy' :
                                    isSell ? 'decision-sell' :
                                    'decision-hold'
                                }`}>
                                    <div className="monitoring-item-header">
                                        <div className="monitoring-item-time">
                                            <Clock size={12} />
                                            {format(parseISO(decision.timestamp), 'HH:mm:ss')}
                                        </div>
                                        <div className={`monitoring-decision-badge ${
                                            isBuy ? 'badge-buy' :
                                            isSell ? 'badge-sell' :
                                            'badge-hold'
                                        }`}>
                                            {isBuy && <CheckCircle size={12} />}
                                            {isSell && <XCircle size={12} />}
                                            {isHold && <AlertCircle size={12} />}
                                            {action?.toUpperCase()}
                                        </div>
                                    </div>

                                    <div className="monitoring-item-body">
                                        {decision.coin && (
                                            <div className="monitoring-item-row">
                                                <span className="monitoring-label">Coin:</span>
                                                <span className="monitoring-item-coin">{decision.coin}</span>
                                            </div>
                                        )}

                                        {decision.side && (
                                            <div className="monitoring-item-row">
                                                <span className="monitoring-label">Side:</span>
                                                <span className={`monitoring-item-side ${decision.side === 'long' ? 'side-long' : 'side-short'}`}>
                                                    {decision.side?.toUpperCase()}
                                                </span>
                                            </div>
                                        )}

                                        {decision.confidence !== undefined && (
                                            <div className="monitoring-item-row">
                                                <span className="monitoring-label">Confidence:</span>
                                                <div className="monitoring-confidence">
                                                    <div className="monitoring-confidence-bar">
                                                        <div
                                                            className="monitoring-confidence-fill"
                                                            style={{ width: `${decision.confidence * 100}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="monitoring-confidence-value">
                                                        {(decision.confidence * 100).toFixed(0)}%
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {decision.reasoning && (
                                            <div className="monitoring-item-footer">
                                                <span className="monitoring-label">Reasoning:</span>
                                                <p className="monitoring-reasoning">{decision.reasoning}</p>
                                            </div>
                                        )}

                                        {decision.market_conditions && (
                                            <div className="monitoring-item-footer">
                                                <span className="monitoring-label">Market:</span>
                                                <p className="monitoring-reasoning">{decision.market_conditions}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {decisions.length === 0 && (
                            <div className="monitoring-empty">
                                <Brain size={32} />
                                <p>No AI decisions yet</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MonitoringDashboard;
