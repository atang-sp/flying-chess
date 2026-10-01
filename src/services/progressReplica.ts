import { scopedStorage } from './scopedStorage'
import { createLocalProgress, validateLocalProgress, type LocalProgress } from './localProgress'

export const REPLICA_KEY = 'flying_chess_progress_replica_v2'
const DEVICE_KEY = 'flying_chess_device_id'
export interface ProgressReplica {
  version: 2
  baseline: LocalProgress
  devices: Record<string, LocalProgress>
}

export function sameProgress(left: LocalProgress, right: LocalProgress): boolean {
  // PostgreSQL JSONB changes object-key order; equality must compare data, not ordering.
  const canonical = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonical)
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>
      return Object.fromEntries(
        Object.keys(record)
          .sort()
          .map(key => [key, canonical(record[key])])
      )
    }
    return value
  }
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right))
}

export function combineProgress(
  left: LocalProgress,
  right: LocalProgress,
  sum = false
): LocalProgress {
  const combine = (a: number, b: number) => (sum ? a + b : Math.max(a, b))
  const variants = { ...left.totals.variantCompletions }
  for (const [key, count] of Object.entries(right.totals.variantCompletions)) {
    const variant = key as keyof typeof variants
    variants[variant] = combine(variants[variant] ?? 0, count ?? 0)
  }
  const players = { ...left.players }
  for (const [name, player] of Object.entries(right.players)) {
    const existing = players[name]
    players[name] = {
      playerName: name,
      punishmentCount: combine(existing?.punishmentCount ?? 0, player.punishmentCount),
      mercyRequests: combine(existing?.mercyRequests ?? 0, player.mercyRequests),
    }
  }
  return {
    version: 1,
    totals: {
      completedGames: combine(left.totals.completedGames, right.totals.completedGames),
      punishmentCount: combine(left.totals.punishmentCount, right.totals.punishmentCount),
      mercyRequests: combine(left.totals.mercyRequests, right.totals.mercyRequests),
      longestChain: Math.max(left.totals.longestChain, right.totals.longestChain),
      variantCompletions: variants,
    },
    players,
  }
}

export function validateReplica(value: unknown): value is ProgressReplica {
  if (!value || typeof value !== 'object') return false
  const replica = value as ProgressReplica
  return (
    replica.version === 2 &&
    validateLocalProgress(replica.baseline) &&
    Boolean(replica.devices) &&
    typeof replica.devices === 'object' &&
    !Array.isArray(replica.devices) &&
    Object.keys(replica.devices).every(
      key => !['__proto__', 'prototype', 'constructor'].includes(key)
    ) &&
    Object.values(replica.devices).every(validateLocalProgress)
  )
}

export function loadReplica(progress: LocalProgress): ProgressReplica {
  const raw = scopedStorage.getItem(REPLICA_KEY)
  if (raw) {
    const replica: unknown = JSON.parse(raw)
    if (!validateReplica(replica)) throw new Error('Invalid local progress replica')
    return replica
  }
  return { version: 2, baseline: progress, devices: {} }
}

export function mergeReplicas(left: ProgressReplica, right: ProgressReplica): ProgressReplica {
  const devices = { ...left.devices }
  for (const [id, progress] of Object.entries(right.devices)) {
    devices[id] = combineProgress(devices[id] ?? createLocalProgress(), progress)
  }
  return { version: 2, baseline: combineProgress(left.baseline, right.baseline), devices }
}

export function replicaProgress(replica: ProgressReplica): LocalProgress {
  return Object.values(replica.devices).reduce(
    (sum, progress) => combineProgress(sum, progress, true),
    replica.baseline
  )
}

export function saveReplica(replica: ProgressReplica): void {
  scopedStorage.setItem(REPLICA_KEY, JSON.stringify(replica))
}

/** Each device owns one monotonic component. Replaying an upload is idempotent. */
export function recordProgressChange(previous: LocalProgress, next: LocalProgress): void {
  const replica = loadReplica(previous)
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, id)
  }
  const delta = createLocalProgress()
  const variants: Record<string, number> = {}
  for (const [key, value] of Object.entries(next.totals.variantCompletions)) {
    variants[key] = Math.max(
      0,
      (value ?? 0) -
        (previous.totals.variantCompletions[
          key as keyof typeof previous.totals.variantCompletions
        ] ?? 0)
    )
  }
  const players: Record<string, LocalProgress['players'][string]> = {}
  for (const [name, player] of Object.entries(next.players)) {
    players[name] = {
      playerName: name,
      punishmentCount: Math.max(
        0,
        player.punishmentCount - (previous.players[name]?.punishmentCount ?? 0)
      ),
      mercyRequests: Math.max(
        0,
        player.mercyRequests - (previous.players[name]?.mercyRequests ?? 0)
      ),
    }
  }
  const increment: LocalProgress = {
    ...delta,
    totals: {
      completedGames: Math.max(0, next.totals.completedGames - previous.totals.completedGames),
      punishmentCount: Math.max(0, next.totals.punishmentCount - previous.totals.punishmentCount),
      mercyRequests: Math.max(0, next.totals.mercyRequests - previous.totals.mercyRequests),
      longestChain: next.totals.longestChain,
      variantCompletions: variants,
    },
    players,
  }
  replica.devices[id] = combineProgress(replica.devices[id] ?? delta, increment, true)
  saveReplica(replica)
}
