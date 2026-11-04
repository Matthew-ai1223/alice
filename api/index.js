import expressApp from '../server/dist/server.js';

const app = expressApp?.default ?? expressApp;

export default function handler(req, res) {
  return app(req, res);
}
