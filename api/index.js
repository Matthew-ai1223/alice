import app from '../server/dist/server.js';

export default function handler(req, res) {
  return app(req, res);
}
