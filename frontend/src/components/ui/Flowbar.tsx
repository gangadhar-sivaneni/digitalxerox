import { Fragment } from "react";

const STEPS = ["Upload", "Configure", "Review", "Pay", "Done"] as const;

/** Design-styled wizard steps: 1-based `step` marks the current stage. */
export function Flowbar({ step }: { step: number }) {
  return (
    <div className="flowbar">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const cls = n === step ? "on" : n < step ? "done" : "";
        return (
          <Fragment key={label}>
            {i > 0 ? <span className="cn"></span> : null}
            <div className={"fb" + (cls ? " " + cls : "")}>
              <span className="rd">{n < step ? "✓" : n}</span>
              <span className="nm">{label}</span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}