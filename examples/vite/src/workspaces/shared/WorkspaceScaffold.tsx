import type { ReactNode } from "react";

interface WorkspaceScaffoldProps {
  family: string;
  title: string;
  summary: string;
  controls?: ReactNode;
  children: ReactNode;
  parameters: readonly string[];
  stageClassName?: string;
}

export function WorkspaceScaffold({
  family,
  title,
  summary,
  controls,
  children,
  parameters,
  stageClassName = ""
}: WorkspaceScaffoldProps) {
  return (
    <section className="effect-workspace">
      <header className="workspace-heading">
        <div>
          <p className="effect-family">{family}</p>
          <h2>{title}</h2>
          <p className="workspace-summary">{summary}</p>
        </div>
        {controls ? <div className="workspace-controls">{controls}</div> : null}
      </header>

      <div className={`effect-stage ${stageClassName}`}>{children}</div>

      <footer className="parameter-reference" aria-label={`${title} public parameters`}>
        <span>Public parameters</span>
        <code>{parameters.join(" · ")}</code>
      </footer>
    </section>
  );
}

export interface PauseControlProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function PauseControl({ checked, onChange }: PauseControlProps) {
  return (
    <label className="toggle-control">
      <input
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>Pause</span>
    </label>
  );
}
