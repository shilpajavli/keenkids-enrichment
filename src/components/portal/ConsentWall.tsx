'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ConsentWall({ studentId, studentName }: { studentId: string; studentName: string }) {
  const [photoConsent, setPhotoConsent] = useState(false)
  const [liabilityConsent, setLiabilityConsent] = useState(false)
  const [fullName, setFullName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const canSubmit = photoConsent && liabilityConsent && fullName.trim().length > 2

  async function submit() {
    if (!canSubmit) return
    setSaving(true)
    setError('')
    const res = await fetch('/api/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: studentId,
        full_name_signed: fullName.trim(),
        photo_consent: photoConsent,
        liability_consent: liabilityConsent,
      }),
    })
    const json = await res.json()
    setSaving(false)
    if (json.success) {
      router.refresh()
    } else {
      setError(json.error ?? 'Something went wrong')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px' }}>
      <div style={{ maxWidth: 560, width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 24, fontWeight: 300, color: '#1A1814', margin: '0 0 8px' }}>
            Before you continue
          </h1>
          <p style={{ fontSize: 14, color: '#8A8580', margin: 0 }}>
            Please review and sign the following forms for <strong style={{ color: '#1A1814' }}>{studentName}</strong>
          </p>
        </div>

        {/* Liability Waiver */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid rgba(184,151,58,0.2)', padding: 24, marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1A1814', margin: '0 0 12px' }}>Liability Waiver</h2>
          <div style={{ fontSize: 13, color: '#4A4640', lineHeight: 1.7, marginBottom: 16, maxHeight: 160, overflowY: 'auto', paddingRight: 4 }}>
            <p style={{ margin: '0 0 10px' }}>
              I, the parent/guardian of the above-named child, acknowledge that participation in KeenKids Enrichment activities involves certain inherent risks, including but not limited to physical injury during activities.
            </p>
            <p style={{ margin: '0 0 10px' }}>
              I hereby release, waive, and discharge KeenKids Enrichment, its staff, volunteers, and representatives from any and all liability, claims, or demands arising out of or related to my child's participation in the program, including injury, illness, or loss of personal property, except where caused by gross negligence or willful misconduct.
            </p>
            <p style={{ margin: 0 }}>
              I confirm that my child is in good health and is able to participate in program activities. I authorize KeenKids Enrichment staff to seek emergency medical care for my child if I cannot be reached.
            </p>
          </div>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={liabilityConsent}
              onChange={e => setLiabilityConsent(e.target.checked)}
              style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0 }}
            />
            <span style={{ fontSize: 13, color: '#1A1814', lineHeight: 1.5 }}>
              I have read and agree to the Liability Waiver on behalf of my child.
            </span>
          </label>
        </div>

        {/* Photo & Media Release */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid rgba(184,151,58,0.2)', padding: 24, marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1A1814', margin: '0 0 12px' }}>Photo & Media Release</h2>
          <div style={{ fontSize: 13, color: '#4A4640', lineHeight: 1.7, marginBottom: 16 }}>
            <p style={{ margin: 0 }}>
              I grant KeenKids Enrichment permission to photograph and/or video record my child during program activities. These images and recordings may be used for educational, promotional, and marketing purposes, including on our website and social media channels. No names will be published without additional consent. I waive any right to compensation for the use of these materials.
            </p>
          </div>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={photoConsent}
              onChange={e => setPhotoConsent(e.target.checked)}
              style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0 }}
            />
            <span style={{ fontSize: 13, color: '#1A1814', lineHeight: 1.5 }}>
              I consent to photos and videos of my child being used for KeenKids Enrichment marketing and social media.
            </span>
          </label>
        </div>

        {/* Digital Signature */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid rgba(184,151,58,0.2)', padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1A1814', margin: '0 0 4px' }}>Digital Signature</h2>
          <p style={{ fontSize: 12, color: '#8A8580', margin: '0 0 12px' }}>Type your full legal name to sign</p>
          <input
            className="input"
            style={{ fontSize: 14, width: '100%', boxSizing: 'border-box' }}
            placeholder="Your full name"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
          />
        </div>

        {error && <p style={{ fontSize: 13, color: '#791F1F', marginBottom: 12 }}>{error}</p>}

        <button
          onClick={submit}
          disabled={!canSubmit || saving}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 8,
            border: 'none',
            background: canSubmit ? '#B8973A' : '#D4C9A8',
            color: 'white',
            fontSize: 14,
            fontWeight: 600,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            transition: 'background 0.2s',
          }}
        >
          {saving ? 'Saving…' : 'I Agree — Continue to Portal'}
        </button>
        <p style={{ fontSize: 11, color: '#8A8580', textAlign: 'center', marginTop: 12 }}>
          Signed electronically on {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>
    </div>
  )
}
