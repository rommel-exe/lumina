import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, LogIn, LogOut, Mail, MailCheck, RefreshCcw, Sparkles } from 'lucide-react'
import { fmtDate } from '../../lib/date'
import { useLuminaStore } from '../../state/store'
import { GlassPanel } from '../../components/ui/GlassPanel'
import type { EmailItem } from '../../state/models'
import { summarizeEmail } from '../../lib/emailSummary'
import {
  acquireOutlookAccessToken,
  getOutlookSetupHint,
  getOutlookAccounts,
  getSignedInAccount,
  isOutlookAuthConfigured,
  setActiveOutlookAccount,
  signInToOutlook,
  signOutOfOutlook,
} from '../../lib/outlookAuth'

type OutlookGraphMessage = {
  id: string
  subject?: string
  bodyPreview?: string
  body?: { content?: string }
  webLink?: string
  isRead?: boolean
  importance?: 'low' | 'normal' | 'high'
  receivedDateTime?: string
  from?: {
    emailAddress?: {
      address?: string
      name?: string
    }
  }
}

type OutlookGraphResponse = {
  value?: OutlookGraphMessage[]
}

type OutlookAccount = {
  homeAccountId: string
  name?: string
  username?: string
}

const toPlainText = (value: string | undefined): string => {
  if (!value) return ''
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

const mapOutlookMessage = (message: OutlookGraphMessage, account: OutlookAccount): EmailItem => ({
  id: `outlook-${account.homeAccountId}-${message.id}`,
  from:
    message.from?.emailAddress?.name ??
    message.from?.emailAddress?.address ??
    'Unknown sender',
  subject: message.subject?.trim() || '(No subject)',
  snippet: message.bodyPreview?.trim() || 'No preview available.',
  body: toPlainText(message.body?.content),
  webLink: message.webLink,
  provider: 'outlook',
  accountHomeId: account.homeAccountId,
  accountLabel: account.name ?? account.username,
  isRead: message.isRead,
  importance: message.importance,
  receivedAt: message.receivedDateTime ?? new Date().toISOString(),
  linkedTaskIds: [],
  linkedNoteIds: [],
})

export const EmailView = () => {
  const emails = useLuminaStore((s) => s.data.emails)
  const tasks = useLuminaStore((s) => s.data.tasks)
  const linkEmailToTask = useLuminaStore((s) => s.linkEmailToTask)
  const replaceEmails = useLuminaStore((s) => s.replaceEmails)

  const [selectedId, setSelectedId] = useState(emails[0]?.id ?? '')
  const [accounts, setAccounts] = useState<OutlookAccount[]>([])
  const [activeAccountId, setActiveAccountId] = useState('')
  const [query, setQuery] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  const [hasAutoSynced, setHasAutoSynced] = useState(false)
  const selected = emails.find((email) => email.id === selectedId)

  const summary = useMemo(() => (selected ? summarizeEmail(selected) : null), [selected])

  const filteredByAccount = useMemo(() => {
    if (!activeAccountId) return emails
    return emails.filter(
      (email) => email.provider !== 'outlook' || email.accountHomeId === activeAccountId,
    )
  }, [emails, activeAccountId])

  const signedIn = accounts.length > 0

  useEffect(() => {
    if (!isOutlookAuthConfigured) return

    void (async () => {
      try {
        const account = await getSignedInAccount()
        const allAccounts = await getOutlookAccounts()
        if (allAccounts.length === 0) return

        setAccounts(allAccounts)
        const selectedAccount = account ?? allAccounts[0]
        setActiveAccountId(selectedAccount.homeAccountId)
      } catch {
        // No active account yet.
      }
    })()
  }, [])

  useEffect(() => {
    if (!selectedId && filteredByAccount[0]?.id) {
      setSelectedId(filteredByAccount[0].id)
      return
    }

    if (selectedId && !filteredByAccount.some((email) => email.id === selectedId)) {
      setSelectedId(filteredByAccount[0]?.id ?? '')
    }
  }, [filteredByAccount, selectedId])

  useEffect(() => {
    if (!signedIn || hasAutoSynced) return
    setHasAutoSynced(true)
    void syncOutlookInbox(activeAccountId)
  }, [signedIn, activeAccountId, hasAutoSynced])

  const filteredEmails = useMemo(() => {
    const search = query.trim().toLowerCase()
    if (!search) return filteredByAccount
    return filteredByAccount.filter((email) => {
      const text = `${email.from} ${email.subject} ${email.snippet}`.toLowerCase()
      return text.includes(search)
    })
  }, [filteredByAccount, query])

  const refreshAccounts = async () => {
    const active = await getSignedInAccount()
    const allAccounts = await getOutlookAccounts()
    setAccounts(allAccounts)

    if (allAccounts.length === 0) {
      setActiveAccountId('')
      return
    }

    const resolved = active ?? allAccounts[0]
    setActiveAccountId(resolved.homeAccountId)
  }

  const handleSignIn = async () => {
    if (!isOutlookAuthConfigured) {
      setSyncMessage(getOutlookSetupHint())
      return
    }

    setIsSigningIn(true)
    setSyncMessage('Redirecting to Microsoft sign-in...')

    try {
      const account = await signInToOutlook()

      if (!account) {
        setSyncMessage('Continue sign-in in this window. You will return here automatically.')
        return
      }

      await refreshAccounts()
      setHasAutoSynced(false)
      setSyncMessage(`Signed in as ${account.name ?? account.username}.`)
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : 'Outlook sign-in failed.')
    } finally {
      setIsSigningIn(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOutOfOutlook(activeAccountId || undefined)
      setAccounts([])
      setActiveAccountId('')
      setHasAutoSynced(false)
      setSyncMessage('Signed out from Outlook.')
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : 'Sign-out failed.')
    }
  }

  const syncOutlookInbox = async (accountOverride?: string) => {
    if (!isOutlookAuthConfigured) {
      setSyncMessage(getOutlookSetupHint())
      return
    }

    if (!signedIn) {
      setSyncMessage('Sign in with Outlook first.')
      return
    }

    setIsSyncing(true)
    setSyncMessage('Syncing Outlook inbox...')

    try {
      const targetAccountId = accountOverride || activeAccountId

      if (targetAccountId) {
        await setActiveOutlookAccount(targetAccountId)
      }

      const token = await acquireOutlookAccessToken(targetAccountId || undefined)

      const targetAccount =
        accounts.find((account) => account.homeAccountId === targetAccountId) ??
        (await getSignedInAccount())

      if (!targetAccount) {
        throw new Error('No active Outlook account selected.')
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        Prefer: 'outlook.body-content-type="text"',
      }

      // Prioritize the real Inbox folder for a canonical inbox experience.
      let response = await fetch(
        'https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=50&$select=id,subject,bodyPreview,body,from,receivedDateTime,webLink,isRead,importance&$orderby=receivedDateTime%20desc',
        { headers },
      )

      if (!response.ok) {
        response = await fetch(
          'https://graph.microsoft.com/v1.0/me/messages?$top=50&$select=id,subject,bodyPreview,body,from,receivedDateTime,webLink,isRead,importance&$orderby=receivedDateTime%20desc',
          { headers },
        )
      }

      if (!response.ok) {
        const failure = await response.text()
        throw new Error(`Outlook sync failed (${response.status}): ${failure.slice(0, 180)}`)
      }

      const payload = (await response.json()) as OutlookGraphResponse
      const mapped = (payload.value ?? []).map((message) =>
        mapOutlookMessage(message, {
          homeAccountId: targetAccount.homeAccountId,
          name: targetAccount.name,
          username: targetAccount.username,
        }),
      )

      if (mapped.length === 0) {
        setSyncMessage('Connected, but Inbox is empty for this account.')
      } else {
        const nextEmails = [
          ...emails.filter(
            (email) => !(email.provider === 'outlook' && email.accountHomeId === targetAccount.homeAccountId),
          ),
          ...mapped,
        ].sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())

        replaceEmails(nextEmails)
        setSelectedId(mapped[0].id)
        setSyncMessage(`Inbox synced: ${mapped.length} emails loaded.`)
      }
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : 'Outlook sync failed.')
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-2 overflow-hidden sm:gap-3 md:grid-cols-[24rem_minmax(0,1fr)]">
      <GlassPanel className="min-h-0 overflow-y-auto p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-text-tertiary">Inbox</p>
          {accounts.length > 0 ? (
            <select
              value={activeAccountId}
              onChange={(event) => {
                const nextId = event.target.value
                setActiveAccountId(nextId)
                void setActiveOutlookAccount(nextId)
              }}
              className="h-7 max-w-[180px] rounded-md border border-border-subtle bg-input px-2 text-[10px] text-text-primary"
            >
              {accounts.map((account) => (
                <option key={account.homeAccountId} value={account.homeAccountId}>
                  {account.name ?? account.username ?? 'Outlook account'}
                </option>
              ))}
            </select>
          ) : null}
        </div>

        <div className="mb-3 space-y-2 rounded-lg border border-border-subtle bg-window p-2">
          {!isOutlookAuthConfigured ? (
            <p className="rounded-md border border-border-subtle bg-panel px-2 py-1.5 text-[10px] text-text-tertiary">
              {getOutlookSetupHint()}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border-subtle bg-panel px-2 text-[11px] font-semibold text-text-secondary transition hover:bg-window hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogIn size={12} />
              {isSigningIn ? 'Signing...' : signedIn ? 'Add account' : 'Sign in'}
            </button>

            <button
              type="button"
              onClick={() => void syncOutlookInbox()}
              disabled={isSyncing || !signedIn || !isOutlookAuthConfigured}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border-subtle bg-panel px-2 text-[11px] font-semibold text-text-secondary transition hover:bg-window hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSyncing ? <RefreshCcw size={12} className="animate-spin" /> : <MailCheck size={12} />}
              Sync
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={!signedIn}
              className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-border-subtle bg-panel px-2 text-[11px] font-semibold text-text-secondary transition hover:bg-window hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut size={12} />
              Sign out
            </button>

            <div className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-border-subtle bg-panel px-2 text-[11px] font-medium text-text-secondary">
              <Mail size={12} />
              {signedIn ? `${accounts.length} acct` : 'No account'}
            </div>
          </div>

          {syncMessage ? <p className="text-[10px] text-text-tertiary">{syncMessage}</p> : null}
        </div>

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search inbox"
          className="mb-2 h-8 w-full rounded-md border border-border-subtle bg-input px-2 text-[11px] text-text-primary outline-none focus:border-border-strong"
        />

        <div className="space-y-1">
          {filteredEmails.map((email) => (
            <button
              key={email.id}
              onClick={() => setSelectedId(email.id)}
              className={`w-full rounded-lg border p-2.5 text-left transition ${
                selectedId === email.id
                  ? 'border-accent bg-accent-soft shadow-sm'
                  : 'border-border-subtle bg-panel hover:bg-window'
              }`}
            >
              <div className="mb-0.5 flex items-center justify-between gap-2">
                <p className={`truncate text-[11px] ${email.isRead ? 'font-medium text-text-secondary' : 'font-semibold text-text-primary'}`}>
                  {email.from}
                </p>
                <p className="shrink-0 text-[10px] text-text-tertiary">{fmtDate(email.receivedAt)}</p>
              </div>
              <p className={`truncate text-[12px] ${email.isRead ? 'font-medium text-text-primary' : 'font-semibold text-text-primary'}`}>
                {email.subject}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[10px] text-text-secondary">{email.snippet}</p>
            </button>
          ))}

          {filteredEmails.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border-subtle bg-window p-3 text-[11px] text-text-tertiary">
              No emails match your search.
            </div>
          ) : null}
        </div>
      </GlassPanel>

      <GlassPanel className="min-h-0 overflow-y-auto p-6">
        {selected ? (
          <div className="space-y-6">
            <div className="pb-4 border-b border-border-subtle">
              <p className="text-xl font-medium text-text-primary mb-1">{selected.subject}</p>
              <p className="text-sm text-text-secondary">
                {selected.from} <span className="mx-2 opacity-50">•</span> {fmtDate(selected.receivedAt)}
              </p>
            </div>

            {summary ? (
              <div className="rounded-xl border border-accent/35 bg-accent-soft/60 p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
                    <Sparkles size={12} />
                    AI Summary
                  </p>
                  <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] ${
                    summary.urgency === 'High'
                      ? 'bg-red-100 text-red-600'
                      : summary.urgency === 'Medium'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {summary.urgency}
                  </span>
                </div>
                <p className="text-[12px] font-semibold text-text-primary">{summary.headline}</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[11px] text-text-secondary">
                  {summary.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">{selected.body ?? selected.snippet}</p>

            {selected.webLink ? (
              <a
                href={selected.webLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent"
              >
                Open in Outlook
                <ExternalLink size={13} />
              </a>
            ) : null}

            <select
              onChange={(event) => {
                if (!event.target.value) return
                linkEmailToTask(selected.id, event.target.value)
                event.target.value = ''
              }}
              className="h-9 w-64 mt-4 rounded-md border border-border-subtle bg-input px-3 text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 cursor-pointer shadow-sm transition-all"
            >
              <option value="">Link to task...</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="text-sm text-text-secondary">No email selected.</p>
        )}
      </GlassPanel>
    </div>
  )
}
