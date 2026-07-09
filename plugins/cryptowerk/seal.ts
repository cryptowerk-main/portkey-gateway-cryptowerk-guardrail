import {
  HookEventType,
  PluginContext,
  PluginHandler,
  PluginParameters,
  //HandlerOptions
} from '../types';
import { APIAccess } from './impl';

//console.log('CW PluginHandler initialized.');

export const handler: PluginHandler = async (
  context: PluginContext,
  parameters: PluginParameters,
  eventType: HookEventType
  // options: HandlerOptions // e.g. options.env for environment variables
) => {
  // - context.request for request data
  // - context.response for response data (in afterRequestHook)
  // - parameters for plugin-specific parameters
  // - eventType to determine which hook is being executed

  //console.log('CW PluginHandler called.');
  let errors = [];
  let logMsg = [];
  let data = null;

  try {
    let api;
    if (
      context.credentials &&
      context.credentials.apiKey &&
      context.credentials.apiCredential
    ) {
      api = new APIAccess(
        context.credentials.apiKey,
        context.credentials.apiCredential
      );
    } else if (
      parameters &&
      parameters.credentials &&
      parameters.credentials.apiKey &&
      parameters.credentials.apiCredential
    ) {
      api = new APIAccess(
        parameters.credentials.apiKey,
        parameters.credentials.apiCredential
      );
    } else {
      api = new APIAccess(
        // Those are fallback credentials for ease-of-use meant to get started quickly. They might be revoked if being abused.
        // This is committed to git intentionally.
        'SlR2+djTs+ydFNGiSs9oPAfV8RYJzkOqLgCD3HtZCsU=',
        '+9uJ4f2hzpDsXCT1/19KToX8vBGmFvOZRyySd0fxbZs='
      );
      logMsg.push(
        'Warning: Please provide your own API key and/or credential (e.g. from before/afterRequestHooks/checks/parameters). For now using fallback credentials that may expire any time.'
      );
      //throw new Error(...)
    }

    let docToSealJson = {
      eventType: eventType,
      request: context.request.json,
      response:
        context.response && context.response.json
          ? context.response.json
          : null,
    };
    let docToSealText = JSON.stringify(docToSealJson);
    let docToSealBin = Buffer.from(docToSealText);
    let docToSeal64 = docToSealBin.toString('base64');
    let response = await api.register(docToSealBin);
    if (!('apiResult' in response))
      errors.push(
        'Missing API result. Possibly the connection to the API server failed.'
      );
    else if (!('documents' in response.apiResult))
      errors.push('Missing documents in API result.');
    else {
      let retrievalId = response.apiResult.documents[0].retrievalId;
      let docHash = response.docHash;
      logMsg.push(
        //'Sealed text=' + docToSealText /*+" base64="+docToSeal64*/ +
        'Proof created: docHash=' +
          docHash +
          ' retrievalId=' +
          retrievalId +
          ' verifiable at https://developers.cryptowerk.com/platform/permalink/sealapiverify?retrievalId=' +
          retrievalId
      );
      data = {
        // any additional data you want to return
        sealedData: docToSealText,
        sealedDataBase64: docToSeal64,
        docHash: docHash,
        retrievalId: retrievalId,
      };
    }
  } catch (e: any) {
    let msg;
    if (e instanceof Error) msg = e.message;
    else msg = e.toString();
    errors.push(msg);
  }
  const error = errors.length > 0 ? new Error(errors.join(' ')) : null;
  return {
    error: error, // or error object if an error occurred
    verdict: errors.length == 0, // indicate if the guardrail passed or failed
    data: data,
    log: logMsg.join(' '),
  };
};
