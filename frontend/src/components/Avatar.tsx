import { useEffect, useState } from 'react';

export function Avatar({ src, name, large = false }: { src?: string | null; name: string; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return <span className={`avatar${large ? ' avatar-large' : ''}`}>
    {src && !failed ? <img src={src} alt={`${name}'s profile picture`} onError={() => setFailed(true)} /> : <span aria-label={`${name}'s initials`}>{name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?'}</span>}
  </span>;
}
