import { afterEach, describe, expect, it, vi } from "vitest"
import {
  BACKUP_META_KEY,
  BACKUP_REMINDER_DAYS,
  markBackupDone,
  readBackupMeta,
  shouldRemindBackup,
  snoozeBackupReminder,
  type BackupMeta,
} from "../backup-meta"
import { installLocalStorageMock } from "./local-storage-mock"

const NOW = new Date("2026-07-29T12:00:00.000Z")

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 86_400_000).toISOString()
}

function meta(patch: Partial<BackupMeta>): BackupMeta {
  return { firstSeenAt: daysAgo(60), lastBackupAt: null, snoozedAt: null, ...patch }
}

describe("shouldRemindBackup — decisão pura", () => {
  it("nunca lembra quem não tem dados", () => {
    expect(shouldRemindBackup(meta({}), NOW, false)).toBe(false)
  })

  it("usuário novo (firstSeenAt recente) tem paz até o ciclo vencer", () => {
    expect(shouldRemindBackup(meta({ firstSeenAt: daysAgo(2) }), NOW, true)).toBe(false)
    expect(
      shouldRemindBackup(meta({ firstSeenAt: daysAgo(BACKUP_REMINDER_DAYS) }), NOW, true)
    ).toBe(true)
  })

  it("backup recente silencia; backup velho reativa", () => {
    expect(shouldRemindBackup(meta({ lastBackupAt: daysAgo(3) }), NOW, true)).toBe(false)
    expect(shouldRemindBackup(meta({ lastBackupAt: daysAgo(20) }), NOW, true)).toBe(true)
  })

  it("'agora não' (snooze) vale um ciclo inteiro", () => {
    expect(
      shouldRemindBackup(meta({ lastBackupAt: daysAgo(30), snoozedAt: daysAgo(1) }), NOW, true)
    ).toBe(false)
    expect(
      shouldRemindBackup(meta({ lastBackupAt: daysAgo(30), snoozedAt: daysAgo(15) }), NOW, true)
    ).toBe(true)
  })

  it("vale a referência MAIS RECENTE entre backup, snooze e primeira visita", () => {
    expect(
      shouldRemindBackup(
        meta({ firstSeenAt: daysAgo(100), lastBackupAt: daysAgo(50), snoozedAt: daysAgo(2) }),
        NOW,
        true
      )
    ).toBe(false)
  })

  it("datas inválidas são ignoradas (fail-safe: lembra)", () => {
    expect(
      shouldRemindBackup(
        { firstSeenAt: "não-é-data", lastBackupAt: null, snoozedAt: null },
        NOW,
        true
      )
    ).toBe(true)
  })
})

describe("readBackupMeta / markBackupDone / snoozeBackupReminder (com storage)", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("primeira leitura cria a meta com firstSeenAt", () => {
    const storage = installLocalStorageMock()
    const m = readBackupMeta(NOW)
    expect(m.firstSeenAt).toBe(NOW.toISOString())
    expect(m.lastBackupAt).toBeNull()
    expect(JSON.parse(storage.getItem(BACKUP_META_KEY)!).firstSeenAt).toBe(
      NOW.toISOString()
    )
  })

  it("meta corrompida → recomeça sem explodir", () => {
    const storage = installLocalStorageMock()
    storage.setItem(BACKUP_META_KEY, "{quebrado")
    const m = readBackupMeta(NOW)
    expect(m.lastBackupAt).toBeNull()
  })

  it("markBackupDone registra a data e preserva o resto", () => {
    installLocalStorageMock()
    const first = readBackupMeta(new Date(daysAgo(30)))
    markBackupDone(NOW)
    const m = readBackupMeta(NOW)
    expect(m.lastBackupAt).toBe(NOW.toISOString())
    expect(m.firstSeenAt).toBe(first.firstSeenAt)
  })

  it("snoozeBackupReminder registra o 'agora não'", () => {
    installLocalStorageMock()
    readBackupMeta(new Date(daysAgo(30)))
    snoozeBackupReminder(NOW)
    expect(readBackupMeta(NOW).snoozedAt).toBe(NOW.toISOString())
  })
})
