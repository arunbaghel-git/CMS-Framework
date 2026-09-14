/**
 * Stat rail — hero pe chadhi hui chaar cards, reference ka `.vrail` (Tour aur Page dono).
 *
 * Khaali `value` wale cards server pe hi gir chuke hote hain (D-30), isliye yahan sirf ginti
 * dekhi jaati hai.
 *
 * ⚠️ 14 Sep ko `TourPage.jsx` se bahar aaya (D-95) — page pe bhi yahi rail hai.
 */
export default function StatRail({ stats = [] }) {
  if (!stats.length) return null

  return (
    <div className="wrap vrail">
      <div className="vrail__in">
        {stats.map((stat, i) => (
          <div className={`vrail__c${stat.highlight ? ' vrail__c--p' : ''}`} key={stat.id ?? i}>
            <b>
              {stat.value}
              {stat.suffix ? <i>{stat.suffix}</i> : null}
            </b>
            {stat.label ? <span>{stat.label}</span> : null}
          </div>
        ))}
      </div>
    </div>
  )
}
