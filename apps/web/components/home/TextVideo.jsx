import Icon from '../Icon.jsx'
import Img from '../Img.jsx'
import VideoBox from './VideoBox.jsx'

/**
 * `Text with video` — `home-nav-v3.html` ka `20. ABOUT US + OUR STORY VIDEO` (client, 15 Sep, D-96 §22).
 *
 * ```
 * .hsec.hsec--tint     background (default reference ka halka neela)
 *   .txv               do column (1.05 : 0.95); `.txv--left` pe image baayein. 1024px se neeche ek column
 *     .txv__c          heading · text · points · button
 *     .txv__m          image box — video ho to ▶ aur popup (`VideoBox`)
 * ```
 *
 * Image aur video dono na hon to media ka column hi nahi banta — text poori chaudai le leta hai (D-30).
 */
export default function TextVideo({ props = {}, data = {} }) {
  const {
    background,
    heading,
    text,
    items = [],
    buttonLabel,
    buttonUrl,
    imageSide = 'right',
    videoUrl,
    videoTitle,
    videoText,
  } = props
  const { image = null, embedUrl = null } = data

  const hasMedia = Boolean(image || videoUrl)
  if (!heading && !text && !items.length && !hasMedia) return null

  const cls = ['txv', hasMedia ? '' : 'txv--solo', imageSide === 'left' ? 'txv--left' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <section
      className="hsec hsec--tint"
      style={background ? { '--hsec-bg': background } : undefined}
    >
      <div className={`wrap ${cls}`}>
        <div className="txv__c">
          {heading ? <h2>{heading}</h2> : null}
          {/* Editor ki HTML, write pe saaf (R20). Naap div pe — `<p>` ho ya na ho (A-19). */}
          {text ? <div className="txv__t" dangerouslySetInnerHTML={{ __html: text }} /> : null}

          {items.length > 0 && (
            <ul className="txv__pts">
              {items.map((point, i) => (
                <li className="txv__pt" key={point.id ?? i}>
                  {/* Upload wali image icon ke upar jeet-ti hai — Info cards jaisa. */}
                  {point.image ? (
                    <Img className="txv__i txv__i--img" image={point.image} alt="" sizes="22px" />
                  ) : (
                    <Icon className="txv__i" name={point.icon} size={19} strokeWidth={2.2} />
                  )}
                  <div>
                    {point.title ? <b>{point.title}</b> : null}
                    {point.text ? <p dangerouslySetInnerHTML={{ __html: point.text }} /> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {buttonLabel && buttonUrl ? (
            <a className="btn btn--primary txv__btn" href={buttonUrl}>
              {buttonLabel}
            </a>
          ) : null}
        </div>

        {hasMedia ? (
          <div className="txv__m">
            <VideoBox
              image={image}
              videoUrl={videoUrl}
              embedUrl={embedUrl}
              title={videoTitle}
              text={videoText}
            />
          </div>
        ) : null}
      </div>
    </section>
  )
}
