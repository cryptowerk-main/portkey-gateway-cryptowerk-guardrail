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
  let error = null;
  let logMsg = '';
  let data = null;

  let api;
  if (
    context.credentials &&
    context.credentials.apiKey &&
    context.credentials.apiCredential
  )
    api = new APIAccess(
      context.credentials.apiKey,
      context.credentials.apiCredential
    );
  else if (
    parameters &&
    parameters.credentials &&
    parameters.credentials.apiKey &&
    parameters.credentials.apiCredential
  )
    api = new APIAccess(
      parameters.credentials.apiKey,
      parameters.credentials.apiCredential
    );
  else
    throw new Error(
      'Missing API key and/or credential (e.g. from before/afterRequestHooks/checks/parameters).'
    );

  let docToSealJson = {
    eventType: eventType,
    request: context.request.json,
    response:
      context.response && context.response.json ? context.response.json : null,
  };
  let docToSealText = JSON.stringify(docToSealJson);
  let docToSealBin = Buffer.from(docToSealText);
  let docToSeal64 = docToSealBin.toString('base64');
  let response = await api.register(docToSealBin);
  if (!('apiResult' in response))
    error =
      'Missing API result. Possibly the connection to the API server failed.';
  else if (!('documents' in response.apiResult))
    error = 'Missing documents in API result.';
  else {
    let retrievalId = response.apiResult.documents[0].retrievalId;
    let docHash = response.docHash;
    logMsg +=
      'Sealed text=' +
      docToSealText /*+" base64="+docToSeal64*/ +
      ' docHash=' +
      docHash +
      ' retrievalId=' +
      retrievalId;
    data = {
      // any additional data you want to return
      sealedData: docToSealText,
      sealedDataBase64: docToSeal64,
      docHash: docHash,
      retrievalId: retrievalId,
    };
  }
  return {
    error: error, // or error object if an error occurred
    verdict: true, // or false to indicate if the guardrail passed or failed
    data: data,
    log: logMsg,
  };
};
