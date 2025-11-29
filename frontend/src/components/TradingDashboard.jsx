import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { TrendingUp, TrendingDown, AlertTriangle, XCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../api';
import './TradingDashboard.css';

/**
 * Professional Trading Dashboard
 * Single unified view with critical trading data
 */
const TradingDashboard = () => {
    // State management
    const [status, setStatus] = useState(null);
    const [openPositions, setOpenPositions] = useState([]);
    const [executedOrders, setExecutedOrders] = useState([]);
    const [decisions, setDecisions] = useState([]);
    const [indicators, setIndicators] = useState([]);
    const [equityHistory, setEquityHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [closingPosition, setClosingPosition] = useState(null);

    // Fetch all critical data
    const fetchData = async () => {
        try {
            const [
                statusData,
                openPositionsData,
                executedOrdersData,
                decisionsData,
                indicatorsData,
                equityHistoryData
            ] = await Promise.all([
                api.getStatus(),
                api.getDetailedPositions(),
                api.getExecutedOrders(20),
                api.getDecisions(10),
                api.getIndicators(),
                api.getEquityHistory(100)
            ]);

            setStatus(statusData);
            setOpenPositions(openPositionsData);
            setExecutedOrders(executedOrdersData);
            setDecisions(decisionsData);
            setIndicators(indicatorsData);
            setEquityHistory(equityHistoryData);
            setError(null);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Erro ao carregar dados. Tentando reconectar...');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 3000); // Update every 3s
        return () => clearInterval(interval);
    }, []);

    // Close position handler
    const handleClosePosition = async (coin, side) => {
        if (!window.confirm(`Confirmar fechamento da posição ${coin} ${side}?`)) {
            return;
        }

        const positionKey = `${coin}-${side}`;
        setClosingPosition(positionKey);

        try {
            const result = await api.closePosition(coin, side);

            if (result.status === 'success') {
                // Refresh data immediately
                await fetchData();
            } else {
                throw new Error(result.message || 'Erro ao fechar posição');
            }
        } catch (err) {
            console.error('Error closing position:', err);
            alert(`Erro ao fechar posição: ${err.message}`);
        } finally {
            setClosingPosition(null);
        }
    };

    if (loading) {
        return (
            <div className="td-loading">
                <div className="td-spinner"></div>
                <p>Carregando dados de trading...</p>
            </div>
        );
    }

    // Calculate critical metrics
    const equity = status ? parseFloat(status.total_equity) : 0;
    const initialBalance = status ? parseFloat(status.initial_balance || 10000) : 10000;
    const totalReturn = equity - initialBalance;
    const returnPct = status ? parseFloat(status.total_return_pct) : 0;
    const isProfit = totalReturn >= 0;

    // Calculate total unrealized PnL from open positions
    const totalUnrealizedPnL = openPositions.reduce((sum, pos) => {
        return sum + parseFloat(pos.unrealized_pnl || 0);
    }, 0);

    // Calculate realized PnL from executed orders
    const totalRealizedPnL = executedOrders.reduce((sum, order) => {
        return sum + parseFloat(order.pnl || 0);
    }, 0);

    return (
        <div className="td-container">
            {/* Error Banner */}
            {error && (
                <div className="td-error-banner">
                    <AlertTriangle size={16} />
                    {error}
                </div>
            )}

            {/* Portfolio Overview - Consolidated Header */}
            <section className="td-header-bar">
                <div className="td-header-primary">
                    <div className="td-header-label">Patrimônio Total</div>
                    <div className="td-header-value">
                        ${equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>

                <div className="td-header-divider"></div>

                <div className="td-header-item">
                    <div className="td-header-label">Retorno Total</div>
                    <div className={`td-header-value ${isProfit ? 'td-positive' : 'td-negative'}`}>
                        {isProfit ? '+' : ''}${totalReturn.toFixed(2)}
                        <span className="td-header-sub">({returnPct.toFixed(2)}%)</span>
                    </div>
                </div>

                <div className="td-header-divider"></div>

                <div className="td-header-item">
                    <div className="td-header-label">PnL Não Realizado</div>
                    <div className={`td-header-value ${totalUnrealizedPnL >= 0 ? 'td-positive' : 'td-negative'}`}>
                        {totalUnrealizedPnL >= 0 ? '+' : ''}${totalUnrealizedPnL.toFixed(2)}
                    </div>
                </div>

                <div className="td-header-divider"></div>

                <div className="td-header-item">
                    <div className="td-header-label">PnL Realizado</div>
                    <div className={`td-header-value ${totalRealizedPnL >= 0 ? 'td-positive' : 'td-negative'}`}>
                        {totalRealizedPnL >= 0 ? '+' : ''}${totalRealizedPnL.toFixed(2)}
                    </div>
                </div>
            </section>

            {/* Main Content Grid */}
            <div className="td-grid">
                {/* Left Column */}
                <div className="td-column">
                    {/* Equity Chart */}
                    <section className="td-section td-compact">
                        <div className="td-section-header">
                            <h2>Patrimônio ao Longo do Tempo</h2>
                            <span className="td-count">{equityHistory.length}</span>
                        </div>

                        {equityHistory.length > 0 ? (
                            <div className="td-chart-container">
                                <ResponsiveContainer width="100%" height={250}>
                                    <AreaChart data={equityHistory}>
                                        <defs>
                                            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#00D4AA" stopOpacity={0.3} />
                                                <stop offset="100%" stopColor="#00D4AA" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis
                                            dataKey="timestamp"
                                            tickFormatter={(time) => format(parseISO(time), 'HH:mm')}
                                            stroke="#5E6673"
                                            style={{ fontSize: 10 }}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            stroke="#5E6673"
                                            style={{ fontSize: 10 }}
                                            tickFormatter={(value) => `$${value.toFixed(0)}`}
                                            tickLine={false}
                                            domain={['auto', 'auto']}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                background: '#1A1F2E',
                                                border: '1px solid #2B3139',
                                                borderRadius: '6px',
                                                fontSize: '11px'
                                            }}
                                            labelFormatter={(time) => format(parseISO(time), 'dd/MM HH:mm:ss')}
                                            formatter={(value) => [`$${parseFloat(value).toFixed(2)}`, 'Patrimônio']}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="total_equity"
                                            stroke="#00D4AA"
                                            strokeWidth={2}
                                            fill="url(#equityGradient)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="td-empty td-empty-sm">Nenhum dado de patrimônio disponível</div>
                        )}
                    </section>

                    {/* Technical Indicators */}
                    <section className="td-section td-compact">
                        <div className="td-section-header">
                            <h2>Indicadores Técnicos</h2>
                        </div>

                        {indicators.length > 0 ? (
                            <table className="td-table td-table-sm">
                                <thead>
                                    <tr>
                                        <th>Ativo</th>
                                        <th className="td-align-right">Preço</th>
                                        <th className="td-align-right">RSI</th>
                                        <th className="td-align-right">MACD</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {indicators.map((ind, i) => {
                                        const rsi = parseFloat(ind.rsi);
                                        const macd = parseFloat(ind.macd_hist);
                                        const price = parseFloat(ind.price);

                                        return (
                                            <tr key={i}>
                                                <td className="td-coin">{ind.symbol}</td>
                                                <td className="td-align-right td-mono td-text-sm">${price.toFixed(2)}</td>
                                                <td className={`td-align-right td-mono td-text-sm ${
                                                    rsi > 70 ? 'td-negative' : rsi < 30 ? 'td-positive' : ''
                                                }`}>
                                                    {rsi.toFixed(1)}
                                                </td>
                                                <td className={`td-align-right td-mono td-text-sm ${
                                                    macd > 0 ? 'td-positive' : 'td-negative'
                                                }`}>
                                                    {macd.toFixed(4)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <div className="td-empty td-empty-sm">Nenhum indicador disponível</div>
                        )}
                    </section>
                </div>

                {/* Right Column */}
                <div className="td-column">
                    {/* Executed Orders */}
                    <section className="td-section td-compact">
                        <div className="td-section-header">
                            <h2>Ordens Executadas</h2>
                            <span className="td-count">{executedOrders.length}</span>
                        </div>

                        {executedOrders.length > 0 ? (
                            <table className="td-table td-table-sm">
                                <thead>
                                    <tr>
                                        <th>Horário</th>
                                        <th>Ativo</th>
                                        <th>Lado</th>
                                        <th className="td-align-right">Qtd</th>
                                        <th className="td-align-right">Preço</th>
                                        <th className="td-align-right">PnL</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {executedOrders.slice(0, 10).map((order, i) => {
                                        const pnl = parseFloat(order.pnl || 0);
                                        const isProfitable = pnl >= 0;
                                        const quantity = parseFloat(order.quantity);
                                        const price = parseFloat(order.price);

                                        return (
                                            <tr key={i}>
                                                <td className="td-time td-text-xs">
                                                    {format(parseISO(order.timestamp), 'dd/MM HH:mm')}
                                                </td>
                                                <td className="td-coin td-text-sm">{order.coin}</td>
                                                <td>
                                                    <span className={`td-badge td-badge-xs ${order.side === 'long' ? 'td-badge-long' : 'td-badge-short'}`}>
                                                        {order.side === 'long' ? 'L' : 'S'}
                                                    </span>
                                                </td>
                                                <td className="td-align-right td-mono td-text-xs">{quantity.toFixed(4)}</td>
                                                <td className="td-align-right td-mono td-text-sm">${price.toFixed(2)}</td>
                                                <td className={`td-align-right td-mono td-text-sm ${isProfitable ? 'td-positive' : 'td-negative'}`}>
                                                    ${pnl.toFixed(2)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <div className="td-empty td-empty-sm">Nenhuma ordem executada</div>
                        )}
                    </section>

                    {/* AI Decisions */}
                    <section className="td-section td-compact">
                        <div className="td-section-header">
                            <h2>Decisões da IA</h2>
                            <span className="td-count">{decisions.length}</span>
                        </div>

                        {decisions.length > 0 ? (
                            <table className="td-table td-table-sm">
                                <thead>
                                    <tr>
                                        <th>Data/Hora</th>
                                        <th>Ativo</th>
                                        <th>Sinal</th>
                                        <th>Lado</th>
                                        <th className="td-align-right">Qtd</th>
                                        <th className="td-align-right">Alav.</th>
                                        <th className="td-align-right">SL</th>
                                        <th className="td-align-right">TP</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {decisions.slice(0, 15).map((decision, i) => {
                                        const signal = decision.signal?.toLowerCase();
                                        const isEntry = signal === 'entry';
                                        const isClose = signal === 'close';
                                        const side = decision.side?.toLowerCase();

                                        return (
                                            <tr key={i}>
                                                <td className="td-time td-text-xs">
                                                    {format(parseISO(decision.timestamp), 'dd/MM HH:mm')}
                                                </td>
                                                <td className="td-coin td-text-sm">{decision.coin || '-'}</td>
                                                <td>
                                                    <span className={`td-badge td-badge-xs ${isEntry ? 'td-badge-long' : isClose ? 'td-badge-short' : 'td-badge-hold'}`}>
                                                        {isEntry ? 'ENTRY' : isClose ? 'CLOSE' : 'HOLD'}
                                                    </span>
                                                </td>
                                                <td>
                                                    {side ? (
                                                        <span className={`td-badge td-badge-xs ${side === 'long' ? 'td-badge-long' : 'td-badge-short'}`}>
                                                            {side === 'long' ? 'L' : 'S'}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td className="td-align-right td-mono td-text-xs">
                                                    {decision.quantity ? parseFloat(decision.quantity).toFixed(4) : '-'}
                                                </td>
                                                <td className="td-align-right td-mono td-text-xs">
                                                    {decision.leverage ? `${decision.leverage}x` : '-'}
                                                </td>
                                                <td className="td-align-right td-mono td-text-xs td-negative">
                                                    {decision.stop_loss ? `$${parseFloat(decision.stop_loss).toFixed(2)}` : '-'}
                                                </td>
                                                <td className="td-align-right td-mono td-text-xs td-positive">
                                                    {decision.take_profit ? `$${parseFloat(decision.take_profit).toFixed(2)}` : '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <div className="td-empty td-empty-sm">Nenhuma decisão recente</div>
                        )}

                        {/* Reasoning section for latest decision */}
                        {decisions.length > 0 && decisions[0].reasoning && (
                            <div className="td-reasoning-box">
                                <div className="td-reasoning-label">Último raciocínio:</div>
                                <div className="td-reasoning-text">{decisions[0].reasoning}</div>
                            </div>
                        )}
                    </section>
                </div>
            </div>

            {/* Footer with last update */}
            <div className="td-footer">
                Última atualização: {status ? format(parseISO(status.timestamp), 'dd/MM/yyyy HH:mm:ss') : '--'}
            </div>
        </div>
    );
};

export default TradingDashboard;
