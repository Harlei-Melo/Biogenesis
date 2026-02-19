import { useGameStore } from '../store/gameStore';

export function LifeParameters() {
    const parameters = useGameStore((state) => state.parameters);
    const setParameter = useGameStore((state) => state.setParameter);
    const stage = useGameStore((state) => state.stage);
    const progress = useGameStore((state) => state.progress);
    const stability = useGameStore((state) => state.stability);

    const containerStyle = {
        position: 'absolute' as const,
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: '20px',
        borderRadius: '10px',
        color: 'white',
        fontFamily: 'monospace',
        pointerEvents: 'auto' as const, // Habilitar interação
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '10px',
        width: '300px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
    };

    const rowStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    };

    const labelStyle = {
        fontSize: '14px',
        width: '100px',
    };

    const valueStyle = {
        fontSize: '14px',
        width: '40px',
        textAlign: 'right' as const,
    };

    return (
        <div style={containerStyle}>
            <h3 style={{ margin: '0 0 10px 0', textAlign: 'center', fontSize: '16px', color: '#00ff88' }}>
                Stage: {stage} ({Math.round(progress)}%)
            </h3>

            <div style={rowStyle}>
                <span style={labelStyle}>Stability:</span>
                <div style={{ flex: 1, height: '6px', background: '#333', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${stability}%`, height: '100%', background: stability > 50 ? '#00ff88' : '#ff3333' }} />
                </div>
                <span style={valueStyle}>{Math.round(stability)}%</span>
            </div>

            <hr style={{ border: '0', borderTop: '1px solid rgba(255,255,255,0.1)', width: '100%', margin: '10px 0' }} />

            <div style={rowStyle}>
                <label style={labelStyle}>Temp</label>
                <input
                    type="range"
                    min="0" max="1" step="0.01"
                    value={parameters.temperature}
                    onChange={(e) => setParameter('temperature', parseFloat(e.target.value))}
                    style={{ flex: 1 }}
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
                    style={{ flex: 1 }}
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
                    style={{ flex: 1 }}
                />
                <span style={valueStyle}>{parameters.turbulence.toFixed(2)}</span>
            </div>
        </div>
    );
}
