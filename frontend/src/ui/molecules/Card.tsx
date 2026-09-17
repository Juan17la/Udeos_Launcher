import type { HTMLAttributes, ReactNode } from 'react'
import { Panel } from '../atoms/Surface'

/** Neumorphic content card. Column by default (instance/result cards);
 *  `row` lays children out horizontally for list rows, on the second
 *  surface tone so rows read apart from the panels around them. */
type Props = HTMLAttributes<HTMLDivElement> & { row?: boolean; hover?: boolean; children?: ReactNode }

export default function Card({ row, hover, className = '', children, ...rest }: Props) {
  return (
    <Panel hover={hover} tone={row ? 'alt' : 'base'} className={`${row ? 'flex-row items-center px-4 py-3' : 'p-5'} ${className}`} {...rest}>
      {children}
    </Panel>
  )
}
