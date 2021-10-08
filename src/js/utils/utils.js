import UAParser from 'ua-parser-js';

/**
 * オブジェクトをMapに変換します
 * @param object
 * @returns {Map<any, any>}
 */
export default function objectToMap(object) {
  const map = new Map();
  // eslint-disable-next-line no-restricted-syntax
  for (const [key, value] of Object.entries(object)) {
    map.set(key, value);
  }
  return map;
}

export function moveTo(url) {
  window.location.href = url;
}

/**
 * iOSのSafariかどうかを判定します
 * @returns {boolean}
 */
export function isIOSSafari() {
  const ua = new UAParser();
  const hasStandalone = 'standalone' in window.navigator;
  return (
    (hasStandalone && ua.getBrowser().name === 'Safari' && ua.getOS().name === 'Mac OS') ||
    (ua.getBrowser().name === 'Mobile Safari' && ua.getOS().name === 'iOS')
  );
}

/**
 * MacのSafariかどうかを判定します
 * @return {boolean}
 */
export function isMacSafari() {
  const ua = new UAParser();
  const hasStandalone = 'standalone' in window.navigator;
  return !hasStandalone && ua.getBrowser().name === 'Safari' && ua.getOS().name === 'Mac OS';
}

/**
 * IOSかどうかを判定します
 * @return {boolean}
 */
export function isIOS() {
  const ua = new UAParser();
  const hasStandalone = 'standalone' in window.navigator;
  const os = ua.getOS().name;
  return hasStandalone && (os === 'iOS' || os === 'Mac OS');
}

/**
 * GoogleChromeかどうかを判定します
 * @return {boolean}
 */
export function isChrome() {
  const ua = new UAParser();
  return ua.getBrowser().name === 'Chrome';
}

/**
 * Edgeかどうかを判定します
 * @return {boolean}
 */
export function isEdge() {
  const ua = new UAParser();
  return ua.getBrowser().name === 'Edge';
}

/**
 * EdgeもしくはChromeかどうかを判定します
 * @returns {boolean}
 */
export function isChromeAndEdge() {
  const ua = new UAParser();
  return ua.getBrowser().name === 'Edge' || ua.getBrowser().name === 'Chrome';
}

/**
 * 選択中のデバイスを取得（存在しなければ取得できるデバイスから０番目を返す）
 * @param devices {{deviceId: string, label: string}[]}
 * @param configuredDeviceId {string|undefined}
 * @returns {*}
 */
export function getSelectedDeviceId(devices, configuredDeviceId) {
  if (!configuredDeviceId) {
    return devices[0]?.deviceId;
  }
  return devices.find((device) => device.deviceId === configuredDeviceId)?.deviceId ?? devices[0]?.deviceId;
}