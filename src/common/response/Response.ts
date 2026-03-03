export enum RESPONSE_STATUS {
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS',
}

export class Response<T = Record<string, any>> {
  private data: T;
  private message: string;
  private status: RESPONSE_STATUS;

  constructor() {
    this.setStatus(RESPONSE_STATUS.ERROR);
    this.setMessage('');
  }

  setStatus(code: RESPONSE_STATUS) {
    this.status = code;
  }

  getStatus(): string {
    return this.status;
  }

  setMessage(message: string) {
    this.message = message;
  }

  getMessage(): string {
    return this.message;
  }

  setData(data: T) {
    this.data = data;
  }

  getData(): T {
    return this.data;
  }

  getResponse(): IResponse<T> {
    return {
      status: this.getStatus(),
      message: this.getMessage(),
      data: this.getData(),
    };
  }
}

export interface IResponse<T = Record<string, any>> {
  status: string;
  message: string;
  data: T;
}
