import { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function CompatibilityMatrix({ subject, versionNumbers }) {
  const [matrix, setMatrix] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!subject || versionNumbers.length < 2) {
      setMatrix({});
      return;
    }

    let cancelled = false;
    setLoading(true);
    const results = {};

    const checks = [];
    for (const row of versionNumbers) {
      results[row] = {};
      for (const col of versionNumbers) {
        if (row === col) {
          results[row][col] = true;
          continue;
        }
        checks.push(
          api
            .checkCompatibility(subject, row, col)
            .then((r) => {
              results[row][col] = r.compatible;
            })
            .catch(() => {
              results[row][col] = false;
            })
        );
      }
    }

    Promise.all(checks).then(() => {
      if (!cancelled) {
        setMatrix({ ...results });
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [subject, versionNumbers.join(',')]);

  if (!subject) {
    return (
      <div className="panel">
        <h2>Compatibility Matrix</h2>
        <p className="loading">Select a subject with multiple versions.</p>
      </div>
    );
  }

  if (versionNumbers.length < 2) {
    return (
      <div className="panel">
        <h2>Compatibility Matrix</h2>
        <p className="loading">Need at least two versions to build the matrix.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>Compatibility Matrix</h2>
      <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 0 }}>
        Row → Column: can column schema read data produced with row schema? (subject
        compatibility mode)
      </p>
      {loading ? (
        <p className="loading">Computing compatibility…</p>
      ) : (
        <div data-testid="compatibility-matrix" style={{ overflowX: 'auto' }}>
          <table className="matrix-table">
            <thead>
              <tr>
                <th>Base \ Target</th>
                {versionNumbers.map((v) => (
                  <th key={v}>v{v}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {versionNumbers.map((row) => (
                <tr key={row}>
                  <th>v{row}</th>
                  {versionNumbers.map((col) => {
                    const ok = matrix[row]?.[col];
                    return (
                      <td key={col}>
                        {ok === undefined ? (
                          '…'
                        ) : ok ? (
                          <span className="cell-ok">✓</span>
                        ) : (
                          <span className="cell-fail">✗</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
