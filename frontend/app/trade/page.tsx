'use client';

import { useState, useMemo } from 'react';
import Sparkline from '@/components/Sparkline';
import Icon from '@/components/Icon';
import { useToast } from '@/components/ToastContext';
import { useWallet } from '@/components/WalletContext';
import { TOKENS, getChartData } from '@/lib/tokens';

const TIMEFRAMES = ['1D', '1M', '3M', '1Y', '5Y', 'All'];

const DEMO_ORDERS = [
  { type: 'Buy', asset: 'TSL2L', qty: 2.5, price: 43.10, amount: 107.75, status: 'Completed' },
  { type: 'Buy', asset: 'SOX3L', qty: 0.5, price: 152.00, amount: 76.00, status: 'Completed' },
  { type: 'Sell', asset: 'SPX3S', qty: 1.2, price: 32.50, amount: 39.00, status: 'Pending' },
  { type: 'Buy', asset: 'TSL1S', qty: 3.0, price: 29.80, amount: 89.40, status: 'Cancelled' },
  { type: 'Sell', asset: 'SOX3S', qty: 4.5, price: 13.10, amount: 58.95, status: 'Completed' },
];

const STATUS_COLORS: Record<string, string> = {
  Completed: '#38d39f',
  Pending: '#f7a23b',
  Cancelled: 'var(--text-mute)',
};

const ORDER_FILTERS = ['All orders', 'Completed', 'Pending', 'Cancelled'];

