export default function SchemaBrowser({
  subjects,
  selectedSubject,
  versions,
  selectedVersions,
  onSelectSubject,
  onToggleVersion,
  loading,
}) {
  return (
    <aside className="sidebar">
      <h2>Schemas</h2>
      {loading && <p className="loading">Loading subjects…</p>}
      <div data-testid="subject-list">
        {subjects.map((s) => (
          <div key={s.name} className="subject-item">
            <div
              className={`subject-name ${selectedSubject === s.name ? 'active' : ''}`}
              onClick={() => onSelectSubject(s.name)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSelectSubject(s.name)}
            >
              {s.name}
              <span style={{ fontWeight: 400, opacity: 0.7 }}>
                {' '}
                ({s.latest_version ?? 0} v)
              </span>
            </div>
            {selectedSubject === s.name && versions.length > 0 && (
              <ul className="version-list">
                {versions.map((v) => (
                  <li
                    key={v.version}
                    data-testid={`version-${v.version}`}
                    className={`${selectedVersions.includes(v.version) ? 'selected' : ''} ${
                      v.is_deprecated ? 'deprecated' : ''
                    }`}
                    onClick={() => onToggleVersion(v.version)}
                  >
                    v{v.version}
                    {v.is_deprecated ? ' (deprecated)' : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
