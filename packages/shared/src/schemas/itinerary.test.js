import { describe, expect, it } from 'vitest'

import { hasBreakfast, itineraryDaySchema, nightsByStay, routeStrip } from './itinerary.js'

/**
 * Route strip — spec 007 §3.1 ki sabse zaroori derived cheez.
 *
 * Ye tests isliye alag aur pure hain ki inka **koi DB nahi**. Client iske liye kuch bharta
 * hi nahi; agar ye galat hua to public page pe trip ka kram hi galat chhap jaata hai, aur
 * wo galti data me kahin nahi dikhti.
 */

const day = (overnightStayId) => ({ title: 'x', overnightStayId })

describe('routeStrip', () => {
  it('lagatar same stay wale din ek card me judte hain', () => {
    const strip = routeStrip([day('pb'), day('hv'), day('hv'), day('neil')])

    expect(strip).toEqual([
      { stayId: 'pb', from: 1, to: 1, nights: 1 },
      { stayId: 'hv', from: 2, to: 3, nights: 2 },
      { stayId: 'neil', from: 4, to: 4, nights: 1 },
    ])
  })

  it('wahi stay dobara aaye par beech me koi aur ho to DO card bante hain', () => {
    // Port Blair raat 1 aur raat 5 dono pe hai. Unhe ek card me jodne ka matlab hota ki
    // trip ka asli kram hi gayab ho jaaye
    const strip = routeStrip([day('pb'), day('hv'), day('hv'), day('neil'), day('pb')])

    expect(strip).toHaveLength(4)
    expect(strip[0]).toEqual({ stayId: 'pb', from: 1, to: 1, nights: 1 })
    expect(strip[3]).toEqual({ stayId: 'pb', from: 5, to: 5, nights: 1 })
  })

  it('departure day (bina stay ke) strip me nahi aata', () => {
    const strip = routeStrip([day('pb'), day('hv'), day(null)])

    expect(strip).toHaveLength(2)
    expect(strip.at(-1).to).toBe(2)
  })

  it('bina-stay wala din raat ki ginti nahi badhata — aur run nahi todta', () => {
    // Ye kinara likhte waqt ulta socha gaya tha. Sach ye hai: strip **raatein** ginti hai,
    // din nahi. Jis din koi overnight stay hi nahi hai wo raat banata hi nahi — to raat 1
    // aur raat 2 lagatar hain, aur "NIGHTS 1-2 Port Blair" hi sahi jawab hai.
    //
    // (Beech me bina stay wala din waise bhi degenerate data hai — asli itinerary me wo
    // sirf aakhri departure day pe hota hai.)
    const strip = routeStrip([day('pb'), day(null), day('pb')])

    expect(strip).toEqual([{ stayId: 'pb', from: 1, to: 2, nights: 2 }])
  })

  it('chaar lagatar raatein ek hi card banti hain', () => {
    const strip = routeStrip([day('hv'), day('hv'), day('hv'), day('hv')])

    expect(strip).toEqual([{ stayId: 'hv', from: 1, to: 4, nights: 4 }])
  })

  it('khaali itinerary pe khaali strip', () => {
    expect(routeStrip([])).toEqual([])
    expect(routeStrip()).toEqual([])
  })
})

describe('nightsByStay', () => {
  it('bikhri hui raatein bhi ek hi jagah pe jud jaati hain', () => {
    // Route strip se ULTA — hotel table ek hotel ki EK row dikhata hai, uska kram nahi.
    // Port Blair ki dono raatein yahan 2 banti hain
    const nights = nightsByStay([day('pb'), day('hv'), day('hv'), day('neil'), day('pb')])

    expect(nights).toEqual({ pb: 2, hv: 2, neil: 1 })
  })

  it('bina stay wale din nahi ginte', () => {
    expect(nightsByStay([day('pb'), day(null)])).toEqual({ pb: 1 })
  })
})

describe('itineraryDaySchema', () => {
  it('defaults bharta hai — sirf title zaroori hai', () => {
    const parsed = itineraryDaySchema.parse({ title: 'Arrive Kochi' })

    expect(parsed.overnightStayId).toBeNull()
    expect(parsed.meals).toEqual([])
    expect(parsed.description).toBe('')

    // `highlights` aur `hotelCategory` dono D-64 me hate — bheje jaayein to bhi nahi bachte
    expect(parsed.highlights).toBeUndefined()
    expect(parsed.hotelCategory).toBeUndefined()

    // `note` D-104 me hata — bheja jaaye to bhi nahi bachta
    expect(itineraryDaySchema.parse({ title: 'x', note: 'Approx. 4 hrs' }).note).toBeUndefined()
  })

  /**
   * D-104 — pehle yahan enum ka test tha ("sirf teen known values chalti hain"). Client ne 21
   * Sep ko wo hadd hi hata di: `Evening tea` jaise meal bhi hote hain aur wo importer me
   * chup-chaap gir jaate the (A-38).
   */
  it('meals free text hain — jo likha hai wahi bachta hai', () => {
    expect(
      itineraryDaySchema.parse({ title: 'x', meals: ['Breakfast', 'Evening tea'] }).meals,
    ).toEqual(['Breakfast', 'Evening tea'])
  })

  it('meals trim hote hain aur khaali item nahi chalta', () => {
    expect(itineraryDaySchema.parse({ title: 'x', meals: ['  Breakfast  '] }).meals).toEqual([
      'Breakfast',
    ])
    expect(() => itineraryDaySchema.parse({ title: 'x', meals: ['   '] })).toThrow()
  })

  it('hasBreakfast shabd dekh kar tay karti hai, poora milaan nahi', () => {
    expect(hasBreakfast(['Breakfast (buffet)'])).toBe(true)
    expect(hasBreakfast(['  breakfast at hotel'])).toBe(true)
    expect(hasBreakfast(['Lunch', 'Evening tea'])).toBe(false)
    expect(hasBreakfast([])).toBe(false)
    expect(hasBreakfast(undefined)).toBe(false)
  })

  it('hotelCategory ab hai hi nahi — bheji jaaye to bhi gir jaati hai (D-64)', () => {
    // Client ne D-51 me maangi thi, live dekhne ke baad hata di: pricing package-level pe
    // hai aur hotels ki table usi se banti hai, to din pe ek aur category ka jawab page pe
    // kahin dikhta hi nahi tha
    const parsed = itineraryDaySchema.parse({ title: 'x', hotelCategory: 'luxury' })

    expect(parsed.hotelCategory).toBeUndefined()
  })

  it('transferNote free text hai — 90 min, 2 hrs, overnight sab chalte hain', () => {
    for (const note of ['90 min', '2 hrs', 'overnight']) {
      expect(itineraryDaySchema.parse({ title: 'x', transferNote: note }).transferNote).toBe(note)
    }
  })
})
