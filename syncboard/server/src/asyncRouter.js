import { Router } from 'express';

/** Express 4 doesn't forward rejected promises to error middleware; this router does. */
export function asyncRouter() {
  const router = Router();
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    const original = router[method].bind(router);
    router[method] = (path, ...handlers) =>
      original(
        path,
        ...handlers.map((fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next))
      );
  }
  return router;
}
