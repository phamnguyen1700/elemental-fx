import { useEffect, useMemo, useState } from "react";

import { effectWorkspaces, type WorkspaceId } from "./workspaces";

function readWorkspaceFromHash(): WorkspaceId {
  const hash = globalThis.location?.hash.slice(1);
  return effectWorkspaces.find((workspace) => workspace.id === hash)?.id ?? effectWorkspaces[0].id;
}

export function App() {
  const [activeId, setActiveId] = useState<WorkspaceId>(readWorkspaceFromHash);
  const activeWorkspace = useMemo(
    () => effectWorkspaces.find((workspace) => workspace.id === activeId) ?? effectWorkspaces[0],
    [activeId]
  );

  useEffect(() => {
    const handleHashChange = () => setActiveId(readWorkspaceFromHash());
    globalThis.addEventListener("hashchange", handleHashChange);
    return () => globalThis.removeEventListener("hashchange", handleHashChange);
  }, []);

  const selectWorkspace = (id: WorkspaceId) => {
    setActiveId(id);
    globalThis.history?.replaceState(null, "", `#${id}`);
  };

  const Workspace = activeWorkspace.component;

  return (
    <main className="playground-shell">
      <header className="app-header">
        <div className="app-identity">
          <p className="eyebrow">elemental-fx</p>
          <h1>Effect playground</h1>
        </div>
        <p className="build-tag">{activeWorkspace.family}</p>
      </header>

      <nav aria-label="Effect workspaces" className="workspace-nav">
        {effectWorkspaces.map((workspace) => (
          <button
            aria-current={workspace.id === activeId ? "page" : undefined}
            className="workspace-nav-item"
            key={workspace.id}
            onClick={() => selectWorkspace(workspace.id)}
            type="button"
          >
            <span>{workspace.label}</span>
            <small>{workspace.family}</small>
          </button>
        ))}
      </nav>

      <Workspace />
    </main>
  );
}
