import PixelIcon from '../ui/PixelIcon'
import { Download } from '../ui/icons'
import { useApp } from '../state'
import { compact, loaderName, versionRange } from '../utils/format'
import type { Instance } from '../api/types'

/** The tags every card uses, formatted one way: the Minecraft version(s) in
 *  green behind a grass block, loaders in gold, downloads in gray. */

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

export function DownloadsTag({ n }: { n: number }) {
  const { t, language } = useApp()
  return (
    <span className="tag bg-tag-gray gap-1 shrink-0" title={`${n.toLocaleString(language)} ${t.search.downloadsWord}`}>
      <Download size={10} />{compact(n, language)}
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
