// eslint-disable-next-line import/prefer-default-export
export class AgoraError extends Error {
    constructor(message, error) {
      super(message);
      this.error = error;
    }
  }
  