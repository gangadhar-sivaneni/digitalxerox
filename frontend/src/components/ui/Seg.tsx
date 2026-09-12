import type { ReactNode } from "react";

interface SegOption<T extends string> {
  value: T;
  title: ReactNode;
  sub?: ReactNode;
}

/** Design-styled radio segmented control (prints a hidden <input> per option). */
export function Seg<T extends string>({
  options,
  value,
  onChange,
  name,
}: {
  options: SegOption<T>[];
  value: T;
  onChange: (v: T) => void;
  name: string;
}) {
  return (
    <div className="seg" role="radiogroup">
      {options.map((o) => (
        <label key={o.value} className={"choice" + (value === o.value ? " sel" : "")}>
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
          />
          <span className="mk"></span>
          <span className="tx">
            <b>{o.title}</b>
            {o.sub ? <small>{o.sub}</small> : null}
          </span>
        </label>
      ))}
    </div>
  );
}