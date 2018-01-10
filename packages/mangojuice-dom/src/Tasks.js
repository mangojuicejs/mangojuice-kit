import { delay, utils } from 'mangojuice-core';


// Utils
const isWindowDefined =
  typeof document !== "undefined" && document.querySelectorAll;

const querySelector = selector =>
  document.querySelectorAll(selector);

const returnResult = (res) => res.result;

function internalFindDomNodes(selector, attempts = 10, wait = 50) {
  if (!isWindowDefined) {
    return [];
  }
  const newAttempt = attempts - 1;
  if (newAttempt >= 0) {
    const elems = querySelector(selector);
    if (!elems.length) {
      return this.call(delay, wait).then(() => {
        return this.call(internalFindDomNodes, selector, newAttempt, wait);
      }).then(returnResult);
    } else {
      return elems;
    }
  }
  return [];
}


/**
 * Task for finding a DOM node with multiple attempts and delay
 * between attempts. Returns null if can't find the node.
 * @param  {string} selector
 * @param  {number} attempts
 * @param  {number} wait
 * @return {Promise}
 */
export function findDomNodes(...args) {
  const realArgs = utils.is.string(args[0]) ? args : args.slice(1);
  return this.call(internalFindDomNodes, ...realArgs).then(returnResult);
}

/**
 * Task for focusing some element by selector (first found) if
 * the found element focusable. Can be used in a MJS task directly
 * or as a sabtask.
 * @param  {selector} args
 * @return {Promise}
 */
export function focus(...args) {
  const selector = utils.is.string(args[0]) ? args[0] : args[1];
  return this.call(findDomNodes, selector).then(({ result }) => {
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
export function blur(...args) {
  const selector = utils.is.string(args[0]) ? args[0] : args[1];
  return this.call(findDomNodes, selector).then(({ result }) => {
    result && result[0] && result[0].blur && result[0].blur();
  });
}
