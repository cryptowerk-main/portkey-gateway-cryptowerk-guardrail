import crypto from 'crypto';

//const http=require("http");
import * as https from 'node:https';

/*
export type JSON_t =
    | string | number | boolean | null
    | JSON_t[]
    | { [k: string]: JSON_t };
*/

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
    const apiServer = 'developers.cryptowerk.com'; // 'localhost'
    const apiPort = 443; // 8443
    const postData: string = JSON.stringify(reqParams);
    const options = {
      hostname: apiServer,
      port: apiPort,
      path: '/platform/API/v8/' + callName,
      method: 'POST',
      headers: {
        'X-ApiKey': this.apiKey + ' ' + this.apiCredential,
        'Content-Type': 'application/json', //"application/x-www-form-urlencoded"
        'Content-Length': Buffer.byteLength(postData),
      },
    };
    return new Promise((resolve, reject) => {
      const req = https.request(options, (resp) => {
        let responseData = '';
        resp.on('data', (chunk) => {
          responseData += chunk;
        });
        resp.on('end', () => {
          let result = JSON.parse(responseData);
          //console.log(result);
          if (result.error)
            reject(
              'API request rejected by server ' +
                apiServer +
                ' : ' +
                result.error
            );
          else resolve(result);
        });
      });

      req.on('error', (err) => {
        let errMsg = 'Error: ' + err.message + ' stack: ' + err.stack;
        //console.log(errMsg);
        reject(errMsg);
      });

      req.write(postData);
      req.end();
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

/*
function test() {
  const doc:Buffer=Buffer.from("Hello, world.");
  register(doc);
}
//test();
*/
