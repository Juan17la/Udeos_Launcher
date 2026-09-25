import PixelIcon from '../ui/PixelIcon'
import { Download } from '../ui/icons'
import { useApp } from '../state'
import { compact, loaderName, versionRange } from '../utils/format'
import type { Instance } from '../api/types'

/** The tags every card uses, formatted one way: the Minecraft version(s) in
 *  green behind a grass block, loaders in gold. */

export function VersionTag({ versions }: { versions: string[] }) {
  const label = versionRange(versions)
  if (!label) return null
  return <span className="tag bg-green-soft gap-1.5" title={versions.length > 1 ? versions.join(', ') : undefined}><PixelIcon name="grass_block_side" size={11} />{label}</span>
}

/** Loader tags, at most `max` then "+N" (the rest in the title). */
export function LoaderTags({ loaders, max = 3 }: { loaders: string[]; max?: number }) {
  const names = [...new Set(loaders.map(loaderName))]
  return (
    <>
      {names.slice(0, max).map((l) => <span key={l} className="tag bg-gold-soft">{l}</span>)}
      {names.length > max && <span className="tag bg-gold-soft" title={names.slice(max).join(', ')}>+{names.length - max}</span>}
    </>
  )
}

/** Not a tag: a muted line under the author, "↓ 42M downloads" (exact count on hover). */
export function Downloads({ n, className = '' }: { n: number; className?: string }) {
  const { t, language } = useApp()
  return (
    <span className={`inline-flex items-center gap-1 text-xs text-muted ${className}`} title={n.toLocaleString(language)}>
      <Download size={11} />{compact(n, language)} {t.search.downloadsWord}
    </span>
  )
}

/** An instance's version and loader ("Forge 47.4.10"). */
export function InstanceTags({ inst, className = '' }: { inst: Instance; className?: string }) {
  return (
    <div className={`flex gap-2 flex-wrap ${className}`}>
      <VersionTag versions={[inst.version]} />
      <span className="tag bg-gold-soft">{inst.loaderLabel}</span>
    </div>
  )
}
