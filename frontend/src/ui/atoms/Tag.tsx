import type { HTMLAttributes } from 'react'

/** Three-colour tag system:
 *  gray — neutral metadata (download counts, project type, version lists)
 *  green — active / verified / positive (an instance's Minecraft version, "Compatible")
 *  gold — secondary attributes and highlights (loader labels) */
export type TagTone = 'gray' | 'green' | 'gold'

const TONE: Record<TagTone, string> = {
  gray: 'bg-tag-gray',
  green: 'bg-green-soft',
  gold: 'bg-gold-soft',
}

type Props = HTMLAttributes<HTMLSpanElement> & { tone?: TagTone }

export default function Tag({ tone = 'gray', className = '', ...rest }: Props) {
  return <span className={`inline-flex items-center px-3 py-1 text-[11px] leading-[1.3] text-ink rounded-md whitespace-nowrap ${TONE[tone]} ${className}`} {...rest} />
}
