import { useEffect, useState } from 'react';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { api } from '../api/client';

export default function VersionDiff({ subject, versions, selectedVersions = [] }) {
  const [leftVersion, setLeftVersion] = useState(null);
  const [rightVersion, setRightVersion] = useState(null);
  const [leftText, setLeftText] = useState('');
  const [rightText, setRightText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedVersions.length === 2) {
      setLeftVersion(selectedVersions[0]);
      setRightVersion(selectedVersions[1]);
    } else if (versions.length >= 2) {
      setLeftVersion(versions[0]);
      setRightVersion(versions[versions.length - 1]);
    } else if (versions.length === 1) {
      setLeftVersion(versions[0]);
      setRightVersion(versions[0]);
    }
  }, [versions, subject, selectedVersions]);

  useEffect(() => {
    if (!subject || leftVersion == null || rightVersion == null) return;

    let cancelled = false;
    setLoading(true);

    Promise.all([
      api.getSchema(subject, leftVersion),
      api.getSchema(subject, rightVersion),
    ])
      .then(([left, right]) => {
        if (cancelled) return;
        setLeftText(JSON.stringify(left.schema, null, 2));
        setRightText(JSON.stringify(right.schema, null, 2));
      })
      .catch(() => {
        if (!cancelled) {
          setLeftText('');
          setRightText('');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [subject, leftVersion, rightVersion]);

  if (!subject) {
    return (
      <div className="panel">
        <h2>Version Diff</h2>
        <p className="loading">Select a subject to compare versions.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>Version Diff</h2>
      <div className="diff-controls">
        <div className="form-row">
          <label>From version</label>
          <select
            value={leftVersion ?? ''}
            onChange={(e) => setLeftVersion(parseInt(e.target.value, 10))}
          >
            {versions.map((v) => (
              <option key={v} value={v}>
                v{v}
              </option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <label>To version</label>
          <select
            value={rightVersion ?? ''}
            onChange={(e) => setRightVersion(parseInt(e.target.value, 10))}
          >
            {versions.map((v) => (
              <option key={v} value={v}>
                v{v}
              </option>
            ))}
          </select>
        </div>
      </div>
      {loading ? (
        <p className="loading">Loading schemas…</p>
      ) : (
        <div data-testid="version-diff-view">
          <ReactDiffViewer
            oldValue={leftText}
            newValue={rightText}
            splitView
            useDarkTheme={false}
            leftTitle={`v${leftVersion}`}
            rightTitle={`v${rightVersion}`}
          />
        </div>
      )}
    </div>
  );
}
