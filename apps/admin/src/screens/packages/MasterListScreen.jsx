import { useCallback, useEffect, useState } from 'react'

import { HOTEL_CATEGORIES, HOTEL_CATEGORY_LABEL } from '@cms/shared'

import { api, errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { confirmRemove } from '../../lib/confirm.js'
import { useTaxonomyList } from './usePackages.js'
import './Packages.css'

/**
 * Hotels · Add Ons · Transfer — spec 007 §1.3, §1.4, §1.6.
 *
 * **Ek screen teenon ke liye**, config se. Wahi wajah jo API pe hai (D-48 §1): teenon ka
 * lifecycle bilkul ek jaisa hai — flat CRUD, koi publish nahi, koi trash nahi. Teen alag
 * screens likhne ka matlab hota wahi form, wahi table aur wahi error handling teen jagah,
 * aur is repo ne do baar dekha hai ki do jagah rakhi hui ek cheez ek din alag ho jaati hai.
 *
 * Layout `#s-taxonomy` wala hi hai — left me form, right me list. Design me in teenon ki
 * apni screen nahi thi ("naya" likha hai, spec 007 §5), aur unke liye ek naya layout
 * banane se behtar hai wahi shape use karna jo client pehle se in screens pe dekh raha hai.
 */

/**
 * Har list ka apna shape — sirf **do** cheezein alag hain: kaunse fields hain, aur list me
 * kaunse column. Baaki sab generic hai.
 */
export const MASTER_LISTS = {
  hotels: {
    endpoint: '/hotels',
    title: 'Hotels',
    singular: 'Hotel',
    permission: 'hotel',
    fields: [
      { key: 'destinationId', label: 'Destination', type: 'destination', required: true },
      { key: 'category', label: 'Category', type: 'hotelCategory', required: true },
      { key: 'name', label: 'Hotel name', type: 'text', required: true },
      {
        key: 'room',
        label: 'Room',
        type: 'text',
        hint: 'e.g. Deluxe, twin sharing — this is what prints in the table on the public page',
      },
      {
        /**
         * Optional (client, 27 Aug — D-57). Do jagah dikhta hai: public table ka Note
         * column, aur category card ki beech wali line — isiliye ek chhoti line hi theek
         * hai, poora paragraph nahi.
         *
         * Pehle ye har package pe alag likha jaata tha (`categoryPricing[].note`, D-53 §2).
         * Hotel ke record pe aane ka matlab hai: ek baar likho, har package me chalta hai —
         * wahi tark jo `room` pe laga tha (D-53 §3).
         */
        key: 'note',
        label: 'Note',
        type: 'text',
        hint: 'Optional, one short line — e.g. Sea-facing on Havelock',
      },
    ],
    columns: ['name', 'destinationId', 'category', 'room', 'note'],
  },
  addOns: {
    endpoint: '/add-ons',
    title: 'Add Ons',
    singular: 'Add-on',
    permission: 'addOn',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      {
        key: 'price',
        label: 'Price',
        type: 'text',
        /**
         * Free text hai, number nahi (spec 007 §1.4) — hint isiliye zaroori hai, warna
         * client `3500` likh kar chhod deta aur page pe basis gayab ho jaata.
         */
        hint: 'Free text — "₹3,500 – ₹4,500 pp" ya "₹2,500 per couple"',
      },
      {
        key: 'where',
        label: 'Where',
        type: 'text',
        hint: 'Place only — no mention of days, those belong to the package',
      },
    ],
    columns: ['name', 'price', 'where'],
  },
  transfers: {
    endpoint: '/transfers',
    title: 'Transfer',
    singular: 'Transfer',
    permission: 'transfer',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'icon', label: 'Icon', type: 'text', hint: 'e.g. car, ferry, flight' },
    ],
    columns: ['name', 'icon'],
  },
}

const COLUMN_LABEL = {
  name: 'Name',
  destinationId: 'Destination',
  category: 'Category',
  room: 'Room',
  note: 'Note',
  price: 'Price',
  where: 'Where',
  icon: 'Icon',
}

