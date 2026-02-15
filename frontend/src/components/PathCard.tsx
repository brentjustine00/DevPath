import { motion } from "framer-motion"
import type { PracticeDimension } from "../types"
import ProgressBar from "./ProgressBar"

type PathCardProps = {
  path: PracticeDimension
}

export default function PathCard({ path }: PathCardProps) {
  return (
    <motion.div
      whileHover={{ y: -6 }}
      className="rounded-2xl border border-ink/10 bg-paper/70 p-5 shadow-soft backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Practice Dimension</p>
          <h3 className="mt-2 text-xl font-semibold">{path.label}</h3>
        </div>
        <span className="rounded-full border border-ink/10 px-3 py-1 text-xs text-ink/70">
          {path.confidence}% confident
        </span>
      </div>
      <div className="mt-4">
        <ProgressBar value={path.confidence} />
      </div>
      <ul className="mt-4 space-y-2 text-sm text-ink/70">
        {path.evidence.map((item) => (
          <li key={item} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-neon" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  )
}
