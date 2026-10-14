import {
  Boxes,
  Code2,
  Database,
  Globe,
  Layers3,
  LockKeyhole,
  Network,
  Package,
  Settings2,
  Terminal,
  Waves,
} from "lucide-react";
import { PythonLogo } from "./python-logo";
import brandPaths from "./technology-icons.json";

const symbols = {
  browser: Globe,
  code: Code2,
  database: Database,
  layers: Layers3,
  network: Network,
  package: Package,
  settings: Settings2,
  shield: LockKeyhole,
  terminal: Terminal,
  animation: Waves,
  boxes: Boxes,
};
export type TechnologyIconName =
  keyof typeof brandPaths | keyof typeof symbols | "python";

export function TechnologyIcon({ name }: { name: TechnologyIconName }) {
  if (name === "python") return <PythonLogo size={20} />;
  if (name in brandPaths)
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        {brandPaths[name as keyof typeof brandPaths].map((path, index) => (
          <path d={path} key={index} />
        ))}
      </svg>
    );
  const Icon = symbols[name as keyof typeof symbols];
  return <Icon size={20} aria-hidden="true" />;
}
