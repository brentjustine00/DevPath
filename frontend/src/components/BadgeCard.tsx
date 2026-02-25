import { motion } from "framer-motion"
import type { Badge } from "../types"

type BadgeCardProps = {
  badge: Badge
  showStatus?: boolean
  showRarity?: boolean
  showReward?: boolean
  showCriteria?: boolean
}

const rarityStyles = {
  common: "bg-ink/10 text-ink/70",
  rare: "bg-neon/20 text-ink",
  epic: "bg-glow/30 text-ink",
}

export default function BadgeCard({
  badge,
  showStatus = true,
  showRarity = true,
  showReward = true,
  showCriteria = true,
}: BadgeCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="rounded-2xl border border-ink/10 bg-paper/80 p-4 shadow-soft dark:border-slate-700/60 dark:bg-slate-900/70"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden>
            {badge.medal_icon || "🏅"}
          </span>
          <h4 className="text-lg font-semibold">
            {badge.icon ? `${badge.icon} ` : ""}
            {badge.label}
          </h4>
        </div>
        <div className="flex items-center gap-2">
          {showStatus && badge.achieved ? (
            <span className="rounded-full bg-neon/30 px-3 py-1.5 text-xs font-semibold text-ink">
              {badge.claimed ? "Claimed" : "Achieved"}
            </span>
          ) : null}
          {showRarity ? (
            <span className={`rounded-full px-3 py-1.5 text-xs ${rarityStyles[badge.rarity]}`}>
              {badge.rarity}
            </span>
          ) : null}
        </div>
      </div>
      <p className="mt-2 text-sm text-ink/70">{badge.description}</p>
      {showReward && badge.reward_xp ? (
        <p className="mt-2 text-xs font-semibold text-neon">Reward: +{badge.reward_xp} XP</p>
      ) : null}
      {showCriteria ? <p className="mt-3 text-xs text-ink/50">Criteria: {badge.criteria}</p> : null}
    </motion.div>
  )
}
