import { fmt } from '../i18n/format'
import type { Instance, ProjectDetail, ProjectType } from '../api/types'

/** Whether an instance can plausibly take a project, and if not, why. This is
 *  an aggregate check over every version Modrinth has ever published for the
 *  project (see ProjectDetail) — good enough to sort and label a picker, but
 *  not the last word: a project can support 1.20.1 on Fabric and on Forge
 *  without any single version covering both, so PlanContent (the backend)
 *  remains the one precise, authoritative check before anything downloads. */
export type InstanceCompat = { instance: Instance; ok: boolean; reason: string }

export function computeCompat(detail: ProjectDetail, instances: Instance[], t: { vanilla: string; needsLoader: string; noBuild: string }): InstanceCompat[] {
  const type: ProjectType = detail.projectType
  const results = instances.map((instance) => {
    if (type === 'mod' && instance.loader === 'Vanilla') {
      return { instance, ok: false, reason: t.vanilla }
    }
    if (!detail.gameVersions.includes(instance.version)) {
      return { instance, ok: false, reason: fmt(t.noBuild, { version: instance.version }) }
    }
    if (type === 'mod' && !detail.loaders.includes(instance.loader.toLowerCase())) {
      return { instance, ok: false, reason: fmt(t.needsLoader, { loaders: detail.loaders.join('/') }) }
    }
    return { instance, ok: true, reason: '' }
  })
  // Compatible instances first, so the picker's best options are on top.
  return results.sort((a, b) => Number(b.ok) - Number(a.ok))
}
