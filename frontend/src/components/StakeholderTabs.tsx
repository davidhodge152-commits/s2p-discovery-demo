import { stakeholderPresets } from '../lib/api';

interface Props {
  activePreset: string;
  onSelect: (name: string) => void;
}

export default function StakeholderTabs({ activePreset, onSelect }: Props) {
  return (
    <div className="flex gap-2">
      {stakeholderPresets.map((preset) => (
        <button
          key={preset.name}
          onClick={() => onSelect(preset.name)}
          className={`px-3 py-1.5 rounded text-sm border transition ${
            activePreset === preset.name
              ? 'bg-sky-500/80 border-sky-300 text-white'
              : 'bg-slate-900/70 border-slate-700 text-slate-300 hover:bg-slate-800'
          }`}
          title={preset.description}
        >
          {preset.name}
        </button>
      ))}
    </div>
  );
}

