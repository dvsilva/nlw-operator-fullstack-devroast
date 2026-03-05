"use client";

import { Toggle } from "@/components/ui/toggle";

function ToggleDemo() {
  return (
    <div className="flex items-center gap-8 flex-wrap">
      <Toggle label="roast mode" defaultChecked />
      <Toggle label="roast mode" />
    </div>
  );
}

export { ToggleDemo };
