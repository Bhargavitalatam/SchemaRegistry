import { useState } from 'react';
import { api } from '../api/client';

export default function PayloadValidator({ subject, versions }) {
  const [payloadText, setPayloadText] = useState('{\n  \n}');
  const [version, setVersion] = useState('');
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleValidate() {
    if (!subject) {
      setOutput({ error: 'Select a subject first' });
      return;
    }

    let payload;
    try {
      payload = JSON.parse(payloadText);
    } catch {
      setOutput({ error: 'Invalid JSON in payload' });
      return;
    }

    setLoading(true);
    setOutput(null);
    try {
      const v = version ? parseInt(version, 10) : undefined;
      const result = await api.validatePayload(subject, payload, v);
      setOutput({ success: true, data: result });
    } catch (err) {
      setOutput({
        success: false,
        data: err.data || { error: err.message },
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel">
      <h2>Validate Payload</h2>
      <div className="form-row">
        <label>Schema version (optional — latest if empty)</label>
        <select value={version} onChange={(e) => setVersion(e.target.value)}>
          <option value="">Latest</option>
          {versions.map((v) => (
            <option key={v} value={v}>
              v{v}
            </option>
          ))}
        </select>
      </div>
      <div className="form-row">
        <label>JSON payload</label>
        <textarea
          data-testid="payload-validator-input"
          value={payloadText}
          onChange={(e) => setPayloadText(e.target.value)}
          spellCheck={false}
        />
      </div>
      <button
        className="btn"
        type="button"
        data-testid="payload-validator-button"
        onClick={handleValidate}
        disabled={loading || !subject}
      >
        {loading ? 'Validating…' : 'Validate'}
      </button>
      <div data-testid="payload-validator-output" style={{ marginTop: '1rem' }}>
        {output?.success && (
          <div className="success-msg" data-testid="payload-validator-success">
            {output.data.status === 'valid' ? 'Payload is valid' : output.data.message}
          </div>
        )}
        {output && !output.success && (
          <div className="error-msg" data-testid="payload-validator-errors">
            <strong>Validation failed</strong>
            {output.data.errors ? (
              <ul className="error-list">
                {output.data.errors.map((e, i) => (
                  <li key={i} data-testid="payload-validator-error-item">
                    <code>{e.field}</code>: {e.message}
                  </li>
                ))}
              </ul>
            ) : (
              <p>{output.data.error || output.error}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
