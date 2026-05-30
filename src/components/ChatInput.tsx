"use client";

import { useState } from "react";

// 底部输入栏:回车或点按钮发送。AI 思考中或已通关时禁用。
export function ChatInput({
  onSend,
  disabled,
  placeholder,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
  placeholder: string;
}) {
  const [value, setValue] = useState("");

  function submit() {
    const t = value.trim();
    if (!t || disabled) return;
    onSend(t);
    setValue("");
  }

  return (
    <div className="flex items-end gap-2 border-t border-line bg-panel px-3 py-2.5">
      <textarea
        rows={1}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        className="pixel-panel no-scrollbar max-h-24 flex-1 resize-none rounded-2xl border border-line bg-panelSoft px-3.5 py-2 text-[13.5px] text-gray-100 outline-none placeholder:text-gray-600 focus:border-accent/60 disabled:opacity-50"
      />
      <button
        type="button"
        onClick={submit}
        disabled={disabled || !value.trim()}
        className="terminal-title mb-0.5 h-9 shrink-0 rounded-full bg-accent px-4 text-[13px] font-semibold text-panel transition active:scale-95 disabled:opacity-30"
      >
        发送
      </button>
    </div>
  );
}
