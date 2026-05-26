import { useCallback, useEffect, useState } from 'react';
import { api } from './api/client';
import SchemaBrowser from './components/SchemaBrowser';
import VersionDiff from './components/VersionDiff';
import CompatibilityMatrix from './components/CompatibilityMatrix';
import PayloadValidator from './components/PayloadValidator';

export default function App() {
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [versions, setVersions] = useState([]);
  const [selectedVersions, setSelectedVersions] = useState([]);
  const [schemaPreview, setSchemaPreview] = useState(null);

  const loadSubjects = useCallback(async () => {
    setLoadingSubjects(true);
    try {
      const data = await api.getSubjects();
      setSubjects(data.subjects || []);
    } catch (err) {
      console.error(err);
      setSubjects([]);
    } finally {
      setLoadingSubjects(false);
    }
  }, []);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  useEffect(() => {
    if (!selectedSubject) {
      setVersions([]);
      return;
    }

    api
      .getVersions(selectedSubject)
      .then((data) => {
        const raw = data.versions || [];
        setVersions(
          raw.map((v) =>
            typeof v === 'number' ? { version: v, is_deprecated: false } : v
          )
        );
      })
      .catch(() => setVersions([]));
  }, [selectedSubject]);

  useEffect(() => {
    const version = selectedVersions[selectedVersions.length - 1];
    if (!selectedSubject || !version) {
      setSchemaPreview(null);
      return;
    }

    api
      .getSchema(selectedSubject, version)
      .then((data) => setSchemaPreview(data.schema))
      .catch(() => setSchemaPreview(null));
  }, [selectedSubject, selectedVersions]);

  function handleSelectSubject(name) {
    setSelectedSubject(name);
    setSelectedVersions([]);
  }

  function handleToggleVersion(version) {
    setSelectedVersions((prev) => {
      if (prev.includes(version)) {
        return prev.filter((v) => v !== version);
      }
      if (prev.length >= 2) {
        return [prev[1], version];
      }
      return [...prev, version];
    });
  }

  const versionNumbers = versions
    .filter((v) => !v.is_deprecated)
    .map((v) => (typeof v === 'number' ? v : v.version));

  return (
    <>
      <header className="app-header">
        <h1>Schema Registry</h1>
        <p>Data contract management with backward, forward, and full compatibility</p>
      </header>
      <div className="layout">
        <SchemaBrowser
          subjects={subjects}
          selectedSubject={selectedSubject}
          versions={versions}
          selectedVersions={selectedVersions}
          onSelectSubject={handleSelectSubject}
          onToggleVersion={handleToggleVersion}
          loading={loadingSubjects}
        />
        <main className="main">
          {selectedSubject && schemaPreview && (
            <div className="panel">
              <h2>
                {selectedSubject} — schema preview
                {selectedVersions.length > 0 &&
                  ` (v${selectedVersions[selectedVersions.length - 1]})`}
              </h2>
              <pre className="schema-preview">{JSON.stringify(schemaPreview, null, 2)}</pre>
            </div>
          )}
          <VersionDiff
            subject={selectedSubject}
            versions={versionNumbers}
            selectedVersions={selectedVersions}
          />
          <CompatibilityMatrix subject={selectedSubject} versionNumbers={versionNumbers} />
          <PayloadValidator subject={selectedSubject} versions={versionNumbers} />
        </main>
      </div>
    </>
  );
}
