const API_URL = 'http://localhost:8000/api';

export const api = {
    async getStatus() {
        const res = await fetch(`${API_URL}/status`);
        return res.json();
    },
    async getTrades(limit = 50) {
        const res = await fetch(`${API_URL}/trades?limit=${limit}`);
        return res.json();
    },
    async getPositions() {
        const res = await fetch(`${API_URL}/positions`);
        return res.json();
    },
    async getDecisions(limit = 20) {
        const res = await fetch(`${API_URL}/decisions?limit=${limit}`);
        return res.json();
    },
    async getMarketOverview() {
        const res = await fetch(`${API_URL}/market_overview`);
        return res.json();
    },
    async getEquityHistory(limit = 500) {
        const res = await fetch(`${API_URL}/history/equity?limit=${limit}`);
        return res.json();
    },
    async getDailyTradeStats() {
        const res = await fetch(`${API_URL}/stats/daily_trades`);
        return res.json();
    },
    async getIndicators() {
        const res = await fetch(`${API_URL}/analytics/indicators`);
        return res.json();
    },
    async getPerformance() {
        const res = await fetch(`${API_URL}/analytics/performance`);
        return res.json();
    },
    async getRecentSnapshots(hours = 6) {
        const res = await fetch(`${API_URL}/market/snapshots/recent?hours=${hours}`);
        return res.json();
    },
    async getOpenOrders(limit = 50) {
        const res = await fetch(`${API_URL}/orders/open?limit=${limit}`);
        return res.json();
    },
    async getDetailedPositions() {
        const res = await fetch(`${API_URL}/positions/detailed`);
        return res.json();
    },
    async getExecutedOrders(limit = 50) {
        const res = await fetch(`${API_URL}/orders/executed?limit=${limit}`);
        return res.json();
    },
    async closePosition(coin, side) {
        const res = await fetch(`${API_URL}/orders/close?coin=${coin}&side=${side}`, {
            method: 'POST'
        });
        return res.json();
    },

    // Configuration endpoints
    async getCurrentConfig() {
        const res = await fetch(`${API_URL}/config/current`);
        return res.json();
    },
    async getConfigVersions() {
        const res = await fetch(`${API_URL}/config/versions`);
        return res.json();
    },
    async saveConfig(config) {
        const res = await fetch(`${API_URL}/config/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        return res.json();
    },
    async restoreConfigVersion(version) {
        const res = await fetch(`${API_URL}/config/restore/${version}`, {
            method: 'POST'
        });
        return res.json();
    }
};
