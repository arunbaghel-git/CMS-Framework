import { describe, expect, it } from 'vitest'

import {
  DEFAULT_ENQUIRY_MAIL_SUBJECT,
  enquiryMailVariables,
  parseEmailList,
  renderEnquiryMail,
} from './enquiry-mail.js'
import { createFormSchema, updateFormSchema } from './schemas/form.js'

/**
 * Team wali enquiry mail — D-109.
 *
 * Saare niyam yahan pure function me hain taaki unka test ho sake (D-105, D-108 §9 ka sabak).
 * Teen suraksha niyam sabse upar hain — escape, subject ki newline, anjaan variable.
 */

const form = {
  name: 'Package Enquiry',
  fields: [
    { key: 'fullName', label: 'Full name', type: 'text', show: true },
    { key: 'email', label: 'Email', type: 'text', show: true },
    { key: 'message', label: 'Message', type: 'textarea', show: true },
    { key: 'consent', label: 'Consent', type: 'checkbox', show: true },
    { key: 'budget', label: 'Budget', type: 'select', show: false },
    { key: 'sourcePage', label: 'Source', type: 'hidden', show: true },
  ],
}

const values = {
  fullName: 'Ananya Rao',
  email: 'ananya@example.com',
  message: 'Line one\nLine two',
  consent: true,
}

const render = (template, ctx = {}) =>
  renderEnquiryMail(template, { form, values, pageUrl: 'https://site.test/packages/x', ...ctx })

describe('renderEnquiryMail — suraksha', () => {
  it('bharne wale ki value HTML-escape hoti hai — link ya script nahi ban sakta', () => {
    const { html } = render(
      { subject: 'x', body: '<p>From {{fullName}}</p>' },
      { values: { fullName: '<a href="https://evil.test">click</a><script>x()</script>' } },
    )

    expect(html).not.toContain('<a href')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;a href=&quot;https://evil.test&quot;&gt;')
  })

  it('all_fields ki table me bhi escape', () => {
    const { html } = render(
      { subject: 'x', body: '<p>{{all_fields}}</p>' },
      { values: { fullName: '<b>x</b>' } },
    )

    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;')
    expect(html).not.toContain('<b>x</b>')
  })

  it('subject me newline nahi bachti — header injection', () => {
    const { subject } = render(
      { subject: 'Enquiry from {{fullName}}', body: '' },
      { values: { fullName: 'Evil\r\nBcc: victim@x.com' } },
    )

    expect(subject).not.toMatch(/[\r\n]/)
    expect(subject).toBe('Enquiry from Evil Bcc: victim@x.com')
  })

  it('anjaan variable khaali ho jaata hai, {{…}} mail me nahi chhapta', () => {
    const { subject, html } = render({
      subject: 'Hi {{nope}}',
      body: '<p>A {{deletedField}} B</p>',
    })

    expect(subject).toBe('Hi')
    expect(html).toBe('<p>A  B</p>')
  })
})

describe('renderEnquiryMail — bharna', () => {
  it('field ke variables form ke apne keys se', () => {
    const { subject, html } = render(
      {
        subject: 'New lead: {{fullName}} ({{form_name}})',
        body: '<p>Email: {{email}} · id {{enquiry_id}}</p>',
      },
      { enquiryId: 'abc123' },
    )

    expect(subject).toBe('New lead: Ananya Rao (Package Enquiry)')
    expect(html).toBe('<p>Email: ananya@example.com · id abc123</p>')
  })

  it('checkbox ka true "Yes" padhta hai, textarea ki nayi line <br>', () => {
    const { html } = render({ subject: 'x', body: '<p>{{consent}} — {{message}}</p>' })

    expect(html).toBe('<p>Yes — Line one<br>Line two</p>')
  })

  it('akela {{all_fields}} wala <p> poori table se badalta hai — <p> ke andar <table> nahi', () => {
    const { html } = render({ subject: 'x', body: '<p>Hi</p><p>{{all_fields}}</p>' })

    expect(html).toMatch(/^<p>Hi<\/p><table /)
    expect(html).not.toContain('<p><table')
  })

  it('all_fields form ke kram me, sirf bhare hue khaane, label ke saath', () => {
    const { text } = render({ subject: 'x', body: '<p>{{all_fields}}</p>' })

    expect(text).toBe(
      'Full name: Ananya Rao\nEmail: ananya@example.com\nMessage: Line one\nLine two\nConsent: Yes',
    )
  })

  it('form badal gaya ho to bhi koi value mail se gayab nahi hoti', () => {
    const { text } = render(
      { subject: 'x', body: '<p>{{all_fields}}</p>' },
      { values: { fullName: 'A', oldField: 'still here' } },
    )

    expect(text).toContain('oldField: still here')
  })

  it('page_url saada text hai — admin ke apne link ke andar bhi nahi tootta', () => {
    const { html } = render({ subject: 'x', body: '<p><a href="{{page_url}}">View page</a></p>' })

    expect(html).toBe('<p><a href="https://site.test/packages/x">View page</a></p>')
  })

  it('khaali subject aur khaali message pe default template', () => {
    for (const body of ['', '<p></p>', '<p>&nbsp;</p>']) {
      const out = render({ subject: '  ', body })

      expect(out.subject).toBe('New enquiry — Package Enquiry')
      expect(out.text).toContain('Full name: Ananya Rao')
      expect(out.text).toContain('https://site.test/packages/x')
    }
  })

  it('23 Sep se pehle ka form (notifyEmail hai hi nahi) default pe chalta hai', () => {
    const out = render(undefined)

    expect(out.subject).toBe(
      DEFAULT_ENQUIRY_MAIL_SUBJECT.replace('{{form_name}}', 'Package Enquiry'),
    )
  })

  it('text roop me paragraph alag line pe', () => {
    const { text } = render({ subject: 'x', body: '<p>One</p><p>Two &amp; three</p>' })

    expect(text).toBe('One\nTwo & three')
  })
})

describe('parseEmailList', () => {
  it('comma, semicolon, space — sab chalte hain; duplicate aur kachra girta hai', () => {
    expect(parseEmailList('sales@x.com, ops@x.com;Sales@x.com  not-an-email, a@b')).toEqual([
      'sales@x.com',
      'ops@x.com',
    ])
  })

  it('khaali pe khaali list', () => {
    expect(parseEmailList('')).toEqual([])
    expect(parseEmailList(undefined)).toEqual([])
  })
})

describe('enquiryMailVariables', () => {
  it('dikhne wale fields, phir chaar system variable — hidden aur chhupe hue nahi', () => {
    const tokens = enquiryMailVariables(form).map((v) => v.token)

    expect(tokens).toEqual([
      'fullName',
      'email',
      'message',
      'consent',
      'all_fields',
      'form_name',
      'page_url',
      'enquiry_id',
    ])
  })
})

describe('formSchema.notifyEmail', () => {
  it('naya form default template ke saath banta hai', () => {
    const parsed = createFormSchema.parse({ name: 'X' })

    expect(parsed.notifyEmail.subject).toBe(DEFAULT_ENQUIRY_MAIL_SUBJECT)
    expect(parsed.notifyEmail.body).toContain('{{all_fields}}')
  })

  it('adhoora PATCH notifyEmail ko chhuta hi nahi', () => {
    expect(updateFormSchema.parse({ name: 'X' }).notifyEmail).toBeUndefined()
  })
})
