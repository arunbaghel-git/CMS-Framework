import { describe, expect, it } from 'vitest'

import { toMasterListPayload } from './master-list-payload.js'

/** Add Ons ki asli field list — `MasterListScreen.jsx` se. */
const ADD_ON_FIELDS = [
  { key: 'name', type: 'text', required: true },
  { key: 'price', type: 'text' },
  { key: 'where', type: 'text' },
]

/** Hotels — yahan `destinationId` hai, jiske liye ye filter pehle likha gaya tha. */
const HOTEL_FIELDS = [
  { key: 'name', type: 'text', required: true },
  { key: 'destinationId', type: 'destination', required: true },
  { key: 'category', type: 'hotelCategory', required: true },
  { key: 'room', type: 'text' },
  { key: 'note', type: 'text' },
]

const VIDEO_REVIEW_FIELDS = [
  { key: 'imageId', type: 'media' },
  { key: 'videoUrl', type: 'url', required: true },
  { key: 'name', type: 'text', required: true },
  { key: 'packageName', type: 'text' },
]

describe('toMasterListPayload — edit', () => {
  /**
   * ⚠️ **Ye wo bug hai jiske liye ye file bani** (client, 21 Sep).
   *
   * Pehle khaali `where` payload se gir jaata tha: API 200 deti, admin "Add-on updated."
   * dikhata, aur DB me purani value baithi rehti. Koi error kahin nahi.
   */
  it('optional khaana khaali karke bheja ja sakta hai — "hata do" ka matlab bachna chahiye', () => {
    const payload = toMasterListPayload(
      { name: 'Scuba try-dive', price: '₹3,500 pp', where: '' },
      { fields: ADD_ON_FIELDS, editingId: 'a1' },
    )

    expect(payload).toEqual({ name: 'Scuba try-dive', price: '₹3,500 pp', where: '' })
  })

  it('dono optional khaali hon to dono jaate hain', () => {
    const payload = toMasterListPayload(
      { name: 'MAP or AP meal plan', price: '', where: '' },
      { fields: ADD_ON_FIELDS, editingId: 'a2' },
    )

    expect(payload).toEqual({ name: 'MAP or AP meal plan', price: '', where: '' })
  })

  /**
   * ⚠️ Yahi wo wajah hai jiske liye filter pehle likha gaya tha — khaali `destinationId`
   * server pe "ye destination dhoondho" ban jaata hai aur 422 deta hai.
   */
  it('required khaana khaali ho to ab bhi nahi jaata — 422 se bachav', () => {
    const payload = toMasterListPayload(
      { name: 'Sea View', destinationId: '', category: '', room: '', note: 'x' },
      { fields: HOTEL_FIELDS, editingId: 'h1' },
    )

    expect(payload).toEqual({ name: 'Sea View', room: '', note: 'x' })
  })

  it('media khaali ho to edit pe jaata hai — warna purani image chipki rehti', () => {
    const payload = toMasterListPayload(
      { imageId: null, videoUrl: 'https://youtu.be/x', name: 'Sneha', packageName: '' },
      { fields: VIDEO_REVIEW_FIELDS, editingId: 'v1' },
    )

    expect(payload).toEqual({
      imageId: null,
      videoUrl: 'https://youtu.be/x',
      name: 'Sneha',
      packageName: '',
    })
  })
})

describe('toMasterListPayload — create', () => {
  /**
   * ⚠️ Create pe khaali **nahi** jaata, aur wo jaan-boojh kar hai: nayi row pe "hata do" ki
   * koi baat hi nahi hoti. Schema ka apna default (`''`) wahi kaam kar deta hai.
   */
  it('khaali khaane create pe nahi jaate', () => {
    const payload = toMasterListPayload(
      { name: 'New add-on', price: '', where: '' },
      { fields: ADD_ON_FIELDS, editingId: null },
    )

    expect(payload).toEqual({ name: 'New add-on' })
  })

  it('khaali media create pe nahi jaata — null likhne ki koi wajah nahi', () => {
    const payload = toMasterListPayload(
      { imageId: null, videoUrl: 'https://youtu.be/x', name: 'Sneha' },
      { fields: VIDEO_REVIEW_FIELDS, editingId: null },
    )

    expect(payload).toEqual({ videoUrl: 'https://youtu.be/x', name: 'Sneha' })
  })
})