export default function TradePage() {
  const { wallet } = useWallet();
  const toast = useToast();

  const [selectedSym, setSelectedSym] = useState('TSL2L');
  const [side, setSide] = useState<'Buy' | 'Sell'>('Buy');
  const [tf, setTf] = useState('1D');
  const [amount, setAmount] = useState('');
  const [orderFilter, setOrderFilter] = useState('All orders');
  const [alerts, setAlerts] = useState<string[]>([]);
  const [alertInput, setAlertInput] = useState('');

  const token = useMemo(() => TOKENS.find((t) => t.sym === selectedSym) ?? TOKENS[0], [selectedSym]);
  const chartData = useMemo(() => getChartData(selectedSym), [selectedSym]);
  const isUp = token.direction === 'up';

  const filteredOrders = DEMO_ORDERS.filter(
    (o) => orderFilter === 'All orders' || o.status === orderFilter
  );

  const handleSubmit = () => {
    if (!amount || parseFloat(amount) < 5) {
      toast('Minimum order is 5 USDC');
      return;
    }
    if (!wallet) {
      toast('Connect wallet to trade');
      return;
    }
    toast(`Order submitted · ${amount} USDC → ${selectedSym}`);
    setAmount('');
  };

  const handleAddAlert = () => {
    if (!alertInput) return;
    const val = parseFloat(alertInput);
    if (isNaN(val) || val <= 0) return;
    setAlerts((prev) => [...prev, `$${val.toFixed(2)}`]);
    setAlertInput('');
    toast(`Price alert set at $${val.toFixed(2)}`);
  };

  return (
    <div className="page fade-in">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
        {/* ── Left column ── */}
        <div>
          {/* Asset selector */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                  Asset
                </label>
                <select
                  className="input"
                  value={selectedSym}
                  onChange={(e) => setSelectedSym(e.target.value)}
                >
                  {TOKENS.map((t) => (
                    <option key={t.sym} value={t.sym}>
                      {t.sym} — {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', paddingTop: 24 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-mute)', marginBottom: 2 }}>Type</div>
                  <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-space)', color: 'var(--text-dim)' }}>
                    {token.name.includes('Long') ? '📈 Long' : '📉 Short'} · {token.name.includes('2x') ? '2x' : token.name.includes('3x') ? '3x' : '1x'} Leverage
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-mute)', marginBottom: 2 }}>Base Mult</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--mint)' }}>
                    {token.baseMultiplier}x
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Price + Chart */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 32, fontWeight: 700, fontFamily: 'var(--font-space)', lineHeight: 1 }}>
                  ${token.price.toFixed(2)}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: isUp ? 'var(--green)' : 'var(--red)',
                    marginTop: 4,
                  }}
                >
                  {isUp ? '+' : ''}{token.change.toFixed(2)} ({isUp ? '+' : ''}{token.changePct.toFixed(2)}%)
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 2 }}>{token.description}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="badge mint">Season 1</span>
              </div>
            </div>

            {/* Timeframe tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
              {TIMEFRAMES.map((t) => (
                <button
                  key={t}
                  onClick={() => setTf(t)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: 'var(--font-space)',
                    background: tf === t ? 'var(--bg-3)' : 'transparent',
                    color: tf === t ? 'var(--text)' : 'var(--text-mute)',
                    border: tf === t ? '1px solid var(--border-strong)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Chart */}
            <div style={{ margin: '0 -4px' }}>
              <Sparkline
                data={chartData}
                height={200}
                color={isUp ? 'var(--mint)' : 'var(--red)'}
                fill={true}
                strokeWidth={1.5}
              />
            </div>
          </div>

          {/* Trade form */}
          <div className="card" style={{ marginBottom: 16 }}>
            {/* Buy/Sell toggle */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button
                className={`btn${side === 'Buy' ? ' primary' : ' ghost'}`}
                style={{ flex: 1 }}
                onClick={() => setSide('Buy')}
              >
                Buy
              </button>
              <button
                className={`btn${side === 'Sell' ? ' primary' : ' ghost'}`}
                style={{ flex: 1 }}
                onClick={() => setSide('Sell')}
              >
                Sell
              </button>
            </div>

            {/* Amount input */}
            <label style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Amount (USDC)
            </label>
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <input
                type="number"
                className="input"
                placeholder="0.00"
                min="5"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                style={{ paddingRight: 50 }}
              />
              <span
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--text-mute)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                USDC
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-mute)', marginBottom: 16 }}>Min 5 USDC</div>

            {/* Submit */}
            <button className="btn primary block lg" onClick={handleSubmit}>
              {side} {selectedSym}
            </button>

            {!wallet && (
              <div style={{ fontSize: 11, color: 'var(--text-mute)', textAlign: 'center', marginTop: 10 }}>
                Connect wallet to trade
              </div>
            )}
          </div>

          {/* Recent trades */}
          <div className="card">
            <div className="section-title">Recent Trades</div>
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {DEMO_ORDERS.slice(0, 3).map((o, i) => (
                    <tr key={i}>
                      <td style={{ color: o.type === 'Buy' ? 'var(--green)' : 'var(--red)', fontWeight: 600, fontFamily: 'var(--font-space)' }}>{o.type}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{o.qty}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>${o.price.toFixed(2)}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>${o.amount.toFixed(2)}</td>
                      <td>
                        <span style={{ fontSize: 11, color: STATUS_COLORS[o.status], fontWeight: 600 }}>{o.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Orders */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="section-title" style={{ marginBottom: 0 }}>Orders</div>
              <select
                className="input"
                value={orderFilter}
                onChange={(e) => setOrderFilter(e.target.value)}
                style={{ width: 'auto', fontSize: 12, padding: '4px 28px 4px 10px' }}
              >
                {ORDER_FILTERS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>
                <p>No orders</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredOrders.map((o, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '10px 12px',
                      background: 'var(--panel)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          fontFamily: 'var(--font-space)',
                          color: o.type === 'Buy' ? 'var(--green)' : 'var(--red)',
                        }}
                      >
                        {o.type} {o.asset}
                      </span>
                      <span style={{ fontSize: 11, color: STATUS_COLORS[o.status], fontWeight: 600 }}>{o.status}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-mute)', fontFamily: 'var(--font-mono)' }}>
                      {o.qty} × ${o.price.toFixed(2)} = ${o.amount.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Price Alerts */}
          <div className="card">
            <div className="section-title">Price Alerts</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                type="number"
                className="input"
                placeholder="Alert price..."
                value={alertInput}
                onChange={(e) => setAlertInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddAlert()}
                style={{ flex: 1 }}
              />
              <button className="btn mint" onClick={handleAddAlert}>
                <Icon name="plus" size={13} />
              </button>
            </div>

            {alerts.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-mute)', textAlign: 'center', padding: '12px 0' }}>
                No alerts set
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {alerts.map((a, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 10px',
                      background: 'var(--panel)',
                      border: '1px solid var(--border)',
                      borderRadius: 7,
                    }}
                  >
                    <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>{a}</span>
                    <button
                      style={{ color: 'var(--text-mute)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                      onClick={() => setAlerts((prev) => prev.filter((_, j) => j !== i))}
                    >
                      <Icon name="x" size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Token info card */}
          <div className="card">
            <div className="section-title">Token Info</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div className="kv">
                <span className="k">Symbol</span>
                <span className="v font-mono">{token.sym}</span>
              </div>
              <div className="kv">
                <span className="k">XP Multiplier</span>
                <span className="v mint">{token.baseMultiplier}x base</span>
              </div>
              <div className="kv">
                <span className="k">Direction</span>
                <span className="v" style={{ color: token.direction === 'up' ? 'var(--green)' : 'var(--red)' }}>
                  {token.direction === 'up' ? '📈 Long' : '📉 Short'}
                </span>
              </div>
              <div className="kv" style={{ borderBottom: 'none' }}>
                <span className="k">Min hold for XP</span>
                <span className="v">24 hours</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
