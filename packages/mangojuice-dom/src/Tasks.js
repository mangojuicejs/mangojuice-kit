import { utils } from 'mangojuice-core';


// Utils
const isWindowDefined =
  typeof document !== "undefined" && document.querySelectorAll;

const querySelector = selector =>
  document.querySelectorAll(selector);

export function findDomNodes(selector, attempts = 10, wait = 50) {
  if (!isWindowDefined) {
    return [];
  }
  const newAttempt = attempts - 1;
  if (newAttempt >= 0) {
    const elems = querySelector(selector);
    if (!elems.length) {
      return utils.delay(wait).then(() => {
        return findDomNodes(selector, newAttempt, wait);
      });
    } else {
      return Promise.resolve(elems);
    }
  }
  return Promise.resolve([]);
}

/**
 * Task for focusing some element by selector (first found) if
 * the found element focusable. Can be used in a MJS task directly
 * or as a sabtask.
 * @param  {selector} args
 * @return {Promise}
 */
export function focus(selector) {
  return findDomNodes(selector).then((result) => {
    result && result[0] && result[0].focus && result[0].focus();
  });
}

/**
 * Task for bluring some element by selector (first found) if
 * the found element blurable. Can be used in a MJS task directly
 * or as a sabtask.
 * @param  {selector} args
 * @return {Promise}
 */
export function blur(selector) {
  return findDomNodes(selector).then((result) => {
    result && result[0] && result[0].blur && result[0].blur();
  });
}
