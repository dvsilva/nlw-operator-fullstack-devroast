"use client";

import { twMerge } from "tailwind-merge";

type CodeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

function CodeEditor({ value, onChange, className }: CodeEditorProps) {
  const lines = value.split("\n");
  const lineCount = Math.max(lines.length, 16);

  return (
    <div
      className={twMerge(
        "border border-border-primary overflow-hidden flex flex-col",
        className,
      )}
    >
      {/* Window Header */}
      <div className="flex items-center gap-2 h-10 px-4 border-b border-border-primary">
        <span className="size-3 rounded-full bg-accent-red" />
        <span className="size-3 rounded-full bg-accent-amber" />
        <span className="size-3 rounded-full bg-accent-green" />
      </div>

      {/* Code Area */}
      <div className="flex flex-1 bg-bg-input">
        {/* Line Numbers */}
        <div className="flex flex-col items-end gap-0 py-4 px-3 w-12 border-r border-border-primary bg-bg-surface select-none">
          {Array.from({ length: lineCount }, (_, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: line numbers are index-based and never reorder
              key={i}
              className="font-mono text-xs leading-[1.625] text-text-tertiary"
            >
              {i + 1}
            </span>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="// paste your code here..."
          spellCheck={false}
          className="flex-1 py-4 px-4 bg-transparent font-mono text-xs leading-[1.625] text-text-primary placeholder:text-text-tertiary outline-none resize-none min-h-80"
        />
      </div>
    </div>
  );
}

export { CodeEditor, type CodeEditorProps };