export default function MasterListScreen({ list }) {
  const config = MASTER_LISTS[list]
  const { can } = useAuth()
  const destinations = useTaxonomyList('destination')

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({})

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const res = await api.get(config.endpoint, { params: { limit: 200 } })
      setItems(res.data.data.items)
      setError(null)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [config.endpoint])

  useEffect(() => {
    load()
  }, [load])

  const canWrite = can(`${config.permission}.create`) || can(`${config.permission}.update`)

  function resetForm() {
    setEditingId(null)
    setForm({})
  }

  function startEdit(item) {
    setEditingId(item.id)
    setForm(Object.fromEntries(config.fields.map((f) => [f.key, item[f.key] ?? ''])))
    setNotice(null)
    setError(null)
  }

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setNotice(null)

    /**
     * Khaali strings **bheji nahi jaati**. `destinationId` pe khaali string bhejne ka
     * matlab hai server pe "ye destination dhoondho" — aur wo 422 deta hai, jabki asli
     * baat sirf itni hai ki field bhara hi nahi gaya.
     */
    const payload = Object.fromEntries(
      Object.entries(form).filter(([, value]) => value !== '' && value != null),
    )

    try {
      if (editingId) {
        await api.patch(`${config.endpoint}/${editingId}`, payload)
        setNotice(`${config.singular} updated.`)
      } else {
        await api.post(config.endpoint, payload)
        setNotice(`${config.singular} added.`)
      }

      resetForm()
      load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function remove(item) {
    if (!confirmRemove(item.name)) return

    setError(null)
    setNotice(null)

    try {
      await api.delete(`${config.endpoint}/${item.id}`)
      setNotice(`${item.name} deleted.`)
      if (editingId === item.id) resetForm()
      load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const destinationName = (id) => destinations.find((d) => d.id === id)?.name ?? '—'

  function cell(item, key) {
    if (key === 'destinationId') return destinationName(item[key])
    if (key === 'category') return HOTEL_CATEGORY_LABEL[item[key]] ?? item[key]

    return item[key] || '—'
  }

  function renderField(field) {
    const value = form[field.key] ?? ''
    const onChange = (v) => setForm((f) => ({ ...f, [field.key]: v }))

    if (field.type === 'destination') {
      return (
        <select
          className="sel"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
        >
          <option value="">Choose destination…</option>
          {destinations.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      )
    }

    if (field.type === 'hotelCategory') {
      return (
        <select
          className="sel"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
        >
          <option value="">Choose category…</option>
          {HOTEL_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {HOTEL_CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
      )
    }

    return (
      <input
        className="inp"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={field.required}
      />
    )
  }

  return (
    <>
      <div className="page-head">
        <h1>{config.title}</h1>
      </div>

      {error && (
        <div className="notice err" role="alert">
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
        </div>
      )}

      <div className="edit-grid tax-grid">
        {canWrite && (
          <form className="panel" onSubmit={submit}>
            <div className="panel-head">
              <h2>{editingId ? `Edit ${config.singular}` : `Add New ${config.singular}`}</h2>
            </div>
            <div className="panel-body">
              {config.fields.map((field) => (
                <div className="field" key={field.key}>
                  <label>{field.label}</label>
                  {renderField(field)}
                  {field.hint && <div className="hint">{field.hint}</div>}
                </div>
              ))}

              <button className="btn btn-primary" type="submit" disabled={saving}>
                {editingId ? 'Update' : `Add New ${config.singular}`}
              </button>
              {editingId && (
                <button className="btn btn-plain" type="button" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}

        <table className="list">
          <thead>
            <tr>
              {config.columns.map((key) => (
                <th key={key}>{COLUMN_LABEL[key] ?? key}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={config.columns.length} className="muted">
                  Loading…
                </td>
              </tr>
            )}

            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={config.columns.length} className="muted">
                  Nothing here yet.
                </td>
              </tr>
            )}

            {items.map((item) => (
              <tr key={item.id}>
                {config.columns.map((key, index) => (
                  <td key={key} className={index === 0 ? '' : 'muted'}>
                    {index === 0 ? (
                      <>
                        <a
                          className="row-title"
                          href="#edit"
                          onClick={(e) => {
                            e.preventDefault()
                            startEdit(item)
                          }}
                        >
                          {cell(item, key)}
                        </a>
                        {canWrite && (
                          <div className="row-actions">
                            <span>
                              <a
                                href="#edit"
                                onClick={(e) => {
                                  e.preventDefault()
                                  startEdit(item)
                                }}
                              >
                                Edit
                              </a>
                            </span>
                            {can(`${config.permission}.delete`) && (
                              <span>
                                <a
                                  className="del"
                                  href="#delete"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    remove(item)
                                  }}
                                >
                                  Delete
                                </a>
                              </span>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      cell(item, key)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
