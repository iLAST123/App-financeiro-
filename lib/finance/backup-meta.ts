/**
 * Estado do lembrete periódico de backup. Vive numa chave PRÓPRIA do
 * localStorage (fora do payload versionado e fora do arquivo de backup):
 * é estado de UX do aparelho — perdê-lo não perde dado nenhum.
 */

export const BACKUP_META_KEY = "meu-bolso:backup-meta:v1"

/** intervalo do lembrete: sem backup (ou adiado) há 14+ dias → avisa */
export const BACKUP_REMINDER_DAYS = 14

export interface BackupMeta {
  /** primeira vez que o app rodou com o lembrete (novos usuários têm 14 dias de paz) */
  firstSeenAt: string
  /** último export de backup JSON concluído */
  lastBackupAt: string | null
  /** último "agora não" do lembrete */
  snoozedAt: string | null
}

/** decisão pura (testável): lembrar quando a referência mais recente venceu */
export function shouldRemindBackup(
  meta: BackupMeta,
  now: Date,
  hasData: boolean
): boolean {
  if (!hasData) return false
  const refs = [meta.firstSeenAt, meta.lastBackupAt, meta.snoozedAt]
    .filter((r): r is string => r !== null)
    .map((r) => new Date(r).getTime())
    .filter((t) => Number.isFinite(t))
  if (refs.length === 0) return true
  const latest = Math.max(...refs)
  const elapsedDays = (now.getTime() - latest) / 86_400_000
  return elapsedDays >= BACKUP_REMINDER_DAYS
}

export function readBackupMeta(now: Date = new Date()): BackupMeta {
  const fresh: BackupMeta = {
    firstSeenAt: now.toISOString(),
    lastBackupAt: null,
    snoozedAt: null,
  }
  try {
    const raw = localStorage.getItem(BACKUP_META_KEY)
    if (!raw) {
      localStorage.setItem(BACKUP_META_KEY, JSON.stringify(fresh))
      return fresh
    }
    const parsed = JSON.parse(raw) as Partial<BackupMeta>
    return {
      firstSeenAt:
        typeof parsed.firstSeenAt === "string" ? parsed.firstSeenAt : fresh.firstSeenAt,
      lastBackupAt:
        typeof parsed.lastBackupAt === "string" ? parsed.lastBackupAt : null,
      snoozedAt: typeof parsed.snoozedAt === "string" ? parsed.snoozedAt : null,
    }
  } catch {
    return fresh
  }
}

function writeBackupMeta(patch: Partial<BackupMeta>) {
  try {
    const current = readBackupMeta()
    localStorage.setItem(BACKUP_META_KEY, JSON.stringify({ ...current, ...patch }))
  } catch {
    // sem storage disponível o lembrete apenas volta a aparecer — inofensivo
  }
}

/** registrar que um backup JSON acabou de ser exportado */
export function markBackupDone(now: Date = new Date()) {
  writeBackupMeta({ lastBackupAt: now.toISOString() })
}

/** "agora não": silencia o lembrete por mais um ciclo */
export function snoozeBackupReminder(now: Date = new Date()) {
  writeBackupMeta({ snoozedAt: now.toISOString() })
}
