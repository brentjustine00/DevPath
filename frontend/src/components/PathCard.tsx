import { motion } from "framer-motion"
import type { PracticeDimension } from "../types"
import ProgressBar from "./ProgressBar"

type PathCardProps = {
  path: PracticeDimension
}

function getActivities(path: PracticeDimension) {
  const label = path.label.toLowerCase()
  const primaryEvidence = path.evidence[0] || "your main stack"

  if (label.includes("frontend")) {
    return [
      `Build a responsive dashboard in ${primaryEvidence}.`,
      "Create a reusable component library with variants and docs.",
      "Clone one production UI and add accessibility + keyboard support.",
      "Ship one interactive feature with form validation and API calls.",
    ]
  }

  if (label.includes("backend")) {
    return [
      `Build a REST API service using ${primaryEvidence}.`,
      "Design a normalized database schema and CRUD endpoints.",
      "Add auth, request validation, and structured error handling.",
      "Write integration tests for critical endpoints.",
    ]
  }

  if (label.includes("data") || label.includes("ml")) {
    return [
      "Create an end-to-end data cleaning + analysis notebook.",
      "Build a small ML model and publish evaluation metrics.",
      "Expose model inference through an API endpoint.",
      "Track experiments and compare model versions.",
    ]
  }

  return [
    "Build a CLI/tooling project for your workflow.",
    "Automate one repetitive task with scripts or CI.",
    "Improve logging, observability, and developer docs.",
    "Create a deployment pipeline from commit to production.",
  ]
}

export default function PathCard({ path }: PathCardProps) {
  const activities = getActivities(path)

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
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-ink/50">
        Activity / project list
      </p>
      <ul className="mt-3 space-y-2 text-sm text-ink/70">
        {activities.map((item, index) => (
          <li key={`${path.label}-activity-${index}`} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-neon" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  )
}
