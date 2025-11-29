import React, { useEffect, useState, useRef } from 'react';
import { api } from '../api';
import { Line, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Activity, Terminal, Cpu, Zap, Clock, TrendingUp, ShieldCheck, BarChart2, Wallet } from 'lucide-react';
import { format, parseISO } from 'date-fns';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const DashboardPro = () => {
    const [status, setStatus] = useState(null);
    const [trades, setTrades] = useState([]);
    const [decisions, setDecisions] = useState([]);
    const [equityHistory, setEquityHistory] = useState([]);
    const [indicators, setIndicators] = useState([]);
    const [performance, setPerformance] = useState(null);
    const [marketSnapshots, setMarketSnapshots] = useState([]);
    const [positions, setPositions] = useState([]);
    const [detailedPositions, setDetailedPositions] = useState([]);
    const [openOrders, setOpenOrders] = useState([]);
    const [executedOrders, setExecutedOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [closingPosition, setClosingPosition] = useState(null);
    const terminalContainerRef = useRef(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statusData, tradesData, decisionsData, equityData, indicatorsData, performanceData, snapshotsData, positionsData, detailedPositionsData, openOrdersData, executedOrdersData] = await Promise.all([
                    api.getStatus(),
                    api.getTrades(50),
                    api.getDecisions(50),
                    api.getEquityHistory(200),
                    api.getIndicators(),
                    api.getPerformance(),
                    api.getRecentSnapshots(6),
                    api.getPositions(),
                    api.getDetailedPositions(),
                    api.getOpenOrders(20),
                    api.getExecutedOrders(20)
                ]);
                setStatus(statusData);
                setTrades(tradesData);
                setDecisions(decisionsData);
                setEquityHistory(equityData);
                setIndicators(indicatorsData);
                setPerformance(performanceData);
                setMarketSnapshots(snapshotsData);
                setPositions(positionsData);
                setDetailedPositions(detailedPositionsData);
                setOpenOrders(openOrdersData);
                setExecutedOrders(executedOrdersData);
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

    useEffect(() => {
        if (terminalContainerRef.current) {
            terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
        }
    }, [decisions]);

    const handleClosePosition = async (coin, side) => {
        if (!confirm(`Tem certeza que deseja fechar a posição ${coin} ${side}?`)) {
            return;
        }

        setClosingPosition(`${coin}-${side}`);
        try {
            await api.closePosition(coin, side);
            // Refresh data after closing
            const [openOrdersData, executedOrdersData, detailedPositionsData] = await Promise.all([
                api.getOpenOrders(20),
                api.getExecutedOrders(20),
                api.getDetailedPositions()
            ]);
            setOpenOrders(openOrdersData);
            setExecutedOrders(executedOrdersData);
            setDetailedPositions(detailedPositionsData);
        } catch (error) {
            console.error("Failed to close position", error);
            alert("Erro ao fechar posição: " + error.message);
        } finally {
            setClosingPosition(null);
        }
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#5E6673' }}>INITIALIZING SYSTEM...</div>;

    const equity = status ? parseFloat(status.total_equity) : 0;
    const balance = status ? parseFloat(status.total_balance) : 0;
    const returnPct = status ? parseFloat(status.total_return_pct) : 0;
    const isPositive = returnPct >= 0;

    const areaChartData = {
        labels: equityHistory.map(d => format(parseISO(d.timestamp), 'HH:mm')),
        datasets: [{
            label: 'Equity',
            data: equityHistory.map(d => d.equity),
            borderColor: isPositive ? '#0ECB81' : '#F6465D',
            backgroundColor: (context) => {
                const ctx = context.chart.ctx;
                const gradient = ctx.createLinearGradient(0, 0, 0, 200);
                gradient.addColorStop(0, isPositive ? 'rgba(14, 203, 129, 0.2)' : 'rgba(246, 70, 93, 0.2)');
                gradient.addColorStop(1, 'rgba(0,0,0,0)');
                return gradient;
            },
            fill: true,
            tension: 0.2,
            pointRadius: 0,
            borderWidth: 2,
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: '#151A21',
                titleColor: '#848E9C',
                bodyColor: '#EAECEF',
                borderColor: '#2B3139',
                borderWidth: 1,
                titleFont: { family: 'JetBrains Mono' },
                bodyFont: { family: 'JetBrains Mono' }
            }
        },
        scales: {
            x: { display: false },
            y: {
                position: 'right',
                grid: { color: '#2B3139', drawBorder: false },
                ticks: { color: '#5E6673', font: { family: 'JetBrains Mono', size: 10 } }
            }
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        },
        animation: false
    };

    return (
        <div className="pro-layout">
            <header className="pro-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <ShieldCheck size={20} className="text-green" />
                    <span style={{ fontWeight: 700, letterSpacing: '0.05em' }}>ALPHA ARENA <span className="text-secondary">PRO</span></span>
                </div>

                <div style={{ display: 'flex', gap: 32 }}>
                    <div>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Net Liquidation Value</div>
                        <div className="font-mono" style={{ fontSize: 18, fontWeight: 600 }}>
                            ${equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>24h Change</div>
                        <div className={`font-mono ${isPositive ? 'text-green' : 'text-red'}`} style={{ fontSize: 18, fontWeight: 600 }}>
                            {returnPct > 0 ? '+' : ''}{returnPct.toFixed(2)}%
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>System Status</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#0ECB81' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#0ECB81', boxShadow: '0 0 8px #0ECB81' }}></div>
                            OPERATIONAL
                        </div>
                    </div>
                </div>
            </header>

            <div className="pro-grid">

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div className="pro-panel" style={{ flex: 1 }}>
                        <div className="panel-header">
                            <span><BarChart2 size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Technical Scanner</span>
                        </div>
                        <div className="panel-content">
                            <table className="pro-table">
                                <thead>
                                    <tr>
                                        <th>Sym</th>
                                        <th>Price</th>
                                        <th>RSI</th>
                                        <th>MACD</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {indicators.map((ind, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 600 }}>{ind.symbol}</td>
                                            <td>{parseFloat(ind.price).toFixed(2)}</td>
                                            <td className={ind.rsi > 70 ? 'text-red' : ind.rsi < 30 ? 'text-green' : 'text-secondary'}>
                                                {parseFloat(ind.rsi).toFixed(1)}
                                            </td>
                                            <td className={ind.macd_hist > 0 ? 'text-green' : 'text-red'}>
                                                {parseFloat(ind.macd_hist).toFixed(4)}
                                            </td>
                                        </tr>
                                    ))}
                                    {indicators.length === 0 && (
                                        <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>SCANNING MARKET...</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="pro-panel" style={{ flex: 1 }}>
                        <div className="panel-header">
                            <span><Clock size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Trade Feed</span>
                        </div>
                        <div className="panel-content">
                            <table className="pro-table">
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>Sym</th>
                                        <th>Side</th>
                                        <th>Price</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {trades.slice().reverse().map((t, i) => (
                                        <tr key={i}>
                                            <td style={{ color: 'var(--text-muted)' }}>{format(parseISO(t.timestamp), 'HH:mm:ss')}</td>
                                            <td>{t.coin}</td>
                                            <td className={t.side === 'long' ? 'text-green' : 'text-red'}>{t.side.toUpperCase()}</td>
                                            <td>{parseFloat(t.price).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div className="pro-panel" style={{ height: 220 }}>
                        <div className="panel-header">
                            <span><TrendingUp size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Equity Curve</span>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <span style={{ fontSize: 10, padding: '2px 6px', backgroundColor: 'var(--accent-blue)', color: 'white', borderRadius: 2 }}>1D</span>
                            </div>
                        </div>
                        <div className="panel-content" style={{ padding: 16 }}>
                            <Line data={areaChartData} options={chartOptions} />
                        </div>
                    </div>

                    <div className="pro-panel" style={{ flex: 1 }}>
                        <div className="panel-header">
                            <span><Wallet size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Ordens Abertas</span>
                        </div>
                        <div className="panel-content">
                            <table className="pro-table">
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>Coin</th>
                                        <th>Side</th>
                                        <th>Qty</th>
                                        <th>Price</th>
                                        <th>Ação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {openOrders.slice(0, 10).map((order, i) => {
                                        const isClosing = closingPosition === `${order.coin}-${order.side}`;
                                        return (
                                            <tr key={i}>
                                                <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{format(parseISO(order.timestamp), 'HH:mm:ss')}</td>
                                                <td style={{ fontWeight: 600 }}>{order.coin}</td>
                                                <td className={order.side === 'long' ? 'text-green' : 'text-red'}>{order.side?.toUpperCase()}</td>
                                                <td>{parseFloat(order.quantity).toFixed(4)}</td>
                                                <td>${parseFloat(order.price).toFixed(2)}</td>
                                                <td>
                                                    <button
                                                        onClick={() => handleClosePosition(order.coin, order.side)}
                                                        disabled={isClosing}
                                                        style={{
                                                            background: isClosing ? '#2B3139' : '#F6465D',
                                                            color: 'white',
                                                            border: 'none',
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '10px',
                                                            cursor: isClosing ? 'not-allowed' : 'pointer',
                                                            fontWeight: 600,
                                                            textTransform: 'uppercase',
                                                            opacity: isClosing ? 0.5 : 1
                                                        }}
                                                    >
                                                        {isClosing ? 'Fechando...' : 'Fechar'}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {openOrders.length === 0 && (
                                        <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>NO OPEN ORDERS</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="pro-panel" style={{ flex: 1 }}>
                        <div className="panel-header">
                            <span><Wallet size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Posições Detalhadas</span>
                        </div>
                        <div className="panel-content">
                            <table className="pro-table">
                                <thead>
                                    <tr>
                                        <th>Coin</th>
                                        <th>Side</th>
                                        <th>Entry</th>
                                        <th>Current</th>
                                        <th>PnL %</th>
                                        <th>PnL $</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {detailedPositions.length > 0 ? detailedPositions.map((pos, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 600 }}>{pos.coin}</td>
                                            <td className={pos.side === 'long' ? 'text-green' : 'text-red'}>{pos.side?.toUpperCase()}</td>
                                            <td>${parseFloat(pos.entry_price).toFixed(2)}</td>
                                            <td>${parseFloat(pos.current_price).toFixed(2)}</td>
                                            <td className={pos.pnl_pct >= 0 ? 'text-green' : 'text-red'} style={{ fontWeight: 600 }}>
                                                {pos.pnl_pct > 0 ? '+' : ''}{pos.pnl_pct}%
                                            </td>
                                            <td className={pos.unrealized_pnl >= 0 ? 'text-green' : 'text-red'}>
                                                ${parseFloat(pos.unrealized_pnl).toFixed(2)}
                                            </td>
                                        </tr>
                                    )) : positions.map((pos, i) => {
                                        const entryPrice = parseFloat(pos.entry_price);
                                        const currentPrice = parseFloat(pos.current_price || pos.entry_price);
                                        const pnlPct = pos.side === 'long'
                                            ? ((currentPrice - entryPrice) / entryPrice) * 100
                                            : ((entryPrice - currentPrice) / entryPrice) * 100;

                                        return (
                                            <tr key={i}>
                                                <td style={{ fontWeight: 600 }}>{pos.coin}</td>
                                                <td className={pos.side === 'long' ? 'text-green' : 'text-red'}>{pos.side?.toUpperCase()}</td>
                                                <td>${entryPrice.toFixed(2)}</td>
                                                <td>${currentPrice.toFixed(2)}</td>
                                                <td className={pnlPct >= 0 ? 'text-green' : 'text-red'} style={{ fontWeight: 600 }}>
                                                    {pnlPct > 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                                                </td>
                                                <td className={pos.unrealized_pnl >= 0 ? 'text-green' : 'text-red'}>
                                                    ${parseFloat(pos.unrealized_pnl).toFixed(2)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {positions.length === 0 && detailedPositions.length === 0 && (
                                        <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>NO ACTIVE POSITIONS</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="pro-panel" style={{ height: 200 }}>
                        <div className="panel-header" style={{ borderBottom: '1px solid var(--accent-yellow)' }}>
                            <span className="text-yellow"><Terminal size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} /> AI LOGIC STREAM</span>
                            <Cpu size={14} className="text-yellow animate-pulse" />
                        </div>
                        <div className="panel-content" ref={terminalContainerRef} style={{ backgroundColor: '#000', padding: 12, fontFamily: 'monospace' }}>
                            {decisions.slice().reverse().map((d, i) => (
                                <div key={i} className="terminal-line">
                                    <span style={{ color: '#5E6673' }}>[{format(parseISO(d.timestamp), 'HH:mm:ss')}]</span>{' '}
                                    <span style={{ color: '#3861FB' }}>{d.coin}</span>{' '}
                                    <span style={{ color: '#EAECEF' }}>{d.reasoning}</span>
                                </div>
                            ))}
                            <div className="terminal-line active">
                                <span className="text-yellow">_</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div className="pro-panel" style={{ flex: 1 }}>
                        <div className="panel-header">
                            <span><Zap size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Performance KPIs</span>
                        </div>
                        <div className="panel-content" style={{ padding: 16 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>WIN RATE</div>
                                    <div className={`font-mono ${performance?.win_rate >= 50 ? 'text-green' : 'text-red'}`} style={{ fontSize: 20 }}>
                                        {performance ? performance.win_rate : 0}%
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>PROFIT FACTOR</div>
                                    <div className="font-mono" style={{ fontSize: 20 }}>{performance ? performance.profit_factor : 0}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>MAX DRAWDOWN</div>
                                    <div className="font-mono text-red" style={{ fontSize: 20 }}>{performance ? performance.max_drawdown : 0}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>SHARPE RATIO</div>
                                    <div className="font-mono" style={{ fontSize: 20 }}>{performance ? performance.sharpe_ratio : 0}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>TOTAL TRADES</div>
                                    <div className="font-mono" style={{ fontSize: 20 }}>{performance ? performance.total_trades : 0}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pro-panel" style={{ flex: 1 }}>
                        <div className="panel-header">
                            <span><Wallet size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Ordens Executadas</span>
                        </div>
                        <div className="panel-content">
                            <table className="pro-table">
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>Coin</th>
                                        <th>Side</th>
                                        <th>Qty</th>
                                        <th>Price</th>
                                        <th>PnL</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {executedOrders.slice(0, 8).map((order, i) => {
                                        const pnl = parseFloat(order.pnl || 0);
                                        const isProfitable = pnl >= 0;
                                        return (
                                            <tr key={i}>
                                                <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{format(parseISO(order.timestamp), 'HH:mm:ss')}</td>
                                                <td style={{ fontWeight: 600 }}>{order.coin}</td>
                                                <td className={order.side === 'long' ? 'text-green' : 'text-red'}>{order.side?.toUpperCase()}</td>
                                                <td>{parseFloat(order.quantity).toFixed(4)}</td>
                                                <td>${parseFloat(order.price).toFixed(2)}</td>
                                                <td className={isProfitable ? 'text-green' : 'text-red'} style={{ fontWeight: 600 }}>
                                                    {isProfitable ? '+' : ''}${pnl.toFixed(2)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {executedOrders.length === 0 && (
                                        <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>NO EXECUTED ORDERS</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="pro-panel" style={{ flex: 1 }}>
                        <div className="panel-header">
                            <span><Wallet size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Posições Detalhadas</span>
                        </div>
                        <div className="panel-content">
                            <table className="pro-table">
                                <thead>
                                    <tr>
                                        <th>Coin</th>
                                        <th>Side</th>
                                        <th>Entry</th>
                                        <th>Current</th>
                                        <th>PnL %</th>
                                        <th>PnL $</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {detailedPositions.length > 0 ? detailedPositions.map((pos, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 600 }}>{pos.coin}</td>
                                            <td className={pos.side === 'long' ? 'text-green' : 'text-red'}>{pos.side?.toUpperCase()}</td>
                                            <td>${parseFloat(pos.entry_price).toFixed(2)}</td>
                                            <td>${parseFloat(pos.current_price).toFixed(2)}</td>
                                            <td className={pos.pnl_pct >= 0 ? 'text-green' : 'text-red'} style={{ fontWeight: 600 }}>
                                                {pos.pnl_pct > 0 ? '+' : ''}{pos.pnl_pct}%
                                            </td>
                                            <td className={pos.unrealized_pnl >= 0 ? 'text-green' : 'text-red'}>
                                                ${parseFloat(pos.unrealized_pnl).toFixed(2)}
                                            </td>
                                        </tr>
                                    )) : positions.map((pos, i) => {
                                        const entryPrice = parseFloat(pos.entry_price);
                                        const currentPrice = parseFloat(pos.current_price || pos.entry_price);
                                        const pnlPct = pos.side === 'long'
                                            ? ((currentPrice - entryPrice) / entryPrice) * 100
                                            : ((entryPrice - currentPrice) / entryPrice) * 100;

                                        return (
                                            <tr key={i}>
                                                <td style={{ fontWeight: 600 }}>{pos.coin}</td>
                                                <td className={pos.side === 'long' ? 'text-green' : 'text-red'}>{pos.side?.toUpperCase()}</td>
                                                <td>${entryPrice.toFixed(2)}</td>
                                                <td>${currentPrice.toFixed(2)}</td>
                                                <td className={pnlPct >= 0 ? 'text-green' : 'text-red'} style={{ fontWeight: 600 }}>
                                                    {pnlPct > 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                                                </td>
                                                <td className={pos.unrealized_pnl >= 0 ? 'text-green' : 'text-red'}>
                                                    ${parseFloat(pos.unrealized_pnl).toFixed(2)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {positions.length === 0 && detailedPositions.length === 0 && (
                                        <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>NO ACTIVE POSITIONS</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default DashboardPro;
