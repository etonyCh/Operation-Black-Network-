import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-navy-700 text-slate-100',
        secondary: 'border-transparent bg-navy-800 text-slate-300',
        destructive: 'border-transparent bg-accent/20 text-accent border border-accent/50',
        success: 'border-transparent bg-teal/20 text-teal border border-teal/50',
        warning: 'border-transparent bg-yellow-500/20 text-yellow-500 border border-yellow-500/50',
        outline: 'text-slate-100',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
