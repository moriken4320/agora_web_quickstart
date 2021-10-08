import { isIOSSafari } from '../utils/utils';
import { AgoraError } from './error';

export const MIC_KEY = 'mic';
export const VIDEO1_KEY = 'video1';
export const VIDEO2_KEY = 'video2';
export const MIC_INDEX_KEY = 'micindex';
export const VIDEO1_INDEX_KEY = 'video1index';
export const VIDEO2_INDEX_KEY = 'video2index';
export const VOLUME_KEY = 'volume';
export const SPEAKER_KEY = 'speaker';
const changedVideo1Listeners = [];
export const DeviceManager = {
  getConfiguredMicDeviceId() {
    return localStorage.getItem(MIC_KEY);
  },
  getConfiguredMicIndex() {
    return localStorage.getItem(MIC_INDEX_KEY);
  },
  getConfiguredVideo1DeviceId() {
    return localStorage.getItem(VIDEO1_KEY);
  },
  getConfiguredVideo1Index() {
    return localStorage.getItem(VIDEO1_INDEX_KEY);
  },
  getConfiguredVideo2DeviceId() {
    if (isIOSSafari()) {
      return '未選択';
    }

    return localStorage.getItem(VIDEO2_KEY) || '未選択';
  },
  getConfiguredVideo2Index() {
    return isIOSSafari() ? 0 : localStorage.getItem(VIDEO2_INDEX_KEY);
  },
  getConfiguredVolume() {
    return Number(localStorage.getItem(VOLUME_KEY) ?? 0.5);
  },
  getConfiguredSpeakerDeviceId() {
    return localStorage.getItem(SPEAKER_KEY);
  },
  saveMicSetting(deviceId, index) {
    localStorage.setItem(MIC_KEY, deviceId);
    localStorage.setItem(MIC_INDEX_KEY, index);
  },
  saveVideo1Setting(deviceId, index) {
    localStorage.setItem(VIDEO1_KEY, deviceId);
    localStorage.setItem(VIDEO1_INDEX_KEY, index);
    // eslint-disable-next-line no-restricted-syntax
    for (const listener of changedVideo1Listeners) {
      listener(deviceId);
    }
  },
  saveVideo2Setting(deviceId, index) {
    localStorage.setItem(VIDEO2_KEY, deviceId);
    localStorage.setItem(VIDEO2_INDEX_KEY, index);
  },
  /**
   * @param volume {number}
   */
  saveVolumeSetting(volume) {
    localStorage.setItem(VOLUME_KEY, volume.toString());
  },
  /**
   * @param deviceId {string}
   */
  saveSpeakerSetting(deviceId) {
    return localStorage.setItem(SPEAKER_KEY, deviceId);
  },

  addChangedVideo1Listener(callback) {
    changedVideo1Listeners.push(callback);
  },
  /**
   * 使用権限があるかをチェックします。
   * @param type {'mic'|'camera'}
   */
  async checkDevicePermissionAsync(type) {
    switch (type) {
      case 'camera':
        await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
        return;
      case 'mic':
        await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        return;
      default:
        throw new AgoraError('引数が間違えています');
    }
  },

  /**
   * @param type {'mic'|'camera'}
   * @param deviceId {string}
   * @returns {Promise<MediaStream>}
   */
  async getDeviceByIdAsync(type, deviceId) {
    switch (type) {
      case 'camera':
        return await navigator.mediaDevices.getUserMedia({ audio: false, video: { deviceId } });
      case 'mic':
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId }, video: false });
        await stream.getAudioTracks()[0]?.applyConstraints({
          echoCancellation: true,
          noiseSuppression: true,
        });
        return stream;
      default:
        throw new AgoraError('引数が間違えています');
    }
  },
};