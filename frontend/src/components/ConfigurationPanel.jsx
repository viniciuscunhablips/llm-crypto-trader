import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Settings, Save, RotateCcw, History, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../api';
import './ConfigurationPanel.css';

/**
 * Configuration Panel with Versioning
 * Professional settings management for trading bot
 */
const ConfigurationPanel = () => {
    // State management
    const [config, setConfig] = useState({
        symbols: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'],
        interval: '3m',
        check_interval: 180,
        initial_balance: 10000,
        testnet: true,
        stop_loss_pct: 5.0,
        take_profit_pct: 5.0,
        max_positions: 3,
        risk_per_trade: 2.0,
        leverage: 1.0,
        system_prompt: ''
    });

    const [versions, setVersions] = useState([]);
    const [currentVersion, setCurrentVersion] = useState(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCurrentConfig();
        fetchVersions();
    }, []);

    const fetchCurrentConfig = async () => {
        try {
            const data = await api.getCurrentConfig();
            setConfig(data);
            setCurrentVersion(data.version);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching config:', err);
            setMessage({ type: 'error', text: 'Erro ao carregar configuração' });
            setLoading(false);
        }
    };

    const fetchVersions = async () => {
        try {
            const data = await api.getConfigVersions();
            setVersions(data);
        } catch (err) {
            console.error('Error fetching versions:', err);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);

        try {
            const result = await api.saveConfig(config);
            setCurrentVersion(result.version);
            setMessage({ type: 'success', text: `Configuração salva (v${result.version})` });
            await fetchVersions();
        } catch (err) {
            console.error('Error saving config:', err);
            setMessage({ type: 'error', text: 'Erro ao salvar configuração' });
        } finally {
            setSaving(false);
        }
    };

    const handleRestore = async (version) => {
        if (!window.confirm(`Restaurar configuração da versão ${version}?`)) {
            return;
        }

        try {
            const data = await api.restoreConfigVersion(version);
            setConfig(data);
            setCurrentVersion(version);
            setMessage({ type: 'success', text: `Configuração v${version} restaurada` });
        } catch (err) {
            console.error('Error restoring config:', err);
            setMessage({ type: 'error', text: 'Erro ao restaurar configuração' });
        }
    };

    const handleReset = () => {
        if (!window.confirm('Resetar todas as configurações para os valores padrão?')) {
            return;
        }

        setConfig({
            symbols: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'],
            interval: '3m',
            check_interval: 180,
            initial_balance: 10000,
            testnet: true,
            stop_loss_pct: 5.0,
            take_profit_pct: 5.0,
            max_positions: 3,
            risk_per_trade: 2.0,
            leverage: 1.0,
            system_prompt: ''
        });
        setMessage({ type: 'success', text: 'Configurações resetadas' });
    };

    const updateField = (field, value) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    const addSymbol = () => {
        const symbol = prompt('Digite o símbolo (ex: ADAUSDT):');
        if (symbol && symbol.trim()) {
            const upperSymbol = symbol.trim().toUpperCase();
            if (!config.symbols.includes(upperSymbol)) {
                updateField('symbols', [...config.symbols, upperSymbol]);
            }
        }
    };

    const removeSymbol = (symbol) => {
        updateField('symbols', config.symbols.filter(s => s !== symbol));
    };

    if (loading) {
        return (
            <div className="cp-loading">
                <div className="cp-spinner"></div>
                <p>Carregando configurações...</p>
            </div>
        );
    }

    return (
        <div className="cp-container">
            {/* Header */}
            <div className="cp-header">
                <div className="cp-header-left">
                    <Settings size={24} />
                    <div>
                        <h1>Configurações da Estratégia</h1>
                        <p className="cp-subtitle">
                            Versão atual: <span className="cp-version">v{currentVersion || '1.0'}</span>
                        </p>
                    </div>
                </div>
                <div className="cp-header-actions">
                    <button onClick={handleReset} className="cp-btn cp-btn-secondary">
                        <RotateCcw size={16} />
                        Resetar
                    </button>
                    <button onClick={handleSave} disabled={saving} className="cp-btn cp-btn-primary">
                        <Save size={16} />
                        {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </div>

            {/* Message Banner */}
            {message && (
                <div className={`cp-message cp-message-${message.type}`}>
                    {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {message.text}
                </div>
            )}

            {/* Main Content */}
            <div className="cp-grid">
                {/* Left Column - Configuration */}
                <div className="cp-column">
                    {/* Trading Pairs */}
                    <section className="cp-section">
                        <h2>Pares de Trading</h2>
                        <div className="cp-symbols">
                            {config.symbols.map((symbol, i) => (
                                <div key={i} className="cp-symbol-tag">
                                    {symbol}
                                    <button onClick={() => removeSymbol(symbol)} className="cp-symbol-remove">
                                        ×
                                    </button>
                                </div>
                            ))}
                            <button onClick={addSymbol} className="cp-symbol-add">
                                + Adicionar
                            </button>
                        </div>
                    </section>

                    {/* Timing Settings */}
                    <section className="cp-section">
                        <h2>Configurações de Tempo</h2>
                        <div className="cp-field">
                            <label>Intervalo de Candles</label>
                            <select
                                value={config.interval}
                                onChange={(e) => updateField('interval', e.target.value)}
                                className="cp-input"
                            >
                                <option value="1m">1 minuto</option>
                                <option value="3m">3 minutos</option>
                                <option value="5m">5 minutos</option>
                                <option value="15m">15 minutos</option>
                                <option value="30m">30 minutos</option>
                                <option value="1h">1 hora</option>
                                <option value="4h">4 horas</option>
                            </select>
                        </div>
                        <div className="cp-field">
                            <label>Intervalo de Verificação (segundos)</label>
                            <input
                                type="number"
                                value={config.check_interval}
                                onChange={(e) => updateField('check_interval', parseInt(e.target.value))}
                                className="cp-input"
                                min="60"
                                step="30"
                            />
                        </div>
                    </section>

                    {/* Risk Management */}
                    <section className="cp-section">
                        <h2>Gestão de Risco</h2>
                        <div className="cp-field">
                            <label>Stop Loss (%)</label>
                            <input
                                type="number"
                                value={config.stop_loss_pct}
                                onChange={(e) => updateField('stop_loss_pct', parseFloat(e.target.value))}
                                className="cp-input"
                                min="0.1"
                                max="20"
                                step="0.1"
                            />
                        </div>
                        <div className="cp-field">
                            <label>Take Profit (%)</label>
                            <input
                                type="number"
                                value={config.take_profit_pct}
                                onChange={(e) => updateField('take_profit_pct', parseFloat(e.target.value))}
                                className="cp-input"
                                min="0.1"
                                max="50"
                                step="0.1"
                            />
                        </div>
                        <div className="cp-field">
                            <label>Risco por Trade (%)</label>
                            <input
                                type="number"
                                value={config.risk_per_trade}
                                onChange={(e) => updateField('risk_per_trade', parseFloat(e.target.value))}
                                className="cp-input"
                                min="0.5"
                                max="10"
                                step="0.5"
                            />
                        </div>
                        <div className="cp-field">
                            <label>Máximo de Posições Simultâneas</label>
                            <input
                                type="number"
                                value={config.max_positions}
                                onChange={(e) => updateField('max_positions', parseInt(e.target.value))}
                                className="cp-input"
                                min="1"
                                max="10"
                            />
                        </div>
                        <div className="cp-field">
                            <label>Alavancagem</label>
                            <input
                                type="number"
                                value={config.leverage}
                                onChange={(e) => updateField('leverage', parseFloat(e.target.value))}
                                className="cp-input"
                                min="1"
                                max="10"
                                step="0.5"
                            />
                        </div>
                    </section>

                    {/* Account Settings */}
                    <section className="cp-section">
                        <h2>Configurações da Conta</h2>
                        <div className="cp-field">
                            <label>Saldo Inicial (USDT)</label>
                            <input
                                type="number"
                                value={config.initial_balance}
                                onChange={(e) => updateField('initial_balance', parseFloat(e.target.value))}
                                className="cp-input"
                                min="100"
                                step="100"
                            />
                        </div>
                        <div className="cp-field cp-field-checkbox">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={config.testnet}
                                    onChange={(e) => updateField('testnet', e.target.checked)}
                                />
                                <span>Modo Testnet</span>
                            </label>
                            <p className="cp-hint">Usar rede de testes da Binance</p>
                        </div>
                    </section>

                    {/* AI Prompt */}
                    <section className="cp-section">
                        <h2>Prompt do Sistema (IA)</h2>
                        <textarea
                            value={config.system_prompt}
                            onChange={(e) => updateField('system_prompt', e.target.value)}
                            className="cp-textarea"
                            rows="8"
                            placeholder="Instruções personalizadas para o modelo de IA..."
                        />
                    </section>
                </div>

                {/* Right Column - Version History */}
                <div className="cp-column cp-column-history">
                    <section className="cp-section">
                        <div className="cp-section-header">
                            <h2><History size={18} /> Histórico de Versões</h2>
                            <span className="cp-count">{versions.length}</span>
                        </div>

                        {versions.length > 0 ? (
                            <div className="cp-versions">
                                {versions.map((version, i) => (
                                    <div key={i} className={`cp-version-item ${version.version === currentVersion ? 'cp-version-current' : ''}`}>
                                        <div className="cp-version-header">
                                            <span className="cp-version-number">v{version.version}</span>
                                            {version.version === currentVersion && (
                                                <span className="cp-version-badge">Atual</span>
                                            )}
                                        </div>
                                        <div className="cp-version-date">
                                            {format(parseISO(version.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                                        </div>
                                        <div className="cp-version-summary">
                                            <div className="cp-version-detail">Pares: {version.config.symbols.length}</div>
                                            <div className="cp-version-detail">Intervalo: {version.config.interval}</div>
                                            <div className="cp-version-detail">SL: {version.config.stop_loss_pct}%</div>
                                            <div className="cp-version-detail">TP: {version.config.take_profit_pct}%</div>
                                        </div>
                                        {version.version !== currentVersion && (
                                            <button
                                                onClick={() => handleRestore(version.version)}
                                                className="cp-version-restore"
                                            >
                                                Restaurar
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="cp-empty">Nenhuma versão salva</div>
                        )}
                    </section>

                    {/* Strategy Summary */}
                    <section className="cp-section cp-strategy-summary">
                        <h2>Resumo da Estratégia Atual</h2>
                        <div className="cp-summary-grid">
                            <div className="cp-summary-item">
                                <div className="cp-summary-label">Indicadores</div>
                                <div className="cp-summary-value">EMA20, RSI14, MACD</div>
                            </div>
                            <div className="cp-summary-item">
                                <div className="cp-summary-label">Decisões</div>
                                <div className="cp-summary-value">IA (Gemini)</div>
                            </div>
                            <div className="cp-summary-item">
                                <div className="cp-summary-label">Modo</div>
                                <div className="cp-summary-value">{config.testnet ? 'Testnet' : 'Produção'}</div>
                            </div>
                            <div className="cp-summary-item">
                                <div className="cp-summary-label">Alavancagem</div>
                                <div className="cp-summary-value">{config.leverage}x</div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default ConfigurationPanel;
