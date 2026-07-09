import crypto from 'crypto';

interface APIResponse {
  minSupportedAPIVersion: number;
  maxSupportedAPIVersion: number;
}

interface RegisterResponse extends APIResponse {
  documents: RegisterResponseDocument[];
}
interface RegisterResponseDocument {
  retrievalId: string;
}

interface GetSealResponse extends APIResponse {
  documents: GetSealResponseDocument[];
}
interface GetSealResponseDocument {
  retrievalId: string;
  seal: Seal;
  submittedAt: number;
  hasBeenInsertedIntoAtLeastOneBlockchain: boolean;
  blockchainRegistrations: BlockchainRegistration[];
  hasBeenInsertedIntoAllRequestedBlockchains: boolean;
}
interface Seal {}
interface BlockchainRegistration {}

export class APIAccess {
  apiKey: string;
  apiCredential: string;

  constructor(apiKey: string, apiCredential: string) {
    this.apiKey = apiKey;
    this.apiCredential = apiCredential;
  }

  private async apiRequest(
    callName: string,
    reqParams: object
  ): Promise<APIResponse> {
    const postData: string = JSON.stringify(reqParams);
    return new Promise((resolve, reject) => {
      const apiUrl =
        'https://developers.cryptowerk.com/platform/API/v8/' + callName;
      fetch(apiUrl, {
        method: 'POST',
        headers: {
          'X-ApiKey': this.apiKey + ' ' + this.apiCredential,
          'Content-Type': 'application/json', //"application/x-www-form-urlencoded"
          'Content-Length': Buffer.byteLength(postData),
        },
        body: postData,
      })
        .then((response: Response) => {
          if (response.ok && response.status == 200) {
            response
              .json()
              .then((json) => {
                resolve(json);
              })
              .catch((e) => {
                reject('Cannot parse JSON response: ' + e.toString());
              });
          } else {
            let msg = 'Error: status=' + response.status;
            if (response.statusText) msg += ' ' + response.statusText;
            response
              .json()
              .then((json) => {
                if (json.error) msg += ", server says '" + json.error + "'";
                reject(msg);
              })
              .catch((e) => {
                msg += ' ' + e.toString();
                reject(msg);
              });
          }
        })
        .catch((e) => {
          reject(e.toString());
        });
    });
  }

  async register(
    doc: Buffer
  ): Promise<{ docHash: string; apiResult: RegisterResponse }> {
    const docHash: string = crypto
      .createHash('sha256')
      .update(doc)
      .digest('hex');
    return this.apiRequest('register', {
      hashes: docHash,
      publiclyRetrievable: true,
    }).then((apiResult: APIResponse) => {
      return { docHash: docHash, apiResult: apiResult as RegisterResponse };
    });
  }

  async getSeal(retrievalId: string): Promise<GetSealResponse> {
    return this.apiRequest('getseal', {
      retrievalId: retrievalId,
    }) as Promise<GetSealResponse>;
  }
}
