import { useEffect, useState } from 'react';
import { api } from '../api';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Eye, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import './DashboardCMC.css';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const DashboardCMC = () => {
    const [status, setStatus] = useState(null);
    const [trades, setTrades] = useState([]);
    const [equityHistory, setEquityHistory] = useState([]);
    const [detailedPositions, setDetailedPositions] = useState([]);
    const [openOrders, setOpenOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [timeRange, setTimeRange] = useState('24h');
    const [filterType, setFilterType] = useState('all');
    const [filterCoin, setFilterCoin] = useState('all');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statusData, tradesData, equityData, detailedPositionsData, openOrdersData] = await Promise.all([
                    api.getStatus(),
                    api.getTrades(100),
                    api.getEquityHistory(200),
                    api.getDetailedPositions(),
                    api.getOpenOrders(50)
                ]);
                setStatus(statusData);
                setTrades(tradesData);
                setEquityHistory(equityData);
                setDetailedPositions(detailedPositionsData);
                setOpenOrders(openOrdersData);
            } catch (error) {
                console.error("Failed to fetch data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="cmc-loading">
                <div className="cmc-spinner"></div>
                <p>Loading Portfolio...</p>
            </div>
        );
    }

    const equity = status ? parseFloat(status.total_equity) : 0;
    const returnPct = status ? parseFloat(status.total_return_pct) : 0;
    const isPositive = returnPct >= 0;
    const initialBalance = status ? parseFloat(status.initial_balance || 10000) : 10000;
    const totalProfit = equity - initialBalance;

    // Chart data
    const chartData = {
        labels: equityHistory.map(d => format(parseISO(d.timestamp), 'HH:mm')),
        datasets: [{
            label: 'All-time profit',
            data: equityHistory.map(d => d.equity),
            borderColor: isPositive ? '#00D4AA' : '#F6465D',
            backgroundColor: (context) => {
                const ctx = context.chart.ctx;
                const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                gradient.addColorStop(0, isPositive ? 'rgba(0, 212, 170, 0.3)' : 'rgba(246, 70, 93, 0.3)');
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                return gradient;
            },
            fill: true,
            tension: 0.1,
            pointRadius: 0,
            pointHoverRadius: 4,
            borderWidth: 2,
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#1E2329',
                titleColor: '#848E9C',
                bodyColor: '#EAECEF',
                borderColor: '#2B3139',
                borderWidth: 1,
                padding: 12,
                displayColors: false,
                callbacks: {
                    label: (context) => `$${context.parsed.y.toFixed(2)}`
                }
            }
        },
        scales: {
            x: {
                display: false
            },
            y: {
                position: 'right',
                grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                ticks: {
                    callback: (value) => `$${value.toLocaleString()}`,
                    color: '#848E9C',
                    font: { size: 11 }
                }
            }
        }
    };

    // Calculate best/worst performers
    const getBestWorstPerformers = () => {
        if (detailedPositions.length === 0) return { best: null, worst: null };

        const sorted = [...detailedPositions].sort((a, b) => b.pnl_pct - a.pnl_pct);
        return {
            best: sorted[0],
            worst: sorted[sorted.length - 1]
        };
    };

    const { best, worst } = getBestWorstPerformers();

    return (
        <div className="cmc-dark">
            {/* Top Bar */}
            <div className="cmc-topbar">
                <div className="cmc-container">
                    <div className="cmc-portfolio-header">
                        <div className="cmc-portfolio-title">
                            <div className="cmc-avatar"></div>
                            <span>My Main Portfolio</span>
                            <span className="cmc-badge-default">Default</span>
                        </div>
                        <div className="cmc-portfolio-actions">
                            <label className="cmc-toggle">
                                <span>Show charts</span>
                                <input type="checkbox" defaultChecked />
                                <span className="cmc-toggle-slider"></span>
                            </label>
                            <button className="cmc-btn-export">Export</button>
                        </div>
                    </div>

                    <div className="cmc-portfolio-value">
                        <h1>${equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h1>
                        <button className="cmc-eye-btn"><Eye size={20} /></button>
                    </div>

                    <div className={`cmc-portfolio-change ${isPositive ? 'positive' : 'negative'}`}>
                        {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        <span>${Math.abs(totalProfit).toFixed(2)}</span>
                        <span>{returnPct.toFixed(2)}% (24h)</span>
                    </div>

                    <div className="cmc-tabs">
                        <button
                            className={`cmc-tab ${activeTab === 'overview' ? 'active' : ''}`}
                            onClick={() => setActiveTab('overview')}
                        >
                            Overview
                        </button>
                        <button
                            className={`cmc-tab ${activeTab === 'transaction' ? 'active' : ''}`}
                            onClick={() => setActiveTab('transaction')}
                        >
                            Transaction
                        </button>
                    </div>
                </div>
            </div>

            <div className="cmc-container">
                {activeTab === 'overview' ? (
                    <>
                        {/* Stats Cards */}
                        <div className="cmc-stats-grid">
                            <div className="cmc-stat-card">
                                <div className="cmc-stat-header">
                                    All-time profit
                                    <Activity size={14} />
                                </div>
                                <div className={`cmc-stat-value ${isPositive ? 'positive' : 'negative'}`}>
                                    ${Math.abs(totalProfit).toFixed(2)}
                                </div>
                                <div className={`cmc-stat-percent ${isPositive ? 'positive' : 'negative'}`}>
                                    {isPositive ? '▲' : '▼'} {Math.abs(returnPct).toFixed(2)}%
                                </div>
                            </div>

                            <div className="cmc-stat-card">
                                <div className="cmc-stat-header">
                                    Cost Basis
                                    <Activity size={14} />
                                </div>
                                <div className="cmc-stat-value">
                                    ${initialBalance.toFixed(2)}
                                </div>
                            </div>

                            <div className="cmc-stat-card">
                                <div className="cmc-stat-header">
                                    Best Performer
                                </div>
                                {best ? (
                                    <>
                                        <div className="cmc-stat-coin">{best.coin}</div>
                                        <div className="cmc-stat-value positive">
                                            ${parseFloat(best.unrealized_pnl).toFixed(2)}
                                        </div>
                                        <div className="cmc-stat-percent positive">
                                            ▲ {best.pnl_pct}%
                                        </div>
                                    </>
                                ) : (
                                    <div className="cmc-stat-value">--</div>
                                )}
                            </div>

                            <div className="cmc-stat-card">
                                <div className="cmc-stat-header">
                                    Worst Performer
                                </div>
                                {worst ? (
                                    <>
                                        <div className="cmc-stat-coin">{worst.coin}</div>
                                        <div className="cmc-stat-value negative">
                                            ${parseFloat(worst.unrealized_pnl).toFixed(2)}
                                        </div>
                                        <div className="cmc-stat-percent negative">
                                            ▼ {Math.abs(worst.pnl_pct)}%
                                        </div>
                                    </>
                                ) : (
                                    <div className="cmc-stat-value">--</div>
                                )}
                            </div>
                        </div>

                        {/* Chart */}
                        <div className="cmc-chart-section">
                            <div className="cmc-chart-header">
                                <h3>History</h3>
                                <div className="cmc-time-range">
                                    <button className={timeRange === '24h' ? 'active' : ''} onClick={() => setTimeRange('24h')}>24h</button>
                                    <button className={timeRange === '7d' ? 'active' : ''} onClick={() => setTimeRange('7d')}>7d</button>
                                    <button className={timeRange === '30d' ? 'active' : ''} onClick={() => setTimeRange('30d')}>30d</button>
                                    <button className={timeRange === '90d' ? 'active' : ''} onClick={() => setTimeRange('90d')}>90d</button>
                                    <button className={timeRange === 'all' ? 'active' : ''} onClick={() => setTimeRange('all')}>All</button>
                                </div>
                            </div>
                            <div className="cmc-chart-container">
                                <Line data={chartData} options={chartOptions} />
                            </div>
                        </div>

                        {/* Holdings Table - Updated */}
                        <div className="cmc-holdings-section">
                            <h3>Your Holdings</h3>
                            <div className="cmc-table-wrapper">
                                <table className="cmc-holdings-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th className="text-right">Price</th>
                                            <th className="text-right">Holdings</th>
                                            <th className="text-right">Avg. Buy Price</th>
                                            <th className="text-right">Profit/Loss</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {detailedPositions.map((pos, i) => {
                                            const pnl = parseFloat(pos.unrealized_pnl);
                                            const pnlPct = parseFloat(pos.pnl_pct);
                                            const isProfitable = pnl >= 0;
                                            const quantity = parseFloat(pos.quantity);
                                            const currentPrice = parseFloat(pos.current_price);
                                            const entryPrice = parseFloat(pos.entry_price);
                                            const holdingsValue = quantity * currentPrice;

                                            return (
                                                <tr key={i}>
                                                    <td>
                                                        <div className="cmc-asset-cell">
                                                            <div className="cmc-asset-icon">{pos.coin.substring(0, 2)}</div>
                                                            <div>
                                                                <div className="cmc-asset-name">
                                                                    {pos.coin === 'BTC' ? 'Bitcoin' :
                                                                     pos.coin === 'ETH' ? 'Ethereum' :
                                                                     pos.coin === 'XRP' ? 'XRP' :
                                                                     pos.coin === 'SOL' ? 'Solana' :
                                                                     pos.coin === 'BNB' ? 'BNB' :
                                                                     pos.coin === 'DOGE' ? 'Dogecoin' : pos.coin}
                                                                    {' '}<span className="cmc-asset-symbol">{pos.coin}</span>
                                                                    {pos.side === 'short' && <span className="cmc-badge-short-mini">🔴 {pos.side.toUpperCase()}</span>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="text-right">
                                                        <div style={{ fontWeight: 600 }}>${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                    </td>
                                                    <td className="text-right">
                                                        <div style={{ fontWeight: 600 }}>${holdingsValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                        <div className="cmc-holdings-qty">{quantity.toFixed(4)} {pos.coin}</div>
                                                    </td>
                                                    <td className="text-right">
                                                        <div style={{ fontWeight: 600 }}>${entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                    </td>
                                                    <td className={`text-right ${isProfitable ? 'positive' : 'negative'}`}>
                                                        <div style={{ fontWeight: 600, fontSize: '15px' }}>
                                                            {isProfitable ? '+' : '-'}${Math.abs(pnl).toFixed(2)}
                                                        </div>
                                                        <div style={{ fontSize: '13px', fontWeight: 600 }}>
                                                            {isProfitable ? '▲' : '▼'} {Math.abs(pnlPct).toFixed(2)}%
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {detailedPositions.length === 0 && (
                                            <tr>
                                                <td colSpan="5" className="cmc-empty">No holdings</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                ) : (
                    /* Transaction Tab */
                    <div className="cmc-transaction-section">
                        <div className="cmc-transaction-filters">
                            <select className="cmc-filter" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                                <option value="all">All Type</option>
                                <option value="open">Buy</option>
                                <option value="close">Sell</option>
                            </select>
                            <select className="cmc-filter" value={filterCoin} onChange={(e) => setFilterCoin(e.target.value)}>
                                <option value="all">All Coins</option>
                                {[...new Set(trades.map(t => t.coin))].map(coin => (
                                    <option key={coin} value={coin}>{coin}</option>
                                ))}
                            </select>
                        </div>

                        <div className="cmc-table-wrapper">
                            <table className="cmc-transaction-table">
                                <thead>
                                    <tr>
                                        <th>Type</th>
                                        <th>Date</th>
                                        <th>Assets</th>
                                        <th>Side</th>
                                        <th className="text-right">Price</th>
                                        <th className="text-right">Amount</th>
                                        <th className="text-right">Fees</th>
                                        <th className="text-right">PnL</th>
                                        <th>Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        // Filter trades
                                        let filteredTrades = trades;
                                        if (filterType !== 'all') {
                                            filteredTrades = filteredTrades.filter(t => t.action === filterType);
                                        }
                                        if (filterCoin !== 'all') {
                                            filteredTrades = filteredTrades.filter(t => t.coin === filterCoin);
                                        }

                                        // Get last 30 trades and reverse to show most recent first
                                        return filteredTrades.slice(-30).reverse().map((trade, i) => {
                                            const actionType = trade.action === 'open' ? 'Buy' : 'Sell';
                                            const quantity = parseFloat(trade.quantity);
                                            const price = parseFloat(trade.price);
                                            const total = quantity * price;
                                            const fees = total * 0.000275; // 0.0275% fee
                                            const pnl = parseFloat(trade.pnl || 0);
                                            const hasPnL = trade.action === 'close' && pnl !== 0;

                                            return (
                                                <tr key={i}>
                                                    <td>
                                                        <div className={`cmc-type-badge ${trade.action === 'open' ? 'buy' : 'sell'}`}>
                                                            {actionType}
                                                        </div>
                                                    </td>
                                                    <td className="cmc-date">{format(parseISO(trade.timestamp), 'MMM dd, yyyy, hh:mm a')}</td>
                                                    <td>
                                                        <div className="cmc-asset-cell">
                                                            <div className="cmc-asset-icon">{trade.coin.substring(0, 2)}</div>
                                                            <span className="cmc-asset-name">{trade.coin}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={`cmc-badge-side ${trade.side === 'long' ? 'long' : 'short'}`}>
                                                            {trade.side?.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="text-right">${price.toFixed(2)}</td>
                                                    <td className="text-right">
                                                        {trade.action === 'open' ? '+' : '-'}{quantity.toFixed(4)} {trade.coin}
                                                        <div className="cmc-amount-usd">${total.toFixed(2)}</div>
                                                    </td>
                                                    <td className="text-right" style={{ color: '#848E9C' }}>
                                                        ${fees.toFixed(2)}
                                                    </td>
                                                    <td className={`text-right ${hasPnL ? (pnl >= 0 ? 'positive' : 'negative') : ''}`}>
                                                        {hasPnL ? `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}` : '--'}
                                                    </td>
                                                    <td style={{ color: '#848E9C', fontSize: '13px' }}>
                                                        {trade.reason || '--'}
                                                    </td>
                                                </tr>
                                            );
                                        });
                                    })()}
                                    {trades.length === 0 && (
                                        <tr>
                                            <td colSpan="9" className="cmc-empty">No transactions</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardCMC;
