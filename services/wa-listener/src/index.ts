import { createClient, attachListeners } from './session';

const client = createClient();
attachListeners(client);
client.initialize();
