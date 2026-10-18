import { HiOutlineArrowPath } from 'react-icons/hi2';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

const RECOMMENDED_MODELS = [
  { name: 'qwen2.5:3b',     label: 'Qwen 2.5 3B',    size: '1.9 GB', badge: '⚡ Fastest' },
  { name: 'llama3.2:3b',    label: 'Llama 3.2 3B',   size: '2.0 GB', badge: '⚡ Fast' },
  { name: 'llama3.1:8b',    label: 'Llama 3.1 8B',   size: '4.7 GB', badge: '⚖️ Balanced' },
  { name: 'deepseek-r1:7b', label: 'DeepSeek R1 7B', size: '4.7 GB', badge: '🎯 Quality' },
];

/** A setup step: emoji, title, explanation and actions. */
export function SetupCard({ emoji, title, compact, children }) {
  return (
    <div className={cn('flex gap-3 rounded-lg border border-border bg-[var(--bg-primary)]', compact ? 'p-3' : 'p-4')}>
      <div className="text-xl leading-none">{emoji}</div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 text-[13px] leading-relaxed text-muted-foreground [&_p]:m-0">
        <h4 className="m-0 text-[13.5px] font-semibold text-foreground">{title}</h4>
        {children}
      </div>
    </div>
  );
}

export const SetupActions = ({ children }) => <div className="flex flex-wrap gap-1.5">{children}</div>;

const ErrorLine = ({ error }) => (error ? <p className="text-[var(--danger)]">{error}</p> : null);

export function Checking() {
  return <div className="flex items-center gap-2 py-2 text-[13px] text-muted-foreground"><Spinner /> Checking Ollama…</div>;
}

export function NotInstalled({ compact, ollama }) {
  return (
    <SetupCard emoji="🦙" title="Ollama not found" compact={compact}>
      <p>Ollama is a free, local AI runtime. It runs models privately on your machine: no cloud, no data sent anywhere.</p>
      <SetupActions>
        <Button size="sm" onClick={() => window.open('https://ollama.com/download', '_blank', 'noopener')}>Download Ollama</Button>
        <Button variant="ghost" size="sm" onClick={ollama.check}><HiOutlineArrowPath /> Check again</Button>
      </SetupActions>
    </SetupCard>
  );
}

export function NotRunning({ compact, ollama }) {
  return (
    <SetupCard emoji="😴" title="Ollama is not running" compact={compact}>
      <p>Ollama is installed but not running.</p>
      <ErrorLine error={ollama.error} />
      <SetupActions>
        <Button size="sm" onClick={ollama.start} disabled={ollama.starting}>{ollama.starting ? <><Spinner /> Starting…</> : 'Start Ollama'}</Button>
        <Button variant="ghost" size="sm" onClick={ollama.check}><HiOutlineArrowPath /> Refresh</Button>
      </SetupActions>
    </SetupCard>
  );
}

function PullProgress({ entry }) {
  const percent = entry?.percent || 0;
  return (
    <div className="flex w-32 flex-col gap-1">
      <div className="h-1 overflow-hidden rounded-full bg-[var(--bg-tertiary)]"><div className="h-full bg-primary transition-[width]" style={{ width: `${percent}%` }} /></div>
      <span className="truncate font-mono text-[10.5px] text-[var(--text-tertiary)]">{entry?.status} {percent > 0 ? `${percent}%` : ''}</span>
    </div>
  );
}

function ModelRow({ model, ollama }) {
  return (
    <div className="flex items-center gap-3 border-b border-border py-2 last:border-b-0">
      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
        <span className="text-[13px] font-medium text-foreground">{model.label}</span>
        <span className="font-mono text-[11px] text-[var(--text-tertiary)]">{model.size}</span>
        <span className="text-[11px] text-muted-foreground">{model.badge}</span>
      </div>
      {ollama.pulling === model.name
        ? <PullProgress entry={ollama.progress[model.name]} />
        : <Button size="sm" onClick={() => ollama.pull(model.name)} disabled={Boolean(ollama.pulling)}>Pull</Button>}
    </div>
  );
}

export function NoModels({ compact, ollama }) {
  return (
    <SetupCard emoji="📦" title="No models installed" compact={compact}>
      <p>Pull a model to enable AI features. Smaller models are faster; larger ones are more capable.</p>
      <ErrorLine error={ollama.error} />
      <div>{RECOMMENDED_MODELS.map((m) => <ModelRow key={m.name} model={m} ollama={ollama} />)}</div>
    </SetupCard>
  );
}

export function Ready({ count, onRefresh }) {
  return (
    <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
      <span className="size-2 rounded-full bg-[#3fb950]" />
      Running · {count} model{count !== 1 ? 's' : ''} available
      <Button variant="ghost" size="sm" onClick={onRefresh} title="Refresh"><HiOutlineArrowPath /></Button>
    </div>
  );
}
