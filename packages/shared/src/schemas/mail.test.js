import { describe, expect, it } from 'vitest'

import { mailSettingsSchema, toMailUpdate, updateMailSchema } from './settings.js'

/**
 * `Settings ▸ Email / SMTP` ka shared contract — D-108.
 *
 * ⚠️ **Ye file ek asli bug ke baad bani.** Screen `GET /api/settings/mail` ka jawab seedha apne
 * form me rakhti thi, aur us jawab me `hasPassword` hota hai — jo **padhne** ki cheez hai,
 * likhne ki nahi. Save pe wo poora form `updateMailSchema` (`.strict()`) me chala jaata tha aur
 * screen pe aata tha: _"Unrecognized key(s) in object: 'hasPassword'"_. Kuch save hi nahi hota tha.
 *
 * ⚠️ **29 API test isse nahi pakad paaye**, kyunki wo sab payload khud banate hain — toota hua
 * raasta sirf screen me tha. Isiliye niyam ab `toMailUpdate()` me hai, `handleSubmit()` ke andar
 * nahi: bilkul wahi faisla jo D-105 me `lib/master-list-payload.js` pe liya gaya tha.
 */

describe('toMailUpdate', () => {
  /** Asli regression — yahi shakl live pe fail hui thi. */
  it('GET ka jawab seedha PATCH me ja sake — hasPassword gir jaata hai', () => {
    const fromServer = {
      host: 'localhost',
      port: 1025,
      user: '',
      fromName: 'Test Site',
      fromEmail: 'cms@test.local',
      hasPassword: true,
    }

    const payload = toMailUpdate({ ...fromServer, password: '' })

    expect(payload.hasPassword).toBeUndefined()
    expect(updateMailSchema.safeParse(payload).success).toBe(true)
  })

  it('baaki har khaana chhua nahi jaata', () => {
    expect(toMailUpdate({ host: 'a', port: 465, clearPassword: true })).toEqual({
      host: 'a',
      port: 465,
      clearPassword: true,
    })
  })

  it('khaali aur undefined dono pe phat-ta nahi', () => {
    expect(toMailUpdate(undefined)).toEqual({})
    expect(toMailUpdate({})).toEqual({})
  })

  /**
   * ⚠️ Ye test us din phatega jis din `.strict()` hat jaayegi — aur wahi din hai jab galat likhi
   * hui key (jaise `fromemail`) chup-chaap girne lagegi, bina kisi error ke. D-103 ka `showOn`.
   */
  it('hasPassword bhejna sach me 400 wali galti hai — isiliye use girana zaroori hai', () => {
    expect(updateMailSchema.safeParse({ host: 'a', hasPassword: true }).success).toBe(false)
  })
})

describe('mailSettingsSchema', () => {
  it('khaali object pe defaults — port 587', () => {
    expect(mailSettingsSchema.parse({})).toEqual({
      host: '',
      port: 587,
      user: '',
      password: '',
      fromName: '',
      fromEmail: '',
    })
  })

  it('port ki hadd 1–65535', () => {
    expect(mailSettingsSchema.safeParse({ port: 0 }).success).toBe(false)
    expect(mailSettingsSchema.safeParse({ port: 70000 }).success).toBe(false)
    expect(mailSettingsSchema.parse({ port: '465' }).port).toBe(465)
  })

  it('From Email khaali ho sakta hai, par aadha-adhoora nahi', () => {
    expect(mailSettingsSchema.safeParse({ fromEmail: '' }).success).toBe(true)
    expect(mailSettingsSchema.safeParse({ fromEmail: 'hello@site.com' }).success).toBe(true)
    expect(mailSettingsSchema.safeParse({ fromEmail: 'hello@' }).success).toBe(false)
  })

  /** `clearPassword` ek action hai, field nahi — wo sirf update wale schema me hai. */
  it('clearPassword store hone wali shakl me nahi hai', () => {
    expect(mailSettingsSchema.safeParse({ clearPassword: true }).success).toBe(false)
    expect(updateMailSchema.safeParse({ clearPassword: true }).success).toBe(true)
  })
})
