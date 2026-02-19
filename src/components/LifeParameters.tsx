import { useGameStore } from '../store/gameStore';

export function LifeParameters() {
    const parameters = useGameStore((state) => state.parameters);
    const setParameter = useGameStore((state) => state.setParameter);
    const stage = useGameStore((state) => state.stage);
    const progress = useGameStore((state) => state.progress);
    const stability = useGameStore((state) => state.stability);

    const containerStyle: React.CSSProperties = {
        position: 'absolute',
        bottom: 'clamp(8px, 2vh, 20px)',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 'clamp(10px, 2vw, 20px)',
        borderRadius: '10px',
        color: 'white',
        fontFamily: 'monospace',
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 'clamp(4px, 1vh, 10px)',
        width: 'clamp(200px, 80vw, 300px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxSizing: 'border-box',
    };

    const rowStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '6px',
    };

    const labelStyle: React.CSSProperties = {
        fontSize: 'clamp(10px, 2.5vw, 14px)',
        flexShrink: 0,
        minWidth: '55px',
    };

    const valueStyle: React.CSSProperties = {
        fontSize: 'clamp(10px, 2.5vw, 14px)',
        width: '36px',
        textAlign: 'right',
        flexShrink: 0,
    };

    const sliderStyle: React.CSSProperties = {
        flex: 1,
        minWidth: 0,
        height: '20px',       // Larger touch target on mobile
        cursor: 'pointer',
    };

    return (
        <div style={containerStyle}>
            <h3 style={{
                margin: 0,
                textAlign: 'center',
                fontSize: 'clamp(11px, 3vw, 16px)',
                color: '#00ff88',
                lineHeight: 1.3,
            }}>
                Stage: {stage} ({Math.round(progress)}%)
            </h3>

            <div style={rowStyle}>
                <span style={labelStyle}>Stability:</span>
                <div style={{ flex: 1, height: '6px', background: '#333', borderRadius: '3px', overflow: 'hidden', minWidth: 0 }}>
                    <div style={{ width: `${stability}%`, height: '100%', background: stability > 50 ? '#00ff88' : '#ff3333' }} />
                </div>
                <span style={valueStyle}>{Math.round(stability)}%</span>
            </div>

            <hr style={{ border: '0', borderTop: '1px solid rgba(255,255,255,0.1)', width: '100%', margin: '4px 0' }} />

            <div style={rowStyle}>
                <label style={labelStyle}>Temp</label>
                <input
                    type="range"
                    min="0" max="1" step="0.01"
                    value={parameters.temperature}
                    onChange={(e) => setParameter('temperature', parseFloat(e.target.value))}
                    style={sliderStyle}
                />
                <span style={valueStyle}>{parameters.temperature.toFixed(2)}</span>
            </div>

            <div style={rowStyle}>
                <label style={labelStyle}>Energy</label>
                <input
                    type="range"
                    min="0" max="1" step="0.01"
                    value={parameters.energy}
                    onChange={(e) => setParameter('energy', parseFloat(e.target.value))}
                    style={sliderStyle}
                />
                <span style={valueStyle}>{parameters.energy.toFixed(2)}</span>
            </div>

            <div style={rowStyle}>
                <label style={labelStyle}>Turbulence</label>
                <input
                    type="range"
                    min="0" max="1" step="0.01"
                    value={parameters.turbulence}
                    onChange={(e) => setParameter('turbulence', parseFloat(e.target.value))}
                    style={sliderStyle}
                />
                <span style={valueStyle}>{parameters.turbulence.toFixed(2)}</span>
            </div>
        </div>
    );
}
