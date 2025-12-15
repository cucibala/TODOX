// A utility to get the pixel coordinates of a textarea's caret.

const properties = [
  'direction',
  'boxSizing',
  'width',
  'height',
  'overflowX',
  'overflowY',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderStyle',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'fontSizeAdjust',
  'lineHeight',
  'fontFamily',
  'textAlign',
  'textTransform',
  'textIndent',
  'textDecoration',
  'letterSpacing',
  'wordSpacing',
  'tabSize',
  'MozTabSize'
];

let isBrowser = typeof window !== 'undefined'
let isMac = isBrowser && /Mac|iPod|iPhone|iPad/.test(window.navigator.platform)

function getCaretCoordinates(element, position) {
  if (!isBrowser) {
    throw new Error('getCaretCoordinates should only be called in a browser')
  }

  const div = document.createElement('div')
  div.id = 'input-textarea-caret-position-mirror-div'
  document.body.appendChild(div)

  const style = div.style
  const computed = window.getComputedStyle ? window.getComputedStyle(element) : element.currentStyle
  const isInput = element.nodeName === 'INPUT'

  style.whiteSpace = 'pre-wrap'
  if (!isInput) {
    style.wordWrap = 'break-word'
  }

  style.position = 'absolute'
  style.visibility = 'hidden'

  properties.forEach(function (prop) {
    if (isInput && prop === 'lineHeight') {
      if (computed. बॉक्सSizing === 'border-box') {
        let height = parseInt(computed.height)
        let top = parseInt(computed.paddingTop)
        let bottom = parseInt(computed.paddingBottom)
        let borderTop = parseInt(computed.borderTopWidth)
        let borderBottom = parseInt(computed.borderBottomWidth)
        style.lineHeight = (height - top - bottom - borderTop - borderBottom) + 'px'
      } else {
        style.lineHeight = computed.height
      }
    } else {
      style[prop] = computed[prop]
    }
  })

  if (isMac) {
    style.paddingLeft = parseInt(style.paddingLeft) + 2 + 'px'
  }

  div.textContent = element.value.substring(0, position)

  const span = document.createElement('span')
  span.textContent = element.value.substring(position) || '.'
  div.appendChild(span)

  const coordinates = {
    top: span.offsetTop + parseInt(computed['borderTopWidth']),
    left: span.offsetLeft + parseInt(computed['borderLeftWidth']),
    height: parseInt(computed['lineHeight'])
  }

  document.body.removeChild(div)

  return coordinates
}

export { getCaretCoordinates }
