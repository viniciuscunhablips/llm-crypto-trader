import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Line, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Activity, DollarSign, TrendingUp, Brain, Filter, X } from 'lucide-react';
import { format, parseISO, isSameDay } from 'date-fns';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const Dashboard = () => {
    const [status, setStatus] = useState(null);
    const [trades, setTrades] = useState([]);
    const [decisions, setDecisions] = useState([]);
    const [marketOverview, setMarketOverview] = useState([]);
    const [equityHistory, setEquityHistory] = useState([]);
    const [dailyTrades, setDailyTrades] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter States
    const [selectedCoin, setSelectedCoin] = useState('ALL');
    const [filterDate, setFilterDate] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statusData, tradesData, decisionsData, marketData, equityData, dailyData] = await Promise.all([
                    api.getStatus(),
                    api.getTrades(100), // Fetch more trades for filtering
                    api.getDecisions(),
                    api.getMarketOverview(),
                    api.getEquityHistory(),
                    api.getDailyTradeStats()
                ]);
                setStatus(statusData);
                setTrades(tradesData);
                setDecisions(decisionsData);
                setMarketOverview(marketData);
                setEquityHistory(equityData);
                setDailyTrades(dailyData);
            } catch (error) {
                console.error("Failed to fetch data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 10000); // Refresh every 10s
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="dashboard-container">Loading...</div>;

    const equity = status ? parseFloat(status.total_equity).toFixed(2) : '0.00';
    const returnPct = status ? parseFloat(status.total_return_pct).toFixed(2) : '0.00';
    const balance = status ? parseFloat(status.total_balance).toFixed(2) : '0.00';

    // Filter Logic
    const uniqueCoins = ['ALL', ...new Set(trades.map(t => t.coin))];

    const filteredTrades = trades.filter(trade => {
        const matchesCoin = selectedCoin === 'ALL' || trade.coin === selectedCoin;
        const matchesDate = !filterDate || isSameDay(parseISO(trade.timestamp), parseISO(filterDate));
        return matchesCoin && matchesDate;
    });

    // Chart Data Preparation
    const equityChartData = {
        labels: equityHistory.map(d => format(parseISO(d.timestamp), 'HH:mm')),
        datasets: [
            {
                label: 'Total Equity',
                data: equityHistory.map(d => d.equity),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                tension: 0.4,
            },
        ],
    };

    const dailyTradesChartData = {
        labels: dailyTrades.map(d => d.date),
        datasets: [
            {
                label: 'Trades per Day',
                data: dailyTrades.map(d => d.count),
                backgroundColor: '#10b981',
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
                labels: { color: '#94a3b8' }
            },
            title: { display: false },
        },
        scales: {
            y: {
                grid: { color: '#334155' },
                ticks: { color: '#94a3b8' }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#94a3b8' }
            }
        }
    };

    return (
        <div className="dashboard-layout" style={{ display: 'flex', minHeight: '100vh' }}>
            {/* Sidebar */}
            <aside style={{
                width: '250px',
                backgroundColor: 'var(--bg-secondary)',
                borderRight: '1px solid var(--border-color)',
                padding: '2rem 1rem',
                position: 'fixed',
                height: '100vh',
                overflowY: 'auto'
            }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Filter size={20} /> Filters
                </h2>

                <div style={{ marginBottom: '2rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Coin</label>
                    <select
                        value={selectedCoin}
                        onChange={(e) => setSelectedCoin(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.5rem',
                            backgroundColor: 'var(--bg-primary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            borderRadius: '0.375rem'
                        }}
                    >
                        {uniqueCoins.map(coin => (
                            <option key={coin} value={coin}>{coin}</option>
                        ))}
                    </select>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Date</label>
                    <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.5rem',
                            backgroundColor: 'var(--bg-primary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            borderRadius: '0.375rem'
                        }}
                    />
                </div>

                {(selectedCoin !== 'ALL' || filterDate) && (
                    <button
                        onClick={() => { setSelectedCoin('ALL'); setFilterDate(''); }}
                        style={{
                            width: '100%',
                            padding: '0.5rem',
                            backgroundColor: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <X size={16} /> Clear Filters
                    </button>
                )}
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, marginLeft: '250px', padding: '2rem' }}>
                <header className="header">
                    <div>
                        <h1 style={{ margin: 0 }}>Alpha Arena Simulator</h1>
                        <span style={{ color: 'var(--text-secondary)' }}>Live Paper Trading Dashboard</span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div className="badge badge-neutral">Status: Active</div>
                    </div>
                </header>

                {/* Metrics Grid */}
                <div className="grid">
                    <div className="card">
                        <div className="card-title"><DollarSign size={16} style={{ display: 'inline', marginRight: 8 }} /> Total Equity</div>
                        <div className="metric-value">${equity}</div>
                        <div className="metric-label">USDT Balance: ${balance}</div>
                    </div>
                    <div className="card">
                        <div className="card-title"><TrendingUp size={16} style={{ display: 'inline', marginRight: 8 }} /> Total Return</div>
                        <div className={`metric-value ${parseFloat(returnPct) >= 0 ? 'text-success' : 'text-danger'}`}>
                            {returnPct}%
                        </div>
                        <div className="metric-label">Since Inception</div>
                    </div>
                    <div className="card">
                        <div className="card-title"><Activity size={16} style={{ display: 'inline', marginRight: 8 }} /> Active Trades</div>
                        <div className="metric-value">{trades.filter(t => t.action === 'open').length}</div>
                        <div className="metric-label">Positions</div>
                    </div>
                </div>

                {/* Charts Row */}
                <div className="grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
                    <div className="card">
                        <div className="card-title">Portfolio Performance</div>
                        <div style={{ height: '300px' }}>
                            <Line options={chartOptions} data={equityChartData} />
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-title">Daily Activity</div>
                        <div style={{ height: '300px' }}>
                            <Bar options={chartOptions} data={dailyTradesChartData} />
                        </div>
                    </div>
                </div>

                <div className="grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
                    {/* Recent Trades */}
                    <div className="card">
                        <div className="card-title">Recent Trades</div>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>Coin</th>
                                        <th>Side</th>
                                        <th>Price</th>
                                        <th>PnL</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTrades.slice().reverse().slice(0, 10).map((trade, i) => (
                                        <tr key={i}>
                                            <td>{format(parseISO(trade.timestamp), 'dd/MM/yyyy HH:mm:ss')}</td>
                                            <td>{trade.coin}</td>
                                            <td>
                                                <span className={`badge ${trade.side === 'long' ? 'badge-success' : 'badge-danger'}`}>
                                                    {trade.side.toUpperCase()}
                                                </span>
                                            </td>
                                            <td>${parseFloat(trade.price).toFixed(4)}</td>
                                            <td className={parseFloat(trade.pnl) >= 0 ? 'text-success' : 'text-danger'}>
                                                {trade.pnl ? `$${parseFloat(trade.pnl).toFixed(2)}` : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredTrades.length === 0 && <tr><td colSpan="5">No trades found</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* AI Decisions */}
                    <div className="card">
                        <div className="card-title"><Brain size={16} style={{ display: 'inline', marginRight: 8 }} /> AI Thoughts</div>
                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {decisions.slice().reverse().map((d, i) => (
                                <div key={i} style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                        <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>{d.coin}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{format(parseISO(d.timestamp), 'HH:mm:ss')}</span>
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                        {d.reasoning}
                                    </div>
                                </div>
                            ))}
                            {decisions.length === 0 && <div style={{ color: 'var(--text-secondary)' }}>Waiting for AI...</div>}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
