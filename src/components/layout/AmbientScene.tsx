import clsx from 'clsx';

interface AmbientSceneProps {
  compact?: boolean;
}

export function AmbientScene({ compact = false }: AmbientSceneProps) {
  return (
    <div className={clsx('ambient-scene', compact && 'ambient-scene-compact')} aria-hidden="true">
      <div className="ambient-gradient" />
      <div className="ambient-line-field" />
      <div className="ambient-arc ambient-arc-one" />
      <div className="ambient-arc ambient-arc-two" />
      <div className="ambient-thread ambient-thread-one" />
      <div className="ambient-thread ambient-thread-two" />
      <div className="ambient-static-dots" />
    </div>
  );
}
