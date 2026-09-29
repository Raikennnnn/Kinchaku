import type { CSSProperties } from "react";
import type { IconRef } from "../db";
import { presetIcon } from "../icons";
import { ICON_DATA_URL } from "../lib/image";

type Props = { icon: IconRef; color: string; size?: number };

export function CategoryIcon({ icon, color, size = 40 }: Props) {
  const style = { width: size, height: size, borderRadius: size * 0.3, "--c": color } as CSSProperties;

  // Uploaded pictures fill the tile. Anything that isn't an image we made falls back to the tag icon.
  if (icon.kind === "custom" && ICON_DATA_URL.test(icon.dataUrl)) {
    return (
      <span aria-hidden="true" className="cat-icon inline-block shrink-0 overflow-hidden" style={style}>
        <img src={icon.dataUrl} alt="" className="size-full object-cover" draggable={false} />
      </span>
    );
  }

  const Icon = presetIcon(icon.kind === "preset" ? icon.name : "tag");
  return (
    <span aria-hidden="true" className="cat-icon inline-grid shrink-0 place-items-center overflow-hidden" style={style}>
      <Icon size={size * 0.56} weight="duotone" />
    </span>
  );
}
